export type GenerationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface GenerateImageInput {
  generationId: string;
  userImagePath: string;
  prompt: string;
  negativePrompt?: string;
  styleName: string;
  styleCategory?: string;
  options?: Record<string, any>;
}

export interface GenerateImageOutput {
  jobId: string;
  status: GenerationStatus;
  resultUrl?: string;
  progress?: number;
}

export interface GenerationStatusOutput {
  jobId: string;
  status: GenerationStatus;
  resultUrl?: string;
  progress?: number;
  errorMessage?: string;
}

export interface AIProvider {
  /**
   * Submit image generation job to AI service
   */
  generateImage(input: GenerateImageInput): Promise<GenerateImageOutput>;

  /**
   * Poll status of an async generation job
   */
  getStatus(jobId: string): Promise<GenerationStatusOutput>;

  /**
   * Optional cancel method
   */
  cancelGeneration?(jobId: string): Promise<void>;
}
