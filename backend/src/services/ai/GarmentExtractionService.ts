import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
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
 * Pure local application service for garment reference extraction and category logic.
 * ZERO external AI calls (no OpenAI chat completions, no vision classifier).
 * 
 * Rules:
 * 1. Customer-selected category is a STRICT constraint and governs the try-on.
 * 2. The physical garment shown by the customer is the visual source of truth.
 * 3. Extracts clean fabric reference swatch strictly excluding face and fingers.
 */
export class GarmentExtractionService {
  /**
   * Fast, local category validation.
   * Ensures selected gender and category align with kiosk menu constraints.
   */
  async validateGarmentAgainstCategory(
    capturedImagePath: string,
    selectedGender?: string,
    selectedCategory?: string
  ): Promise<GarmentValidationResult> {
    if (!fs.existsSync(capturedImagePath)) {
      throw new Error(`Captured image file not found: ${capturedImagePath}`);
    }

    if (!selectedCategory) {
      return {
        valid: true,
        conflict: false,
        detectedCategory: 'shirt',
        detectedGender: selectedGender === 'WOMEN' ? 'WOMEN' : 'MEN',
        detectedDescription: 'held physical garment',
        confidence: 1.0,
      };
    }

    const normSelGender = (selectedGender || 'WOMEN').toUpperCase() as 'MEN' | 'WOMEN';
    const normSelCat = selectedCategory.toLowerCase();

    // Map to canonical category
    let canonicalCat = 'shirt';
    if (normSelCat.includes('saree') || normSelCat.includes('sari')) {
      canonicalCat = 'saree';
    } else if (normSelCat.includes('dress') || normSelCat.includes('gown') || normSelCat.includes('kurti')) {
      canonicalCat = 'dress';
    } else if (normSelCat.includes('t-shirt') || normSelCat.includes('tshirt') || normSelCat.includes('tee')) {
      canonicalCat = 't-shirt';
    } else if (normSelCat.includes('pant') || normSelCat.includes('trouser') || normSelCat.includes('jean')) {
      canonicalCat = 'pant';
    } else if (normSelCat.includes('kurtha') || normSelCat.includes('kurta')) {
      canonicalCat = 'kurtha';
    }

    // Gender vs Category consistency check
    if (normSelGender === 'WOMEN') {
      if (canonicalCat === 'shirt' || canonicalCat === 't-shirt' || canonicalCat === 'pant' || canonicalCat === 'kurtha') {
        return {
          valid: false,
          conflict: true,
          detectedCategory: canonicalCat,
          detectedGender: 'MEN',
          detectedDescription: `${canonicalCat} garment`,
          confidence: 1.0,
          message: `Category Conflict: You selected WOMEN, but ${selectedCategory} is a Men's category. Please select Saree or Dress.`,
        };
      }
    }

    if (normSelGender === 'MEN') {
      if (canonicalCat === 'saree' || canonicalCat === 'dress') {
        return {
          valid: false,
          conflict: true,
          detectedCategory: canonicalCat,
          detectedGender: 'WOMEN',
          detectedDescription: `${canonicalCat} garment`,
          confidence: 1.0,
          message: `Category Conflict: You selected MEN, but ${selectedCategory} is a Women's category. Please select Shirt, T-Shirt, Pant, or Kurtha.`,
        };
      }
    }

    return {
      valid: true,
      conflict: false,
      detectedCategory: canonicalCat,
      detectedGender: normSelGender,
      detectedDescription: `${canonicalCat} fabric with authentic color and design`,
      confidence: 1.0,
    };
  }

