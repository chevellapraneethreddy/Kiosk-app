import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import axios from 'axios';
import { OpenAI } from 'openai';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { storageService } from '../storageService';

export interface GarmentValidationResult {
  valid: boolean;
  conflict: boolean;
  detectedCategory: string; // 'saree' | 'dress' | 'shirt' | 't-shirt' | 'pant' | 'kurtha'
  detectedGender: 'MEN' | 'WOMEN';
  detectedDescription: string;
  confidence: number;
  message?: string;
}

export interface ExtractedGarmentResult {
  garmentPath: string; // Relative path e.g. /uploads/extracted_garment_123.jpg
  category: 'saree' | 'dress' | 'shirt' | 't-shirt' | 'pant' | 'kurtha' | 'suit' | 'top';
  description: string;
  recommendedPrompt: string;
  bbox?: { ymin: number; xmin: number; ymax: number; xmax: number };
}

/**
 * GarmentExtractionService
 * =======================
 * High-precision garment detector and extractor.
 * 1. Validates physical garment shown to camera against user selected category.
 * 2. Stops generation if a category/garment conflict exists.
 * 3. Extracts pure fabric reference swatch strictly excluding fingers and face.
 * 4. Priority Rule: Selected Category always governs virtual try-on.
 */
export class GarmentExtractionService {
  private geminiKey: string;
  private openAiClient: OpenAI | null = null;

  constructor() {
    this.geminiKey = config.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    const openAiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
    if (openAiKey) {
      this.openAiClient = new OpenAI({ apiKey: openAiKey });
    }
  }

