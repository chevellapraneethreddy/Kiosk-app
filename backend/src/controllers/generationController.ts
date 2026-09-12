import { Request, Response } from 'express';
import { prisma } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { decartVtonService } from '../services/DecartVtonService';
import { garmentExtractionService } from '../services/ai/GarmentExtractionService';
import { config } from '../config';
import { sseService } from '../services/sseService';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

export async function createGeneration(req: Request, res: Response) {
  let generationId: string | null = null;
  try {
    const { sessionId, experienceId, styleId, originalImagePath, garmentImagePath, category, customPrompt } = req.body;

    if (!originalImagePath) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: originalImagePath',
        provider: 'decart',
      });
    }

    // Resolve absolute path for original user photo
    const fullUserImgPath = path.resolve(__dirname, '../../..', originalImagePath.replace(/^\//, ''));

    if (!fs.existsSync(fullUserImgPath)) {
      return res.status(400).json({
        success: false,
        error: `Original image not found at path: ${originalImagePath}`,
        provider: 'decart',
      });
    }

    // 1. Resolve garment image: check if provided or needs automatic extraction
    let finalGarmentRelativePath = garmentImagePath;
    let fullGarmentPath = finalGarmentRelativePath
      ? path.resolve(__dirname, '../../..', finalGarmentRelativePath.replace(/^\//, ''))
      : null;
    let extractedPrompt: string | undefined = undefined;
    let extractedCategory: string | undefined = category;

    if (!fullGarmentPath || !fs.existsSync(fullGarmentPath) || path.resolve(fullGarmentPath) === path.resolve(fullUserImgPath)) {
      logger.info('[DECART] Extracting held garment from captured camera photo...');
      const garmentInfo = await garmentExtractionService.extractGarmentInfo(fullUserImgPath);
      finalGarmentRelativePath = garmentInfo.garmentPath;
      fullGarmentPath = path.resolve(__dirname, '../../..', finalGarmentRelativePath.replace(/^\//, ''));
      extractedPrompt = garmentInfo.recommendedPrompt;
      extractedCategory = garmentInfo.category;
    }

    // Verify relations to prevent Prisma Foreign Key Constraint errors
    let validSessionId: string | null = null;
    if (sessionId) {
      const sessionExists = await prisma.session.findUnique({
        where: { id: sessionId },
      });
      if (sessionExists) {
        validSessionId = sessionExists.id;
      }
    }

    let styleRecord = null;
    let validStyleId: string | null = null;
    if (styleId) {
      styleRecord = await prisma.style.findUnique({
        where: { id: styleId },
      });
      if (styleRecord) {
        validStyleId = styleRecord.id;
      }
    }

    let validExperienceId: string | null = null;
    if (experienceId) {
      const expExists = await prisma.experience.findUnique({
        where: { id: experienceId },
      });
      if (expExists) {
        validExperienceId = expExists.id;
      }
    } else if (styleRecord?.experienceId) {
      validExperienceId = styleRecord.experienceId;
    }

    // Generate secure random public token (16 hex chars)
    const publicToken = uuidv4().replace(/-/g, '').substring(0, 16);
    const expiresAt = new Date(Date.now() + (config.DEFAULT_CLEANUP_HOURS || 24) * 60 * 60 * 1000);

    const generationData: any = {
      publicToken,
      originalImagePath,
      garmentImagePath: finalGarmentRelativePath,
      provider: 'decart',
      status: 'PROCESSING',
      progress: 15,
      expiresAt,
    };
    if (validSessionId) generationData.sessionId = validSessionId;
    if (validExperienceId) generationData.experienceId = validExperienceId;
    if (validStyleId) generationData.styleId = validStyleId;

    const generation = await prisma.generation.create({
      data: generationData,
    });

    generationId = generation.id;

    // Send generation record back to client immediately so UI never hangs
    res.status(201).json(generation);

    // Asynchronously process virtual try-on via Decart Lucy VTON in background
    const promptToUse =
      customPrompt ||
      extractedPrompt ||
      'The exact same person standing in the same room gracefully wearing the exact reference garment. Both arms relaxed and hanging naturally beside the body with empty hands. The folded cloth held in front of the body is completely removed and transformed into the worn outfit. Centered 3/4-body fashion portrait, complete face and head fully visible. Authentic room environment preserved.';

    (async () => {
      try {
        logger.info(`[DECART] Background try-on started for generation ${generation.id}`);

        const aiOutput = await decartVtonService.processTryOn({
          generationId: generation.id,
          userImagePath: fullUserImgPath,
          garmentImagePath: fullGarmentPath || undefined,
          category: category || extractedCategory || 'tops',
          prompt: promptToUse,
          onProgress: async (progress, msg) => {
            await prisma.generation.update({
              where: { id: generation.id },
              data: { progress },
            }).catch(() => {});
            sseService.sendEventToGeneration(generation.id, 'generation_progress', {
              generationId: generation.id,
              progress,
              message: msg,
            });
          },
        });

        if (!aiOutput.resultUrl || aiOutput.resultUrl === originalImagePath) {
          throw new Error('Virtual try-on output was identical to original input image or missing');
        }

        const completedGen = await prisma.generation.update({
          where: { id: generation.id },
          data: {
            providerJobId: aiOutput.jobId,
            status: 'COMPLETED',
            progress: 100,
            generatedImagePath: aiOutput.resultUrl,
            completedAt: new Date(),
          },
        });

        logger.info(`[DECART] Background generation ${generation.id} completed successfully`);

        // Notify client via SSE
        sseService.sendEventToGeneration(generation.id, 'generation_complete', {
          generationId: generation.id,
          publicToken: generation.publicToken,
          resultUrl: aiOutput.resultUrl,
          generation: completedGen,
        });
      } catch (bgError: any) {
        logger.error(`[DECART] Background generation ${generation.id} failed:`, bgError.message);
        await prisma.generation.update({
          where: { id: generation.id },
          data: {
            status: 'FAILED',
            errorMessage: bgError.message || 'Decart Virtual Try-On failed',
          },
        }).catch(() => {});

        sseService.sendEventToGeneration(generation.id, 'generation_failed', {
          generationId: generation.id,
          error: bgError.message || 'Decart Virtual Try-On failed',
        });
      }
    })();
  } catch (error: any) {
    logger.error('[DECART] Error in createGeneration:', error.message);

    if (generationId) {
      await prisma.generation.update({
        where: { id: generationId },
        data: {
          status: 'FAILED',
          errorMessage: error.message || 'Decart Virtual Try-On failed',
        },
      }).catch(() => {});
    }

    res.status(500).json({
      success: false,
      error: 'Decart Virtual Try-On failed',
      details: error.message || 'AI Generation failed',
      provider: 'decart',
      generationId,
    });
  }
}

export async function getGeneration(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const generation = await prisma.generation.findUnique({
      where: { id },
    });

    if (!generation) {
      return res.status(404).json({ error: 'Generation record not found' });
    }

    res.json(generation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getGenerationStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const generation = await prisma.generation.findUnique({
      where: { id },
    });

    if (!generation) {
      return res.status(404).json({ error: 'Generation record not found' });
    }

    res.json(generation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
