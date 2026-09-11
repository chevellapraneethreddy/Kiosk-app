import { AIProvider, GenerateImageInput, GenerateImageOutput, GenerationStatusOutput } from './AIProvider';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import axios from 'axios';
import fs from 'fs';
import { storageService } from '../storageService';

export class ReplicateProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = config.AI_API_KEY || '';
    this.model = config.AI_MODEL || 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    try {
      const imageBuffer = fs.readFileSync(input.userImagePath);
      const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

      const response = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          version: this.model.split(':')[1] || this.model,
          input: {
            prompt: input.prompt,
            image: base64Image,
            negative_prompt: input.negativePrompt || '',
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const prediction = response.data;
      return {
        jobId: prediction.id,
        status: prediction.status === 'succeeded' ? 'COMPLETED' : 'PROCESSING',
        progress: prediction.status === 'succeeded' ? 100 : 15,
      };
    } catch (error: any) {
      logger.error('ReplicateProvider error:', error?.response?.data || error.message);
      throw new Error(`Replicate API failed: ${error.message}`);
    }
  }

  async getStatus(jobId: string): Promise<GenerationStatusOutput> {
    try {
      const response = await axios.get(`https://api.replicate.com/v1/predictions/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const prediction = response.data;
      if (prediction.status === 'succeeded' && prediction.output?.[0]) {
        const imageUrl = prediction.output[0];
        const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const targetFilename = `generated_${jobId}.jpg`;
        const relativeUrl = await storageService.saveFile(Buffer.from(imgRes.data), targetFilename, 'generated');

        return {
          jobId,
          status: 'COMPLETED',
          progress: 100,
          resultUrl: relativeUrl,
        };
      } else if (prediction.status === 'failed') {
        return {
          jobId,
          status: 'FAILED',
          errorMessage: prediction.error || 'Replicate prediction failed',
        };
      }

      return {
        jobId,
        status: 'PROCESSING',
        progress: 50,
      };
    } catch (error: any) {
      return {
        jobId,
        status: 'FAILED',
        errorMessage: error.message,
      };
    }
  }
}
