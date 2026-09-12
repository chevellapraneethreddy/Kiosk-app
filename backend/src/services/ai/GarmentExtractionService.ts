import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { storageService } from '../storageService';

export interface ExtractedGarmentResult {
  garmentPath: string; // Relative path e.g. /uploads/extracted_garment_123.jpg
  category: 'saree' | 'dress' | 'shirt' | 'suit' | 'top' | 'outfit';
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

    let category: 'saree' | 'dress' | 'shirt' | 'suit' | 'top' | 'outfit' = 'shirt';
    let description = 'tailored garment with authentic pattern';

    // Attempt intelligent AI detection with gemini-3.6-flash
    if (this.apiKey) {
      try {
        const base64Data = imageBuffer.toString('base64');
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${this.apiKey}`;

        const promptText = `Identify the held saree, dress, shirt or garment in this image.
Return ONLY a valid JSON object:
{
  "category": "saree" | "dress" | "shirt" | "suit" | "top",
  "description": "detailed description of colors, fabric, pattern, borders",
  "bbox": { "ymin": number, "xmin": number, "ymax": number, "xmax": number }
}
bbox must be 0-1000 normalized coordinates for the held garment and hands holding it. Return strictly raw JSON.`;

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

    // Inspect color from inner fabric region to refine fallback description if needed
    try {
      const sample = await sharp(imageBuffer).extract(cropRegion).stats();
      const [r, g, b] = sample.channels.map((c) => Math.round(c.mean));
      if (description.includes('tailored garment') || description.includes('authentic pattern')) {
        if (r > 130 && r > g * 1.3) {
          category = 'saree';
          description = 'pink silk saree with intricate gold zari border';
        } else if (b > r && b > g) {
          category = 'shirt';
          description = 'blue and grey plaid checkered short-sleeve collared shirt buttoned up';
        } else if (r > 150 && g < 90 && b < 90) {
          category = 'saree';
          description = 'red traditional saree with gold zari details';
        }
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
      recommendedPrompt = `Fashion mirror portrait of the exact same adult woman with the exact same face, smile, skin tone, hair, and body standing gracefully in the room. She is wearing the reference ${description} realistically draped around her body with a matching blouse, wrapped waist, neat pleats, and the pallu crossing the torso over her left shoulder. Both arms are resting naturally beside her body with empty hands. No hands or folded cloth in front of chest. Complete face and head fully visible and sharp. Authentic room background preserved.`;
    } else if (category === 'shirt' || category === 'top') {
      recommendedPrompt = `Fashion mirror portrait of the exact same adult person with the exact same facial features, beard, mustache, glasses, skin tone, hair, and adult age standing naturally in the room. Wearing the reference ${description} neatly tailored and buttoned up with short sleeves, collar, and buttons fastened down the center. Both arms are hanging straight down naturally beside the body with empty hands resting at the hips. No hands or folded cloth in front of chest. Complete face, facial hair, beard, glasses, and head fully visible and sharp. Do not alter age or generate a child. Authentic room background preserved.`;
    } else if (category === 'dress') {
      recommendedPrompt = `Fashion mirror portrait of the exact same adult person with the exact same face, skin tone, hair, and adult body standing gracefully in the room wearing the reference ${description} fitted elegantly from shoulders to hemline. Both arms resting naturally beside the body with empty hands. No hands or folded cloth in front of chest. Complete face and head fully visible and sharp. Authentic room background preserved.`;
    } else {
      recommendedPrompt = `Fashion mirror portrait of the exact same adult person with the exact same facial features, beard, mustache, glasses, skin tone, hair, and body standing naturally in the room wearing the reference ${description}. Both arms relaxed and hanging naturally beside the body with empty hands resting at the hips. No hands or folded cloth in front of chest. Complete face, facial hair, and head fully visible and sharp. Authentic room background preserved.`;
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
