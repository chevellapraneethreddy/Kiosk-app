import { createDecartClient, models } from '@decartai/sdk';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { execFileSync } from 'child_process';
import { config } from '../config';
import { logger } from '../utils/logger';
import { storageService } from './storageService';
import { garmentExtractionService } from './ai/GarmentExtractionService';

// Resolve ffmpeg binary
let ffmpegPath: string | null = null;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (err: any) {
  logger.warn(`Could not load ffmpeg-static: ${err.message}`);
}

export interface DecartTryOnInput {
  generationId: string;
  userImagePath: string;
  garmentImagePath?: string;
  category?: string;
  prompt?: string;
}

export interface DecartTryOnOutput {
  jobId: string;
  status: 'COMPLETED' | 'FAILED';
  resultUrl?: string;
  errorMessage?: string;
}

export class DecartVtonService {
  private apiKey: string;
  private client: ReturnType<typeof createDecartClient>;

  constructor() {
    this.apiKey = config.DECART_API_KEY || process.env.DECART_API_KEY || '';
    const configured = !!this.apiKey;
    logger.info(`[DECART] DECART_API_KEY configured: ${configured}`);

    this.client = createDecartClient({
      apiKey: this.apiKey,
    });
  }

  async processTryOn(input: DecartTryOnInput): Promise<DecartTryOnOutput> {
    logger.info('[DECART] request started');

    if (!this.apiKey) {
      const err = 'DECART_API_KEY is not configured in .env';
      logger.error(`[DECART] ${err}`);
      throw new Error(err);
    }

    const personExists = fs.existsSync(input.userImagePath);
    if (!personExists) {
      const err = `Person image not found at path: ${input.userImagePath}`;
      logger.error(`[DECART] ${err}`);
      throw new Error(err);
    }

    let finalGarmentPath = input.garmentImagePath;

    // If garment image is not provided or points to same file as person image, extract held garment from captured frame
    if (
      !finalGarmentPath ||
      !fs.existsSync(finalGarmentPath) ||
      path.resolve(finalGarmentPath) === path.resolve(input.userImagePath)
    ) {
      logger.info('[DECART] Extracting held garment from captured camera photo...');
      const relativeGarmentPath = await garmentExtractionService.extractGarment(input.userImagePath);
      finalGarmentPath = path.resolve(__dirname, '../../..', relativeGarmentPath.replace(/^\//, ''));
    }

    if (!fs.existsSync(finalGarmentPath)) {
      const err = `Garment image not found at path: ${finalGarmentPath}`;
      logger.error(`[DECART] ${err}`);
      throw new Error(err);
    }

    // Inspect garment metadata
    const garmentMeta = await sharp(finalGarmentPath).metadata();
    logger.info(`[DECART] garment received (${garmentMeta.width}x${garmentMeta.height})`);

    const tempDir = path.resolve(__dirname, '../../../uploads');
    const timestamp = Date.now();
    const tempVideoPath = path.join(tempDir, `temp_person_${input.generationId}_${timestamp}.mp4`);
    const tempOutRawPath = path.join(tempDir, `temp_out_raw_${input.generationId}_${timestamp}.bin`);
    const tempOutFramePath = path.join(tempDir, `temp_frame_${input.generationId}_${timestamp}.jpg`);

    try {
      if (!ffmpegPath) {
        throw new Error('ffmpeg binary is unavailable to encode video stream for Decart Lucy VTON 3.5');
      }

      // Convert person frame to 2-second 720p H.264 MP4 for Decart Lucy VTON 3.5
      logger.info(`[DECART] Encoding person photo into 720p video stream via ffmpeg...`);
      execFileSync(
        ffmpegPath,
        [
          '-y',
          '-loop',
          '1',
          '-i',
          input.userImagePath,
          '-c:v',
          'libx264',
          '-t',
          '2',
          '-pix_fmt',
          'yuv420p',
          '-vf',
          'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
          tempVideoPath,
        ],
        { stdio: 'ignore' }
      );

      const videoBuffer = fs.readFileSync(tempVideoPath);
      const garmentBuffer = fs.readFileSync(finalGarmentPath);

      const promptToUse =
        input.prompt ||
        'Substitute the current clothing with the reference garment, wearing the garment naturally, dressed in the garment, perfect fit, full body dress, photo realistic';

      logger.info('[DECART] generation started');
      logger.info(`[DECART] Submitting job to Lucy Virtual Try-On 3.5 (prompt: "${promptToUse}")...`);

      const vtonModel = models.video('lucy-vton-3.5');
      const submitResult = await this.client.queue.submitAndPoll({
        model: vtonModel,
        data: new Blob([videoBuffer], { type: 'video/mp4' }),
        reference_image: new Blob([garmentBuffer], { type: 'image/jpeg' }),
        prompt: promptToUse,
        resolution: '720p',
        onStatusChange: (job) => {
          logger.info(`[DECART] Job ${job.job_id} status: ${job.status}`);
        },
      });

      if (submitResult.status !== 'completed') {
        const errMsg = submitResult.error || 'Decart Lucy Virtual Try-On 3.5 processing failed';
        logger.error(`[DECART] Generation failed: ${errMsg}`);
        throw new Error(`Decart Lucy Virtual Try-On 3.5 failed: ${errMsg}`);
      }

      logger.info('[DECART] generation completed');

      // Retrieve binary data
      const resultBlob = submitResult.data;
      const rawBuffer = Buffer.from(await resultBlob.arrayBuffer());
      fs.writeFileSync(tempOutRawPath, rawBuffer);

      let finalImageBuffer: Buffer;

      // Check if output is MP4 video or direct image
      const isMp4 = rawBuffer.length > 12 && rawBuffer.slice(4, 8).toString() === 'ftyp';

      if (isMp4) {
        logger.info('[DECART] Output received as MP4 video; extracting try-on snapshot frame...');
        execFileSync(
          ffmpegPath,
          ['-y', '-ss', '00:00:01', '-i', tempOutRawPath, '-vframes', '1', '-q:v', '2', tempOutFramePath],
          { stdio: 'ignore' }
        );

        if (!fs.existsSync(tempOutFramePath)) {
          // Fallback to first frame if 1.0s fails
          execFileSync(
            ffmpegPath,
            ['-y', '-i', tempOutRawPath, '-vframes', '1', '-q:v', '2', tempOutFramePath],
            { stdio: 'ignore' }
          );
        }

        finalImageBuffer = fs.readFileSync(tempOutFramePath);
      } else {
        finalImageBuffer = rawBuffer;
      }

      // Verification: verify that output is not identical to input image and has valid size
      if (!finalImageBuffer || finalImageBuffer.length < 5000) {
        throw new Error('Decart Lucy Virtual Try-On returned an empty or invalid image file');
      }

      const inputBuffer = fs.readFileSync(input.userImagePath);
      if (finalImageBuffer.equals(inputBuffer)) {
        logger.error('[DECART] Error: Decart output is identical to input image');
        throw new Error('Virtual try-on output was identical to original input image');
      }

      const targetFilename = `generated_${input.generationId}.jpg`;
      const relativeUrl = await storageService.saveFile(finalImageBuffer, targetFilename, 'generated');

      logger.info('[DECART] output saved');
      logger.info(`[DECART] Result saved locally at: ${relativeUrl} (${finalImageBuffer.length} bytes)`);

      return {
        jobId: `decart_${Date.now()}`,
        status: 'COMPLETED',
        resultUrl: relativeUrl,
      };
    } catch (error: any) {
      const errMsg = error.message || 'Decart Lucy Virtual Try-On 3.5 execution failed';
      logger.error(`[DECART] Error: ${errMsg}`);
      throw new Error(`Decart Lucy Virtual Try-On failed: ${errMsg}`);
    } finally {
      // Clean up temporary files
      if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
      if (fs.existsSync(tempOutRawPath)) fs.unlinkSync(tempOutRawPath);
      if (fs.existsSync(tempOutFramePath)) fs.unlinkSync(tempOutFramePath);
    }
  }
}

export const decartVtonService = new DecartVtonService();