  /**
   * Pure local fabric swatch extraction using Sharp.
   * Extracts clean garment swatch from the photo (center torso region where fabric is held),
   * strictly excluding the face, head, and hands.
   * NO OpenAI or external AI calls are used.
   */
  async extractGarmentInfo(
    capturedImagePath: string,
    selectedCategory?: string,
    selectedGender?: string
  ): Promise<ExtractedGarmentResult> {
    logger.info(
      `[EXTRACTION] Local garment extraction for: ${selectedGender || 'AUTO'} • ${selectedCategory || 'shirt'} from ${capturedImagePath}`
    );

    if (!fs.existsSync(capturedImagePath)) {
      throw new Error(`Captured image file not found: ${capturedImagePath}`);
    }

    const imageBuffer = fs.readFileSync(capturedImagePath);
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1440;

    // 1. Determine canonical category strictly from customer selection
    let finalCategory: 'saree' | 'dress' | 'shirt' | 't-shirt' | 'pant' | 'kurtha' = 'shirt';
    if (selectedCategory) {
      const sLower = selectedCategory.toLowerCase();
      if (sLower.includes('saree') || sLower.includes('sari')) finalCategory = 'saree';
      else if (sLower.includes('dress') || sLower.includes('gown') || sLower.includes('kurti')) finalCategory = 'dress';
      else if (sLower.includes('t-shirt') || sLower.includes('tshirt') || sLower.includes('tee')) finalCategory = 't-shirt';
      else if (sLower.includes('pant') || sLower.includes('trouser') || sLower.includes('jean')) finalCategory = 'pant';
      else if (sLower.includes('kurtha') || sLower.includes('kurta')) finalCategory = 'kurtha';
      else finalCategory = 'shirt';
    }

    // 2. Safe crop region: in kiosk framing, the garment is held in front of the center torso.
    // Crop the central swatch to capture pure fabric, avoiding face/head (top 40%) and hands/edges (outer 30%).
    const cropLeft = Math.max(0, Math.floor(width * 0.30));
    const cropTop = Math.max(0, Math.floor(height * 0.48));
    const cropWidth = Math.min(width - cropLeft, Math.floor(width * 0.40));
    const cropHeight = Math.min(height - cropTop, Math.floor(height * 0.32));

    const croppedBuffer = await sharp(imageBuffer)
      .extract({
        left: cropLeft,
        top: cropTop,
        width: cropWidth,
        height: cropHeight,
      })
      .resize(768, 768, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();

    const filename = `extracted_garment_${Date.now()}.jpg`;
    const relativeUrl = await storageService.saveFile(croppedBuffer, filename, 'uploads');
    logger.info(`[EXTRACTION] Clean pure fabric swatch saved to: ${relativeUrl} (${croppedBuffer.length} bytes)`);

    // 3. Category-specific description for the prompt
    let description = '';
    switch (finalCategory) {
      case 'saree':
        description = 'physical traditional saree with its exact color, silk/cotton weave, zari border, and ethnic pattern';
        break;
      case 'dress':
        description = 'physical dress with its exact color, fabric texture, neckline, and pattern';
        break;
      case 't-shirt':
        description = 'physical t-shirt with its exact color, graphic/print, neckline, and knit fabric';
        break;
      case 'pant':
        description = 'physical pants/trousers with its exact denim/chino wash, color, pockets, and stitching';
        break;
      case 'kurtha':
        description = 'physical traditional kurtha with its exact color, ethnic motifs/embroidery, and mandarin collar';
        break;
      default:
        description = 'physical button-up shirt with its exact color, collar, buttons, checks/stripes/pattern, and fabric weave';
        break;
    }

    // 4. Default recommended prompt for fallback
    const recommendedPrompt = `Real photorealistic virtual try-on of the person wearing the reference ${description}. Both arms relaxed and resting naturally beside hips with empty hands. No hands holding cloth. Face, identity, and background completely preserved.`;

    return {
      garmentPath: relativeUrl,
      category: finalCategory,
      description,
      recommendedPrompt,
      bbox: {
        ymin: Math.round((cropTop / height) * 1000),
        xmin: Math.round((cropLeft / width) * 1000),
        ymax: Math.round(((cropTop + cropHeight) / height) * 1000),
        xmax: Math.round(((cropLeft + cropWidth) / width) * 1000),
      },
    };
  }

  async extractGarment(capturedImagePath: string): Promise<string> {
    const info = await this.extractGarmentInfo(capturedImagePath);
    return info.garmentPath;
  }
}

export const garmentExtractionService = new GarmentExtractionService();
