import { Request, Response } from 'express';
import { prisma } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { openAiVtonService, buildOpenAITryOnPrompt } from '../services/OpenAIVtonService';
import { garmentExtractionService } from '../services/ai/GarmentExtractionService';
import { config } from '../config';
import { sseService } from '../services/sseService';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

export async function createGeneration(req: Request, res: Response) {
  let generationId: string | null = null;
  try {
    const {
      sessionId,
      experienceId,
      styleId,
      originalImagePath,
      garmentImagePath,
      gender,
      category,
      customPrompt,
      force,
    } = req.body;

    if (!originalImagePath) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: originalImagePath',
        provider: 'openai',
      });
    }

    // Resolve absolute path for original user photo (handling full URLs or relative paths)
    let cleanUserImgPath = originalImagePath;
    if (cleanUserImgPath.startsWith('http://') || cleanUserImgPath.startsWith('https://')) {
      try {
        cleanUserImgPath = new URL(cleanUserImgPath).pathname;
      } catch {}
    }
    const fullUserImgPath = path.resolve(__dirname, '../../..', cleanUserImgPath.replace(/^\//, ''));

    if (!fs.existsSync(fullUserImgPath)) {
      return res.status(400).json({
        success: false,
        error: `Original image not found at path: ${originalImagePath}`,
        provider: 'openai',
      });
    }

    // PRE-GENERATION CONFLICT VALIDATION:
    // If the selected category and detected garment type conflict, stop generation immediately!
    if (category) {
      logger.info(`[VALIDATION] Validating garment photo against selected category: ${gender || 'WOMEN'} • ${category}`);
      const validation = await garmentExtractionService.validateGarmentAgainstCategory(
        fullUserImgPath,
        gender,
        category
      );

      if (!validation.valid && validation.conflict && !force) {
        logger.warn(
          `[VALIDATION] Conflict detected! Selected (${gender} • ${category}) vs Detected (${validation.detectedGender} • ${validation.detectedCategory}). Halting generation.`
        );
        return res.status(409).json({
          success: false,
          conflict: true,
          selectedGender: gender,
          selectedCategory: category,
          detectedGender: validation.detectedGender,
          detectedCategory: validation.detectedCategory,
          detectedDescription: validation.detectedDescription,
          message: validation.message,
          error: 'Garment category conflict',
        });
      }
    }

    // 1. Resolve garment image: check if provided or needs automatic extraction
    let finalGarmentRelativePath = garmentImagePath;
    if (finalGarmentRelativePath && (finalGarmentRelativePath.startsWith('http://') || finalGarmentRelativePath.startsWith('https://'))) {
      try {
        finalGarmentRelativePath = new URL(finalGarmentRelativePath).pathname;
      } catch {}
    }
    let fullGarmentPath = finalGarmentRelativePath
      ? path.resolve(__dirname, '../../..', finalGarmentRelativePath.replace(/^\//, ''))
      : null;
    let extractedPrompt: string | undefined = undefined;
    let extractedCategory: string | undefined = category;
    let extractedDescription: string | undefined = undefined;

    if (!fullGarmentPath || !fs.existsSync(fullGarmentPath) || path.resolve(fullGarmentPath) === path.resolve(fullUserImgPath)) {
      logger.info(`[EXTRACTION] Extracting held garment for category: ${category || 'auto'}...`);
      const garmentInfo = await garmentExtractionService.extractGarmentInfo(
        fullUserImgPath,
        category,
        gender
      );
      finalGarmentRelativePath = garmentInfo.garmentPath;
      fullGarmentPath = path.resolve(__dirname, '../../..', finalGarmentRelativePath.replace(/^\//, ''));
      extractedPrompt = garmentInfo.recommendedPrompt;
      extractedCategory = garmentInfo.category;
      extractedDescription = garmentInfo.description;
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

    const effectiveGender = gender || (category === 'Saree' || category === 'Dress' ? 'WOMEN' : 'MEN');
    const effectiveCategory = category || extractedCategory || 'Shirt';

    const generationData: any = {
      publicToken,
      originalImagePath,
      garmentImagePath: finalGarmentRelativePath,
      gender: effectiveGender,
      category: effectiveCategory,
      provider: 'openai',
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

    // Asynchronously process virtual try-on via OpenAI gpt-image-2 in background
    (async () => {
      try {
        logger.info(`[OPENAI] Background try-on started for generation ${generation.id} (${effectiveGender} • ${effectiveCategory})`);

        const aiOutput = await openAiVtonService.processTryOn({
          generationId: generation.id,
          userImagePath: fullUserImgPath,
          garmentImagePath: fullGarmentPath || undefined,
          gender: effectiveGender,
          category: effectiveCategory,
          description: extractedDescription,
          prompt: customPrompt || undefined,
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

        logger.info(`[OPENAI] Background generation ${generation.id} completed successfully`);

        // Notify client via SSE
        sseService.sendEventToGeneration(generation.id, 'generation_complete', {
          generationId: generation.id,
          publicToken: generation.publicToken,
          resultUrl: aiOutput.resultUrl,
          generation: completedGen,
        });
      } catch (bgError: any) {
        logger.error(`[OPENAI] Background generation ${generation.id} failed:`, bgError.message);
        await prisma.generation.update({
          where: { id: generation.id },
          data: {
            status: 'FAILED',
            errorMessage: bgError.message || 'OpenAI Virtual Try-On failed',
          },
        }).catch(() => {});

        sseService.sendEventToGeneration(generation.id, 'generation_failed', {
          generationId: generation.id,
          error: bgError.message || 'OpenAI Virtual Try-On failed',
        });
      }
    })();
  } catch (error: any) {
    logger.error('[OPENAI] Error in createGeneration:', error.message);

    if (generationId) {
      await prisma.generation.update({
        where: { id: generationId },
        data: {
          status: 'FAILED',
          errorMessage: error.message || 'OpenAI Virtual Try-On failed',
        },
      }).catch(() => {});
    }

    res.status(500).json({
      success: false,
      error: 'OpenAI Virtual Try-On failed',
      details: error.message || 'AI Generation failed',
      provider: 'openai',
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
