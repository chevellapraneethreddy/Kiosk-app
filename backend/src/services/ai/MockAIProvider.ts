import { AIProvider, GenerateImageInput, GenerateImageOutput, GenerationStatusOutput } from './AIProvider';
import { generateStyledMockImage } from '../../utils/sharpHelper';
import { storageService } from '../storageService';
import { config } from '../../config';
import path from 'path';
import fs from 'fs';
import { sseService } from '../sseService';

interface MockJob {
  jobId: string;
  generationId: string;
  userImagePath: string;
  styleName: string;
  startTime: number;
  totalDurationMs: number;
  resultUrl?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export class MockAIProvider implements AIProvider {
  private jobs: Map<string, MockJob> = new Map();

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    const jobId = `mock_job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const durationSeconds = config.MOCK_GENERATION_SECONDS || 5;
    const totalDurationMs = durationSeconds * 1000;

    const job: MockJob = {
      jobId,
      generationId: input.generationId,
      userImagePath: input.userImagePath,
      styleName: input.styleName,
      startTime: Date.now(),
      totalDurationMs,
      status: 'PENDING',
    };

    this.jobs.set(jobId, job);

    // Asynchronously process job progress
    this.processJob(job);

    return {
      jobId,
      status: 'PENDING',
      progress: 5,
    };
  }

  private async processJob(job: MockJob) {
    const checkInterval = 500;
    const intervalId = setInterval(async () => {
      const elapsed = Date.now() - job.startTime;
      const progress = Math.min(99, Math.round((elapsed / job.totalDurationMs) * 100));

      if (elapsed < job.totalDurationMs * 0.3) {
        job.status = 'PENDING';
      } else if (elapsed < job.totalDurationMs) {
        job.status = 'PROCESSING';
      } else {
        clearInterval(intervalId);
        job.status = 'COMPLETED';

        // Produce a styled generated image
        const targetFilename = `generated_${job.generationId}.jpg`;
        const tempOutputPath = path.join(__dirname, `../../../generated/temp_${targetFilename}`);
        
        await generateStyledMockImage(job.userImagePath, tempOutputPath, job.styleName);
        const relativeUrl = await storageService.saveFile(tempOutputPath, targetFilename, 'generated');
        
        if (fs.existsSync(tempOutputPath)) {
          fs.unlinkSync(tempOutputPath);
        }

        job.resultUrl = relativeUrl;

        // Broadcast completion SSE
        sseService.sendEventToGeneration(job.generationId, 'generation_complete', {
          generationId: job.generationId,
          resultUrl: relativeUrl,
          status: 'COMPLETED',
        });
        return;
      }

      // Broadcast progress SSE
      sseService.sendEventToGeneration(job.generationId, 'generation_progress', {
        generationId: job.generationId,
        progress,
        status: job.status,
      });
    }, checkInterval);
  }

  async getStatus(jobId: string): Promise<GenerationStatusOutput> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return {
        jobId,
        status: 'FAILED',
        errorMessage: 'Job not found',
      };
    }

    const elapsed = Date.now() - job.startTime;
    const progress = job.status === 'COMPLETED' ? 100 : Math.min(99, Math.round((elapsed / job.totalDurationMs) * 100));

    return {
      jobId,
      status: job.status,
      progress,
      resultUrl: job.resultUrl,
    };
  }
}
