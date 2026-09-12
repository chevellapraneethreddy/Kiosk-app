import { AIProvider, GenerateImageInput, GenerateImageOutput, GenerationStatusOutput } from './AIProvider';
import { OpenAIProvider } from './OpenAIProvider';

/**
 * CustomAIProvider
 * Alias / wrapper around OpenAIProvider (OpenAI gpt-image-2).
 */
export class CustomAIProvider implements AIProvider {
  private openaiProvider: OpenAIProvider;

  constructor() {
    this.openaiProvider = new OpenAIProvider();
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    return this.openaiProvider.generateImage(input);
  }

  async getStatus(jobId: string): Promise<GenerationStatusOutput> {
    return this.openaiProvider.getStatus(jobId);
  }
}
