import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { storageService } from '../storageService';

export interface ExtractedGarmentResult {
  garmentPath: string; // Relative path e.g. /uploads/extracted_garment_123.jpg
  category: 'saree' | 'dress' | 'shirt' | 'suit' | 'top' | 'outfit' | 't-shirt' | 'pants' | 'trousers' | 'jeans';
  description: string;
  recommendedPrompt: string;
  bbox?: { ymin: number; xmin: number; ymax: number; xmax: number };
}

/**
 * GarmentExtractionService
 * =======================
 * Automatically detects and extracts the physically held saree/dress/shirt/garment
 * from a captured camera frame, strictly excluding hands, fingers, and skin.
 */
export class GarmentExtractionService {
  private apiKey: string;

  constructor() {
    this.apiKey = config.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  }

  /**
   * Extract held garment and produce tailored virtual try-on instructions.
   */
  async extractGarmentInfo(capturedImagePath: string): Promise<ExtractedGarmentResult> {
    logger.info(`[EXTRACTION] Extracting held garment from photo: ${capturedImagePath}`);

    if (!fs.existsSync(capturedImagePath)) {
      throw new Error(`Captured image file not found: ${capturedImagePath}`);
    }

    const imageBuffer = fs.readFileSync(capturedImagePath);
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1440;

    // Face-Safe Default Bounding Box (strictly below chin/neck, on torso)
    let detectedBbox: { ymin: number; xmin: number; ymax: number; xmax: number } = {
      ymin: 520,
      xmin: 220,
      ymax: 960,
      xmax: 780,
    };

    let cropRegion = {
      left: Math.floor(width * 0.35),
      top: Math.floor(height * 0.55),
      width: Math.floor(width * 0.25),
      height: Math.floor(height * 0.25),
    };

    let category: 'saree' | 'dress' | 'shirt' | 'suit' | 'top' | 'outfit' | 't-shirt' | 'pants' | 'trousers' | 'jeans' = 'shirt';
    let description = 'tailored garment with authentic pattern';

    // Attempt intelligent AI detection with gemini-3.6-flash
    if (this.apiKey) {
      try {
        const base64Data = imageBuffer.toString('base64');
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${this.apiKey}`;

        const promptText = `Accurately identify the garment being held or displayed by the person in this photo (for men or women):
- Collared button-up shirts, casual/formal shirts -> "shirt"
- Crewneck, v-neck, or graphic t-shirts -> "t-shirt"
- Jeans, trousers, chinos, slacks -> "pants"
- Sarees with border/pallu/drape -> "saree"
- Dresses, gowns, frocks, kurtis, anarkalis -> "dress"
- Suits, blazers, tuxedos -> "suit"

Return ONLY a valid JSON object:
{
  "category": "saree" | "dress" | "shirt" | "t-shirt" | "pants" | "trousers" | "jeans" | "suit" | "top",
  "description": "precise description of fabric, exact colors, pattern/prints/checks/borders, style",
  "bbox": { "ymin": number, "xmin": number, "ymax": number, "xmax": number }
}
bbox must be 0-1000 normalized coordinates for the held fabric and hands holding it. Return strictly raw JSON.`;

        const response = await axios.post(
          geminiUrl,
          {
            contents: [
              {
                parts: [
                  { text: promptText },
                  { inline_data: { mime_type: 'image/jpeg', data: base64Data } },
                ],
              },
            ],
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 12000,
          }
        );

        const textOutput = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOutput) {
          const cleanJson = textOutput.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleanJson);

          if (parsed.category) {
            category = parsed.category.toLowerCase();
          }
          if (parsed.description) {
            description = parsed.description;
          }

          if (parsed.bbox && typeof parsed.bbox.ymin === 'number') {
            // CRITICAL: Face-Safe Clamp. Never let bbox reach above 500 (chin, beard, mouth must remain 100% untouched)
            const safeYmin = Math.max(500, parsed.bbox.ymin);
            detectedBbox = {
              ymin: safeYmin,
              xmin: Math.max(0, parsed.bbox.xmin),
              ymax: Math.min(1000, Math.max(safeYmin + 150, parsed.bbox.ymax)),
              xmax: Math.min(1000, parsed.bbox.xmax),
            };

            const b = detectedBbox;
            const bTop = Math.floor((b.ymin / 1000) * height);
            const bLeft = Math.floor((b.xmin / 1000) * width);
            const bWidth = Math.floor(((b.xmax - b.xmin) / 1000) * width);
            const bHeight = Math.floor(((b.ymax - b.ymin) / 1000) * height);

            // Inset by 25% horizontally to strictly eliminate skin/fingers clutching fabric edge
            const insetX = Math.floor(bWidth * 0.25);
            const insetY = Math.floor(bHeight * 0.15);

            cropRegion = {
              left: Math.min(Math.max(0, bLeft + insetX), width - 80),
              top: Math.min(Math.max(0, bTop + insetY), height - 80),
              width: Math.max(60, bWidth - insetX * 2),
              height: Math.max(60, bHeight - insetY * 2),
            };

            logger.info(`[EXTRACTION] Detected garment: ${category} (${description}) at [${b.ymin}, ${b.xmin}, ${b.ymax}, ${b.xmax}]`);
          }
        }
      } catch (geminiErr: any) {
        logger.warn(`[EXTRACTION] Gemini Vision fallback: ${geminiErr.message}`);
      }
    }

    // Inspect color from inner fabric region to refine color description
    try {
      const sample = await sharp(imageBuffer).extract(cropRegion).stats();
      const [r, g, b] = sample.channels.map((c) => Math.round(c.mean));

      let detectedColor = '';
      if (r > 160 && g > 130 && b > 140 && r > g && r > b) {
        detectedColor = 'pink';
      } else if (r > 130 && r > g * 1.2 && r > b * 1.2) {
        detectedColor = 'red/pink';
      } else if (b > r * 1.15 && b > g) {
        detectedColor = 'blue';
      } else if (g > r * 1.1 && g > b * 1.1) {
        detectedColor = 'green';
      } else if (r > 150 && g > 130 && b < 100) {
        detectedColor = 'golden yellow';
      }

      // If held in front of upper body/chest, it is a shirt, top, saree or dress
      if ((category === 'pants' || category === 'trousers' || category === 'jeans') && detectedBbox.ymin < 650) {
        const descLower = description.toLowerCase();
        if (descLower.includes('saree') || descLower.includes('sari') || descLower.includes('border') || descLower.includes('zari') || descLower.includes('pallu')) {
          category = 'saree';
          description = description.replace(/trousers?|pants?|jeans?/gi, 'saree');
        } else if (descLower.includes('dress') || descLower.includes('gown') || descLower.includes('kurti')) {
          category = 'dress';
          description = description.replace(/trousers?|pants?|jeans?/gi, 'dress');
        } else {
          category = 'shirt';
          description = description.replace(/trousers?|pants?|jeans?/gi, 'shirt');
        }
      }

      if (category === 'shirt') {
        description = description.replace(/trousers?|pants?|jeans?/gi, 'shirt');
      }

      if (detectedColor && !description.toLowerCase().includes(detectedColor.split('/')[0])) {
        description = `${detectedColor} ${description}`;
      }
    } catch {}

    // Extract the clean pure garment fabric image (zero hands, zero fingers)
    const croppedBuffer = await sharp(imageBuffer)
      .extract(cropRegion)
      .jpeg({ quality: 95 })
      .toBuffer();

    const filename = `extracted_garment_${Date.now()}.jpg`;
    const relativeUrl = await storageService.saveFile(croppedBuffer, filename, 'uploads');
    logger.info(`[EXTRACTION] Saved clean garment fabric image to: ${relativeUrl}`);

    // Build tailored prompt matching user requirements
    let recommendedPrompt = '';
    if (category === 'saree') {
      recommendedPrompt = `Full-length top-to-bottom fashion standee portrait of the exact same person standing gracefully in the room. She is wearing the reference ${description} realistically draped around her body from shoulders down to ankles with a matching blouse, neat waist pleats, and the pallu gracefully draped over the left shoulder across the torso. Full head to toe. Both arms resting naturally beside the hips with empty hands. Complete face and head fully visible and sharp. Authentic room background preserved.`;
    } else if (category === 'pants' || category === 'trousers' || category === 'jeans') {
      recommendedPrompt = `Full-length fashion portrait of the exact same person standing naturally in the room. Wearing the reference ${description} fitted on the lower body from the waistline and belt down along both legs to the shoes/ankles. Paired with a neat complementary neutral top. Both arms hanging straight down naturally with hands resting at hips. No hands holding cloth. Complete face, hair, and full body fully visible and sharp. Authentic room background preserved.`;
    } else if (category === 't-shirt') {
      recommendedPrompt = `Fashion mirror portrait of the exact same person standing naturally in the room wearing the reference ${description} fitted neatly over the torso, showing the collar/crewneck, sleeves, chest, and the entire t-shirt down to the bottom hem and waistline. Both arms relaxed and hanging naturally beside the body with empty hands at hips. No hands or folded cloth in front of chest. Complete face, hair, and head fully visible and sharp. Authentic room background preserved.`;
    } else if (category === 'dress') {
      recommendedPrompt = `Full-length fashion portrait of the exact same person standing gracefully in the room wearing the reference ${description} tailored elegantly from shoulders and bust down through the waist to the hemline. Both arms resting naturally beside the body with empty hands. Complete face and head fully visible and sharp. Authentic room background preserved.`;
    } else if (category === 'shirt' || category === 'top') {
      recommendedPrompt = `Fashion mirror portrait of the exact same person standing naturally in the room wearing the reference ${description} neatly tailored and buttoned up with sleeves, collar, and the entire shirt down to the bottom hem and waist. Both arms hanging straight down naturally beside the body with empty hands resting at the hips. No hands or folded cloth in front of chest. Complete face and head fully visible and sharp. Authentic room background preserved.`;
    } else {
      recommendedPrompt = `Fashion mirror portrait of the exact same person standing naturally in the room wearing the reference ${description} completely covering down to the hemline and waist. Both arms relaxed and hanging naturally beside the body with empty hands resting at the hips. Complete face and head fully visible and sharp. Authentic room background preserved.`;
    }

    return {
      garmentPath: relativeUrl,
      category,
      description,
      recommendedPrompt,
      bbox: detectedBbox,
    };
  }

  // Backwards compatibility method returning relative string path
  async extractGarment(capturedImagePath: string): Promise<string> {
    const info = await this.extractGarmentInfo(capturedImagePath);
    return info.garmentPath;
  }
}

export const garmentExtractionService = new GarmentExtractionService();
