import { AIProvider, GenerateImageInput, GenerateImageOutput, GenerationStatusOutput } from './AIProvider';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import axios from 'axios';
import fs from 'fs';
import { storageService } from '../storageService';
import { CustomAIProvider } from './CustomAIProvider';

/**
 * GeminiAIProvider — Integration for Google Gemini & Imagen API
 * =========================================================
 * Uses process.env.GEMINI_API_KEY to generate high-resolution AI output images
 * or enhance visual try-on prompts using Google Gemini models.
 * =========================================================
 */
export class GeminiAIProvider implements AIProvider {
  private apiKey: string;
  private customProvider: CustomAIProvider;

  constructor() {
    this.apiKey = config.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    this.customProvider = new CustomAIProvider();

    if (!this.apiKey) {
      logger.warn('GeminiAIProvider: GEMINI_API_KEY is not set in environment!');
    }
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    try {
      logger.info(`Sending generation request to Google Gemini API...`);

      if (this.apiKey) {
        // 1. First, attempt Imagen 3 / Gemini REST endpoint
        const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${this.apiKey}`;
        
        try {
          const response = await axios.post(
            imagenUrl,
            {
              instances: [{ prompt: input.prompt }],
              parameters: { sampleCount: 1, aspectRatio: "3:4" },
            },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 45000,
              validateStatus: (status) => status < 500,
            }
          );

          if (response.status === 200 && response.data?.predictions?.[0]?.bytesBase64Encoded) {
            logger.info('Received generated image base64 output from Google Imagen API');
            const base64Data = response.data.predictions[0].bytesBase64Encoded;
            const imgBuffer = Buffer.from(base64Data, 'base64');
            const targetFilename = `generated_${input.generationId}.jpg`;
            const relativeUrl = await storageService.saveFile(imgBuffer, targetFilename, 'generated');

            return {
              jobId: `gemini_imagen_${Date.now()}`,
              status: 'COMPLETED',
              resultUrl: relativeUrl,
              progress: 100,
            };
          }
        } catch (imagenErr: any) {
          logger.warn('Google Imagen API call info:', imagenErr?.response?.data || imagenErr.message);
        }
      }

      // 2. Seamlessly execute OpenAI Virtual Try-On API as primary try-on engine
      logger.info('Executing OpenAI Virtual Try-On transformation...');
      return await this.customProvider.generateImage(input);
    } catch (error: any) {
      logger.error('GeminiAIProvider error:', error.message);
      throw new Error(`Gemini AI Provider failed: ${error.message}`);
    }
  }

  async getStatus(jobId: string): Promise<GenerationStatusOutput> {
    if (jobId.startsWith('gemini_imagen_')) {
      return { jobId, status: 'COMPLETED', progress: 100 };
    }
    return this.customProvider.getStatus(jobId);
  }
}
