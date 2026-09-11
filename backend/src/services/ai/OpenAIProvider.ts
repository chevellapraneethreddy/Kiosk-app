import { AIProvider, GenerateImageInput, GenerateImageOutput, GenerationStatusOutput } from './AIProvider';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import axios from 'axios';
import { storageService } from '../storageService';

export class OpenAIProvider implements AIProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = config.AI_API_KEY || '';
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: config.AI_MODEL || 'dall-e-3',
          prompt: input.prompt,
          n: 1,
          size: '1024x1024',
          quality: 'hd',
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const imageUrl = response.data.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error('OpenAI response did not return an image URL');
      }

      const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const targetFilename = `generated_${input.generationId}.jpg`;
      const relativeUrl = await storageService.saveFile(Buffer.from(imgRes.data), targetFilename, 'generated');

      return {
        jobId: `openai_${Date.now()}`,
        status: 'COMPLETED',
        progress: 100,
        resultUrl: relativeUrl,
      };
    } catch (error: any) {
      logger.error('OpenAIProvider error:', error?.response?.data || error.message);
      throw new Error(`OpenAI API failed: ${error.message}`);
    }
  }

  async getStatus(jobId: string): Promise<GenerationStatusOutput> {
    return {
      jobId,
      status: 'COMPLETED',
      progress: 100,
    };
  }
}
