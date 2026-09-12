import { createDecartClient, models } from '@decartai/sdk';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { execFileSync } from 'child_process';
import { config } from '../config';
import { logger } from '../utils/logger';
import { storageService } from './storageService';
import { garmentExtractionService, ExtractedGarmentResult } from './ai/GarmentExtractionService';

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
  onProgress?: (progress: number, message: string) => void;
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
    logger.info(`[DECART] processTryOn started for generation ${input.generationId}`);

    if (!this.apiKey) {
      const err = 'DECART_API_KEY is not configured in environment variables';
      logger.error(`[DECART] ${err}`);
      throw new Error(err);
    }

    if (!fs.existsSync(input.userImagePath)) {
      const err = `Person image not found at path: ${input.userImagePath}`;
      logger.error(`[DECART] ${err}`);
      throw new Error(err);
    }

    let finalGarmentPath = input.garmentImagePath;
    let autoPrompt = input.prompt;
    let garmentBbox = { ymin: 350, xmin: 250, ymax: 950, xmax: 750 };

    // 1. If garment image is not explicitly separate from person photo, extract pure fabric
    if (
      !finalGarmentPath ||
      !fs.existsSync(finalGarmentPath) ||
      path.resolve(finalGarmentPath) === path.resolve(input.userImagePath)
    ) {
      logger.info('[DECART] Extracting held garment from captured camera photo...');
      if (input.onProgress) input.onProgress(20, 'Detecting and preparing your garment...');
      const garmentInfo: ExtractedGarmentResult = await garmentExtractionService.extractGarmentInfo(
        input.userImagePath
      );
      finalGarmentPath = path.resolve(__dirname, '../../..', garmentInfo.garmentPath.replace(/^\//, ''));
      if (!autoPrompt) {
        autoPrompt = garmentInfo.recommendedPrompt;
      }
      if (garmentInfo.bbox) {
        garmentBbox = garmentInfo.bbox;
      }
    }

    if (!fs.existsSync(finalGarmentPath)) {
      const err = `Garment image not found at path: ${finalGarmentPath}`;
      logger.error(`[DECART] ${err}`);
      throw new Error(err);
    }

    const promptToUse =
      autoPrompt ||
      'Fashion mirror portrait of the exact same person standing naturally in the room wearing the reference garment. Both arms hanging straight down naturally beside the body with empty hands resting at hips. No hands or folded cloth in front of chest. Complete face, hair, and head fully visible and sharp. Authentic room environment preserved.';

    logger.info(`[DECART] Virtual try-on prompt: ${promptToUse}`);

    const tempDir = path.resolve(__dirname, '../../../uploads');
    const timestamp = Date.now();
    const tempOutPath = path.join(tempDir, `temp_decart_${input.generationId}_${timestamp}.jpg`);

    try {
      if (input.onProgress) input.onProgress(35, 'Preparing AI fashion transformation...');

      const originalPersonBuffer = fs.readFileSync(input.userImagePath);
      const personMeta = await sharp(originalPersonBuffer).metadata();
      const pWidth = personMeta.width || 1280;
      const pHeight = personMeta.height || 720;

      // STEP 1: Pre-condition held cloth with soft feathered elliptical mask (STRICTLY below chin/face)
      logger.info('[DECART] Pre-conditioning person frame: soft feathered infill strictly below chin...');
      const bLeft = Math.max(0, Math.floor((garmentBbox.xmin / 1000) * pWidth));
      const bWidth = Math.min(pWidth - bLeft, Math.floor(((garmentBbox.xmax - garmentBbox.xmin) / 1000) * pWidth));

      // CRITICAL: Face & Chin Protection. Safe top is strictly at or below 50% of the image (never cover chin/beard/mouth)
      const minSafeTorsoTop = Math.floor(pHeight * 0.50);
      const rawBTop = Math.floor((garmentBbox.ymin / 1000) * pHeight);
      const safeTop = Math.max(minSafeTorsoTop, rawBTop);
      const safeHeight = Math.max(40, Math.min(pHeight - safeTop, Math.floor(((garmentBbox.ymax - garmentBbox.ymin) / 1000) * pHeight)));
      const safeWidth = Math.max(40, bWidth);

      // Sample clothing/torso tone from lower chest
      let torsoColor = { r: 150, g: 155, b: 160, alpha: 1 };
      try {
        const sampleX = Math.max(0, Math.floor(pWidth * 0.25));
        const sampleY = Math.min(pHeight - 25, safeTop + Math.floor(safeHeight * 0.4));
        const sample = await sharp(originalPersonBuffer)
          .extract({ left: sampleX, top: sampleY, width: 20, height: 20 })
          .stats();
        const [r, g, b] = sample.channels.map((c) => Math.round(c.mean));
        torsoColor = { r, g, b, alpha: 1 };
      } catch {}

      // Elliptical feathered gradient mask: eliminates hard box borders so Decart never creates seams or picture-in-picture windows
      const maskSvg = `
        <svg width="${safeWidth}" height="${safeHeight}">
          <defs>
            <radialGradient id="infillGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="white" stop-opacity="1" />
              <stop offset="65%" stop-color="white" stop-opacity="0.85" />
              <stop offset="100%" stop-color="white" stop-opacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="${safeWidth / 2}" cy="${safeHeight / 2}" rx="${safeWidth / 2}" ry="${safeHeight / 2}" fill="url(#infillGrad)" />
        </svg>
      `;
      const maskBuffer = Buffer.from(maskSvg);

      const softOverlay = await sharp({
        create: {
          width: safeWidth,
          height: safeHeight,
          channels: 4,
          background: torsoColor,
        },
      })
        .composite([{ input: maskBuffer, blend: 'dest-in' }])
        .png()
        .toBuffer();

      const infilledPersonBuffer = await sharp(originalPersonBuffer)
        .composite([
          {
            input: softOverlay,
            left: bLeft,
            top: safeTop,
          },
        ])
        .toBuffer();

      // STEP 2: Condition aspect ratio and top headroom so Decart 720p never cuts off head/hair/glasses
      const isPortrait = pHeight > pWidth;
      let preparedPersonBuffer: Buffer;
      let sidePad = 0;

      // Sample wall color from upper edge
      let wallColor = { r: 235, g: 233, b: 220, alpha: 1 };
      try {
        const wallSample = await sharp(originalPersonBuffer)
          .extract({ left: Math.floor(pWidth * 0.85), top: 10, width: 20, height: 20 })
          .stats();
        const [wr, wg, wb] = wallSample.channels.map((c) => Math.round(c.mean));
        wallColor = { r: wr, g: wg, b: wb, alpha: 1 };
      } catch {}

      if (isPortrait) {
        // Vertical portrait photo (e.g. mobile upload or standee 9:16 portrait)
        preparedPersonBuffer = await sharp(infilledPersonBuffer)
          .resize(720, 1280, { fit: 'cover', position: 'top' })
          .jpeg({ quality: 95 })
          .toBuffer();
      } else {
        // Landscape or square photo (e.g. webcam 16:9 or 4:3)
        const topHeadroom = 140;
        const bottomPad = 60;
        const newHeight = pHeight + topHeadroom + bottomPad;
        const target16x9Width = Math.round(newHeight * (16 / 9));
        sidePad = Math.max(0, Math.round((target16x9Width - pWidth) / 2));

        preparedPersonBuffer = await sharp(infilledPersonBuffer)
          .extend({
            top: topHeadroom,
            bottom: bottomPad,
            left: sidePad,
            right: sidePad,
            background: wallColor,
          })
          .resize(1280, 720, { fit: 'cover', position: 'top' })
          .jpeg({ quality: 95 })
          .toBuffer();
      }

      // Ensure garment buffer is clean high-quality JPEG
      const garmentBuffer = await sharp(finalGarmentPath).jpeg({ quality: 95 }).toBuffer();

      // Step 3: Execute Decart Lucy AI engine
      logger.info(`[DECART] Submitting try-on job to Decart Lucy AI engine...`);
      if (input.onProgress) input.onProgress(45, 'Synthesizing tailored garment drape...');

      const decartImageModel = models.image('lucy-image-2');
      const job = await (this.client.queue.submit as any)({
        model: decartImageModel,
        data: new Blob([new Uint8Array(preparedPersonBuffer)], { type: 'image/jpeg' }),
        reference_image: new Blob([new Uint8Array(garmentBuffer)], { type: 'image/jpeg' }),
        prompt: promptToUse,
        resolution: '720p',
        enhance_prompt: false,
      });

      logger.info(`[DECART] Decart Job ID: ${job.job_id}`);

      // Step 4: Poll status with exponential backoff & transient network error handling
      const startTime = Date.now();
      const MAX_POLL_TIME_MS = 90000;
      const POLL_INTERVAL_MS = 2500;
      let consecutiveErrors = 0;
      let completed = false;

      while (Date.now() - startTime < MAX_POLL_TIME_MS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const elapsedSec = Math.round((Date.now() - startTime) / 1000);

        try {
          const status = await this.client.queue.status(job.job_id);
          consecutiveErrors = 0;

          logger.info(`[DECART] Job ${job.job_id} status: ${status.status} (${elapsedSec}s elapsed)`);

          if (input.onProgress) {
            const progressPercent = Math.min(85, 45 + Math.round(elapsedSec * 4));
            input.onProgress(progressPercent, `Transforming your outfit with AI (${status.status})...`);
          }

          if (status.status === 'completed') {
            completed = true;
            break;
          }

          if (status.status === 'failed') {
            const failureReason = (status as any).error || 'Server processing returned failed status';
            logger.error(`[DECART] Job ${job.job_id} failed: ${failureReason}`);
            throw new Error(`Decart Virtual Try-On failed: ${failureReason}`);
          }
        } catch (err: any) {
          const errMsg = err.message || '';
          const isTransient =
            errMsg.includes('504') ||
            errMsg.includes('Gateway Timeout') ||
            errMsg.includes('502') ||
            errMsg.includes('503') ||
            errMsg.includes('524') ||
            errMsg.includes('ECONNRESET') ||
            errMsg.includes('ETIMEDOUT') ||
            errMsg.includes('fetch failed');

          if (isTransient) {
            consecutiveErrors++;
            logger.warn(
              `[DECART] Transient network retry for job ${job.job_id} (${errMsg}, attempt ${consecutiveErrors}/10)...`
            );
            if (consecutiveErrors >= 10) {
              throw new Error(`Decart API Gateway Timeout after retries: ${errMsg}`);
            }
          } else {
            throw err;
          }
        }
      }

      if (!completed) {
        throw new Error(`Decart Virtual Try-On timed out after ${Math.round(MAX_POLL_TIME_MS / 1000)}s`);
      }

      if (input.onProgress) input.onProgress(88, 'Downloading high-resolution AI result...');
      logger.info(`[DECART] Job ${job.job_id} completed! Fetching transformed result...`);

      // Retrieve binary content
      let resultBlob: Blob | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          resultBlob = await this.client.queue.result(job.job_id);
          break;
        } catch (downloadErr: any) {
          logger.warn(`[DECART] Result download attempt ${attempt} failed: ${downloadErr.message}`);
          if (attempt === 3) throw downloadErr;
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      if (!resultBlob) {
        throw new Error('Decart Virtual Try-On result download returned empty content');
      }

      const rawBuffer = Buffer.from(await resultBlob.arrayBuffer());

      // Check if output is MP4 video or Image
      const isMp4 = rawBuffer.length > 12 && rawBuffer.slice(4, 8).toString() === 'ftyp';
      let downloadedImageBuffer: Buffer;

      if (isMp4 && ffmpegPath) {
        fs.writeFileSync(tempOutPath + '.mp4', rawBuffer);
        execFileSync(
          ffmpegPath,
          ['-y', '-ss', '00:00:01', '-i', tempOutPath + '.mp4', '-vframes', '1', '-q:v', '2', tempOutPath],
          { stdio: 'ignore' }
        );
        downloadedImageBuffer = fs.readFileSync(tempOutPath);
        if (fs.existsSync(tempOutPath + '.mp4')) fs.unlinkSync(tempOutPath + '.mp4');
      } else {
        downloadedImageBuffer = rawBuffer;
      }

      // Verification: ensure valid output
      if (!downloadedImageBuffer || downloadedImageBuffer.length < 5000) {
        throw new Error('Decart Virtual Try-On returned an empty or corrupt image');
      }

      const inputBuffer = fs.readFileSync(input.userImagePath);
      if (downloadedImageBuffer.equals(inputBuffer)) {
        logger.error('[DECART] Error: Decart output is identical to input image');
        throw new Error('Virtual try-on output was identical to original input image');
      }

      // Crop back the central person region cleanly to eliminate edge border padding
      let finalImageBuffer: Buffer;
      if (sidePad > 40) {
        const cropW = Math.min(1280, 1280 - Math.floor(sidePad * 0.4));
        const cropLeft = Math.floor((1280 - cropW) / 2);
        finalImageBuffer = await sharp(downloadedImageBuffer)
          .extract({ left: cropLeft, top: 0, width: cropW, height: 720 })
          .resize(1280, 720, { fit: 'cover' })
          .jpeg({ quality: 95 })
          .toBuffer();
      } else {
        finalImageBuffer = downloadedImageBuffer;
      }

      if (input.onProgress) input.onProgress(95, 'Finalizing your look for display and download...');

      const targetFilename = `generated_${input.generationId}.jpg`;
      const relativeUrl = await storageService.saveFile(finalImageBuffer, targetFilename, 'generated');

      logger.info(`[DECART] Output successfully saved at: ${relativeUrl} (${finalImageBuffer.length} bytes)`);

      return {
        jobId: job.job_id,
        status: 'COMPLETED',
        resultUrl: relativeUrl,
      };
    } catch (error: any) {
      const errMsg = error.message || 'Decart Virtual Try-On execution failed';
      logger.error(`[DECART] Execution Error: ${errMsg}`);
      throw new Error(`Decart Virtual Try-On failed: ${errMsg}`);
    } finally {
      if (fs.existsSync(tempOutPath)) fs.unlinkSync(tempOutPath);
    }
  }
}

export const decartVtonService = new DecartVtonService();
