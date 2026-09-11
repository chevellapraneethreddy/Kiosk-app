import { AIProvider, GenerateImageInput, GenerateImageOutput, GenerationStatusOutput } from './AIProvider';
import { decartVtonService } from '../DecartVtonService';

export class DecartAIProvider implements AIProvider {
  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    const garmentPath = input.options?.garmentImagePath || input.userImagePath;

    const output = await decartVtonService.processTryOn({
      generationId: input.generationId,
      userImagePath: input.userImagePath,
      garmentImagePath: garmentPath,
      category: input.styleCategory || input.options?.category || 'tops',
      prompt: input.prompt,
    });

    return {
      jobId: output.jobId,
      status: output.status,
      resultUrl: output.resultUrl,
      progress: 100,
    };
  }

  async getStatus(jobId: string): Promise<GenerationStatusOutput> {
    return {
      jobId,
      status: 'COMPLETED',
      progress: 100,
    };
  }
}
