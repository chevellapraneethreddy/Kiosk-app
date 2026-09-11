import { AIProvider, GenerateImageInput, GenerateImageOutput, GenerationStatusOutput } from './AIProvider';
import { DecartAIProvider } from './DecartAIProvider';

/**
 * CustomAIProvider
 * Alias / wrapper around DecartAIProvider (Decart Lucy Virtual Try-On 3.5).
 */
export class CustomAIProvider implements AIProvider {
  private decartProvider: DecartAIProvider;

  constructor() {
    this.decartProvider = new DecartAIProvider();
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    return this.decartProvider.generateImage(input);
  }

  async getStatus(jobId: string): Promise<GenerationStatusOutput> {
    return this.decartProvider.getStatus(jobId);
  }
}
