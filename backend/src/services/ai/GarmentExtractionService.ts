import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { storageService } from '../storageService';

/**
 * GarmentExtractionService
 * =======================
 * Automatically detects and extracts the physically held saree/dress/garment
 * from a captured camera frame using Google Gemini Vision API + Sharp.
 */
export class GarmentExtractionService {
  private apiKey: string;

  constructor() {
    this.apiKey = config.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  }

  /**
   * Extract held garment from full camera scene image.
   * Returns relative storage path to extracted garment image (e.g., /uploads/extracted_garment_123.jpg).
   */
  async extractGarment(capturedImagePath: string): Promise<string> {
    logger.info(`Extracting held garment from photo: ${capturedImagePath}`);

    if (!fs.existsSync(capturedImagePath)) {
      throw new Error(`Captured image file not found: ${capturedImagePath}`);
    }

    const imageBuffer = fs.readFileSync(capturedImagePath);
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1440;

    let cropRegion = {
      left: Math.floor(width * 0.15),
      top: Math.floor(height * 0.3),
      width: Math.floor(width * 0.7),
      height: Math.floor(height * 0.6),
    };

    // Attempt Gemini Vision bounding box detection if GEMINI_API_KEY is available
    if (this.apiKey) {
      try {
        const base64Data = imageBuffer.toString('base64');
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

        const payload = {
          contents: [
            {
              parts: [
                {
                  text: 'Identify the held saree, dress, or clothing garment in this image. Return ONLY a JSON object with 0-1000 normalized bounding box coordinates for the garment: {"ymin": number, "xmin": number, "ymax": number, "xmax": number}. Do not include markdown codeblocks or extra text.',
                },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        };

        const response = await axios.post(geminiUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 20000,
        });

        const textOutput = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOutput) {
          logger.info(`Gemini Vision garment detection raw response: ${textOutput}`);
          const cleanJson = textOutput.replace(/```json|```/g, '').trim();
          const bbox = JSON.parse(cleanJson);

          if (
            typeof bbox.ymin === 'number' &&
            typeof bbox.xmin === 'number' &&
            typeof bbox.ymax === 'number' &&
            typeof bbox.xmax === 'number'
          ) {
            const top = Math.floor((bbox.ymin / 1000) * height);
            const left = Math.floor((bbox.xmin / 1000) * width);
            const cropW = Math.max(100, Math.floor(((bbox.xmax - bbox.xmin) / 1000) * width));
            const cropH = Math.max(100, Math.floor(((bbox.ymax - bbox.ymin) / 1000) * height));

            cropRegion = {
              left: Math.min(Math.max(0, left), width - 100),
              top: Math.min(Math.max(0, top), height - 100),
              width: Math.min(cropW, width - left),
              height: Math.min(cropH, height - top),
            };

            logger.info(`Successfully parsed garment crop region via Gemini Vision:`, cropRegion);
          }
        }
      } catch (geminiErr: any) {
        logger.warn('Gemini Vision garment extraction warning (using fallback crop):', geminiErr.message);
      }
    }

    // Crop the garment region using Sharp
    const croppedBuffer = await sharp(imageBuffer)
      .extract(cropRegion)
      .jpeg({ quality: 95 })
      .toBuffer();

    const filename = `extracted_garment_${Date.now()}.jpg`;
    const relativeUrl = await storageService.saveFile(croppedBuffer, filename, 'uploads');
    logger.info(`Saved extracted garment image to: ${relativeUrl}`);

    return relativeUrl;
  }
}

export const garmentExtractionService = new GarmentExtractionService();