  /**
   * Fast vision classifier using OpenAI gpt-4o-mini with Gemini fallback.
   */
  private async classifyGarmentVision(imageBuffer: Buffer): Promise<{
    category: string;
    gender: 'MEN' | 'WOMEN';
    description: string;
    confidence: number;
    bbox?: { ymin: number; xmin: number; ymax: number; xmax: number };
  }> {
    const base64Data = imageBuffer.toString('base64');

    // 1. Primary: OpenAI gpt-4o-mini vision (high accuracy, ~800ms)
    if (this.openAiClient) {
      try {
        const response = await this.openAiClient.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are an expert fashion AI detector in a retail virtual try-on kiosk. Classify the garment being physically held or shown in front of the camera into one of: saree, dress, shirt, t-shirt, pant, kurtha. Return strictly valid JSON.',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text:
                    'Analyze the garment shown/held in this photo with high fashion accuracy. Return JSON in this exact structure: {"category": "saree"|"dress"|"shirt"|"t-shirt"|"pant"|"kurtha", "gender": "MEN"|"WOMEN", "confidence": number between 0 and 1, "description": "rich detailed description of fabric, exact color shades, border zari/embroidery, motifs, weave, pattern, and design", "bbox": {"ymin": number, "xmin": number, "ymax": number, "xmax": number}} (bbox 0-1000 normalized coordinates of the held garment fabric).',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Data}`,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 300,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.category) {
            const cat = parsed.category.toLowerCase();
            const normCat =
              cat.includes('saree') || cat.includes('sari')
                ? 'saree'
                : cat.includes('dress') || cat.includes('gown') || cat.includes('kurti')
                ? 'dress'
                : cat.includes('t-shirt') || cat.includes('tshirt') || cat.includes('tee')
                ? 't-shirt'
                : cat.includes('pant') || cat.includes('trouser') || cat.includes('jean')
                ? 'pant'
                : cat.includes('kurtha') || cat.includes('kurta')
                ? 'kurtha'
                : 'shirt';

            const gender: 'MEN' | 'WOMEN' =
              normCat === 'saree' || normCat === 'dress'
                ? 'WOMEN'
                : parsed.gender === 'WOMEN'
                ? 'WOMEN'
                : 'MEN';

            logger.info(
              `[EXTRACTION] OpenAI vision classified: ${normCat} (${gender}, conf: ${parsed.confidence ?? 0.95})`
            );
            return {
              category: normCat,
              gender,
              description: parsed.description || `${normCat} garment`,
              confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
              bbox: parsed.bbox,
            };
          }
        }
      } catch (err: any) {
        logger.warn(`[EXTRACTION] OpenAI vision classification error: ${err.message}`);
      }
    }

    // 2. Fallback: Gemini Vision
    if (this.geminiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${this.geminiKey}`;
        const promptText = `Analyze the garment held or displayed by the person in this photo. Return strictly valid JSON: {"category": "saree"|"dress"|"shirt"|"t-shirt"|"pant"|"kurtha", "gender": "MEN"|"WOMEN", "confidence": number, "description": "color, fabric, pattern", "bbox": {"ymin": number, "xmin": number, "ymax": number, "xmax": number}}`;

        const res = await axios.post(
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
          { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
        );

        const textOutput = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOutput) {
          const cleanJson = textOutput.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed.category) {
            const cat = parsed.category.toLowerCase();
            const normCat =
              cat.includes('saree') || cat.includes('sari')
                ? 'saree'
                : cat.includes('dress')
                ? 'dress'
                : cat.includes('t-shirt')
                ? 't-shirt'
                : cat.includes('pant') || cat.includes('trouser')
                ? 'pant'
                : cat.includes('kurtha')
                ? 'kurtha'
                : 'shirt';

            const gender: 'MEN' | 'WOMEN' =
              normCat === 'saree' || normCat === 'dress' ? 'WOMEN' : 'MEN';
            return {
              category: normCat,
              gender,
              description: parsed.description || `${normCat} garment`,
              confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
              bbox: parsed.bbox,
            };
          }
        }
      } catch (geminiErr: any) {
        logger.warn(`[EXTRACTION] Gemini Vision error: ${geminiErr.message}`);
      }
    }

    // Default heuristic fallback
    return {
      category: 'shirt',
      gender: 'MEN',
      description: 'held physical garment',
      confidence: 0.5,
    };
  }

  /**
   * Pre-generation validation: checks if physically held garment conflicts with selected category.
   * If there is a conflict, generation MUST stop before sending to OpenAI.
   */
  async validateGarmentAgainstCategory(
    capturedImagePath: string,
    selectedGender?: string,
    selectedCategory?: string
  ): Promise<GarmentValidationResult> {
    if (!selectedCategory) {
      return {
        valid: true,
        conflict: false,
        detectedCategory: 'garment',
        detectedGender: selectedGender === 'WOMEN' ? 'WOMEN' : 'MEN',
        detectedDescription: 'held garment',
        confidence: 1.0,
      };
    }

    if (!fs.existsSync(capturedImagePath)) {
      throw new Error(`Captured image file not found: ${capturedImagePath}`);
    }

    const imageBuffer = fs.readFileSync(capturedImagePath);
    const classification = await this.classifyGarmentVision(imageBuffer);

    const normSelGender = (selectedGender || 'WOMEN').toUpperCase() as 'MEN' | 'WOMEN';
    const normSelCat = selectedCategory.toLowerCase();
    const detectedCat = classification.category.toLowerCase();
    const detectedGender = classification.gender;

    logger.info(
      `[VALIDATION] Checking user selection (${normSelGender} • ${selectedCategory}) against detected (${detectedGender} • ${detectedCat}, conf: ${classification.confidence})`
    );

    // Only flag conflicts if detector is reasonably confident (> 0.65)
    if (classification.confidence >= 0.65) {
      // Rule 1: STRICT GENDER / CATEGORY ISOLATION
      // If user selected WOMEN: valid outfits are ONLY Saree or Dress.
      if (normSelGender === 'WOMEN') {
        if (
          detectedCat === 'shirt' ||
          detectedCat === 't-shirt' ||
          detectedCat === 'pant' ||
          detectedCat === 'kurtha'
        ) {
          return {
            valid: false,
            conflict: true,
            detectedCategory: detectedCat,
            detectedGender: 'MEN',
            detectedDescription: classification.description,
            confidence: classification.confidence,
            message: `Category Conflict: You selected WOMEN - ${selectedCategory}, but a Men's ${detectedCat} was detected. Please hold a Women's garment or switch to Men's category.`,
          };
        }

        // WOMEN + Saree vs Dress conflict
        if (normSelCat === 'saree' && detectedCat === 'dress') {
          return {
            valid: false,
            conflict: true,
            detectedCategory: 'dress',
            detectedGender: 'WOMEN',
            detectedDescription: classification.description,
            confidence: classification.confidence,
            message: `Category Conflict: You selected WOMEN - Saree, but a Western Dress was detected. Please hold a saree or change your selection to Dress.`,
          };
        }

        if (normSelCat === 'dress' && detectedCat === 'saree') {
          return {
            valid: false,
            conflict: true,
            detectedCategory: 'saree',
            detectedGender: 'WOMEN',
            detectedDescription: classification.description,
            confidence: classification.confidence,
            message: `Category Conflict: You selected WOMEN - Dress, but an Indian Saree was detected. Please hold a dress or change your selection to Saree.`,
          };
        }
      }

      // If user selected MEN: valid outfits are Shirt, T-Shirt, Pant, Kurtha.
      if (normSelGender === 'MEN') {
        if (detectedCat === 'saree' || detectedCat === 'dress') {
          return {
            valid: false,
            conflict: true,
            detectedCategory: detectedCat,
            detectedGender: 'WOMEN',
            detectedDescription: classification.description,
            confidence: classification.confidence,
            message: `Category Conflict: You selected MEN - ${selectedCategory}, but a Women's ${detectedCat} was detected. Please hold Men's clothing or switch to Women's category.`,
          };
        }

        // MEN: Pant vs Tops conflict
        if (normSelCat === 'pant' && (detectedCat === 'shirt' || detectedCat === 't-shirt' || detectedCat === 'kurtha')) {
          return {
            valid: false,
            conflict: true,
            detectedCategory: detectedCat,
            detectedGender: 'MEN',
            detectedDescription: classification.description,
            confidence: classification.confidence,
            message: `Category Conflict: You selected MEN - Pant, but an upper-body ${detectedCat} was detected. Please hold pants or switch category to ${detectedCat}.`,
          };
        }

        if ((normSelCat === 'shirt' || normSelCat === 't-shirt' || normSelCat === 'kurtha') && detectedCat === 'pant') {
          return {
            valid: false,
            conflict: true,
            detectedCategory: 'pant',
            detectedGender: 'MEN',
            detectedDescription: classification.description,
            confidence: classification.confidence,
            message: `Category Conflict: You selected MEN - ${selectedCategory}, but Pants were detected. Please hold a ${selectedCategory} or switch category to Pant.`,
          };
        }
      }
    }

    return {
      valid: true,
      conflict: false,
      detectedCategory: detectedCat,
      detectedGender,
      detectedDescription: classification.description,
      confidence: classification.confidence,
    };
  }

  /**
   * Extract held garment swatch and produce tailored virtual try-on instructions.
   * STRICT PRIORITY: If selectedCategory is provided, it is NEVER replaced or overridden.
   */
  async extractGarmentInfo(
    capturedImagePath: string,
    selectedCategory?: string,
    selectedGender?: string
  ): Promise<ExtractedGarmentResult> {
    logger.info(
      `[EXTRACTION] Extracting held garment from photo: ${capturedImagePath} (User Selected: ${selectedGender} • ${selectedCategory})`
    );

    if (!fs.existsSync(capturedImagePath)) {
      throw new Error(`Captured image file not found: ${capturedImagePath}`);
    }

    const imageBuffer = fs.readFileSync(capturedImagePath);
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1440;

    // Face-Safe Default Bounding Box
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

    // 1. Determine Category:
    // CRITICAL: If user selected a category, IT ALWAYS GOVERNS. Never infer a different category!
    let finalCategory: 'saree' | 'dress' | 'shirt' | 't-shirt' | 'pant' | 'kurtha' = 'shirt';
    if (selectedCategory) {
      const sLower = selectedCategory.toLowerCase();
      if (sLower.includes('saree') || sLower.includes('sari')) finalCategory = 'saree';
      else if (sLower.includes('dress')) finalCategory = 'dress';
      else if (sLower.includes('t-shirt') || sLower.includes('tshirt') || sLower.includes('tee')) finalCategory = 't-shirt';
      else if (sLower.includes('pant') || sLower.includes('trouser') || sLower.includes('jean')) finalCategory = 'pant';
      else if (sLower.includes('kurtha') || sLower.includes('kurta')) finalCategory = 'kurtha';
      else finalCategory = 'shirt';
    }

    let description = `${finalCategory} fabric with authentic color and design`;

    // 2. Vision analysis for exact fabric description & precise bounding box
    try {
      const visionRes = await this.classifyGarmentVision(imageBuffer);
      if (visionRes.description) {
        description = visionRes.description;
      }
      if (visionRes.bbox && typeof visionRes.bbox.ymin === 'number') {
        const safeYmin = Math.max(500, visionRes.bbox.ymin);
        detectedBbox = {
          ymin: safeYmin,
          xmin: Math.max(0, visionRes.bbox.xmin),
          ymax: Math.min(1000, Math.max(safeYmin + 150, visionRes.bbox.ymax)),
          xmax: Math.min(1000, visionRes.bbox.xmax),
        };

        const b = detectedBbox;
        const bTop = Math.floor((b.ymin / 1000) * height);
        const bLeft = Math.floor((b.xmin / 1000) * width);
        const bWidth = Math.floor(((b.xmax - b.xmin) / 1000) * width);
        const bHeight = Math.floor(((b.ymax - b.ymin) / 1000) * height);

        // Inset by 25% horizontally to eliminate skin and hands holding cloth
        const insetX = Math.floor(bWidth * 0.25);
        const insetY = Math.floor(bHeight * 0.15);

        cropRegion = {
          left: Math.min(Math.max(0, bLeft + insetX), width - 80),
          top: Math.min(Math.max(0, bTop + insetY), height - 80),
          width: Math.max(60, bWidth - insetX * 2),
          height: Math.max(60, bHeight - insetY * 2),
        };
      }
    } catch (err: any) {
      logger.warn(`[EXTRACTION] Vision analysis error: ${err.message}`);
    }

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
    if (finalCategory === 'saree') {
      recommendedPrompt = `Full-length top-to-bottom fashion standee portrait of the exact same Indian woman standing gracefully in the room. She is wearing the reference ${description} realistically draped around her body from shoulders down to ankles with a matching blouse, neat waist pleats, and the ornate pallu gracefully draped over the left shoulder across the torso. Full head to toe. Both arms resting naturally beside the hips with empty hands. No hands holding cloth. Complete face and head fully visible and sharp. Authentic room background preserved.`;
    } else if (finalCategory === 'pant') {
      recommendedPrompt = `Full-length fashion portrait of the exact same man standing upright in the room. Wearing the reference ${description} fitted cleanly on the lower body from the waistband and belt down along both legs to the shoes. Paired with a neat complementary neutral top. Upper body and pants strictly separate. Both arms hanging straight down naturally with empty hands at hips. No hands holding cloth. Complete face, hair, and full body fully visible and sharp. Authentic room background preserved.`;
    } else if (finalCategory === 't-shirt') {
      recommendedPrompt = `Fashion portrait of the exact same man standing naturally in the room wearing the reference ${description} fitted neatly over the torso, showing the crewneck, sleeves, chest, and entire t-shirt down to the bottom hem and waistline. Both arms relaxed and hanging naturally beside the body with empty hands at hips. No hands or folded cloth in front of chest. Complete face and head fully visible and sharp. Authentic room background preserved.`;
    } else if (finalCategory === 'kurtha') {
      recommendedPrompt = `Full-length fashion portrait of the exact same Indian man standing gracefully in the room. He is wearing the reference ${description} tailored as a classic traditional kurtha tunic extending down past the thighs and knees, with mandarin collar, buttoned placket, and paired with neutral churidar/trousers below. Both arms relaxed beside the hips with empty hands. Complete face and head fully visible and sharp. Authentic room background preserved.`;
    } else if (finalCategory === 'dress') {
      recommendedPrompt = `Full-length fashion portrait of the exact same woman standing gracefully in the room wearing the reference ${description} tailored elegantly from shoulders and bust down through the waist to the hemline. Both arms resting naturally beside the body with empty hands. Complete face and head fully visible and sharp. Authentic room background preserved.`;
    } else {
      // shirt
      recommendedPrompt = `Fashion portrait of the exact same man standing naturally in the room wearing the reference ${description} neatly tailored and buttoned up with crisp collar, sleeves, front placket, and entire shirt down to the bottom hem and waist. Both arms hanging straight down naturally beside the body with empty hands resting at the hips. No hands or folded cloth in front of chest. Complete face and head fully visible and sharp. Authentic room background preserved.`;
    }

    return {
      garmentPath: relativeUrl,
      category: finalCategory,
      description,
      recommendedPrompt,
      bbox: detectedBbox,
    };
  }

  async extractGarment(capturedImagePath: string): Promise<string> {
    const info = await this.extractGarmentInfo(capturedImagePath);
    return info.garmentPath;
  }
}

export const garmentExtractionService = new GarmentExtractionService();
