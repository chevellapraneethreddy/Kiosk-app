import { Request, Response } from 'express';
import { prisma } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { getAIProvider } from '../services/ai';
import { garmentExtractionService } from '../services/ai/GarmentExtractionService';
import { config } from '../config';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

export async function createGeneration(req: Request, res: Response) {
  let generationId: string | null = null;
  try {
    const { sessionId, experienceId, styleId, originalImagePath, category, customPrompt } = req.body;

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

    // 1. Extract held garment automatically from captured camera photo
    logger.info('[DECART] Invoking garment extraction on captured camera photo...');
    const extractedGarmentRelativePath = await garmentExtractionService.extractGarment(fullUserImgPath);
    const fullGarmentPath = path.resolve(__dirname, '../../..', extractedGarmentRelativePath.replace(/^\//, ''));

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
      garmentImagePath: extractedGarmentRelativePath,
      provider: 'decart',
      status: 'PENDING',
      progress: 10,
      expiresAt,
    };
    if (validSessionId) generationData.sessionId = validSessionId;
    if (validExperienceId) generationData.experienceId = validExperienceId;
    if (validStyleId) generationData.styleId = validStyleId;

    const generation = await prisma.generation.create({
      data: generationData,
    });

    generationId = generation.id;

    // Trigger Decart Lucy Virtual Try-On 3.5 Provider
    const aiProvider = getAIProvider();
    const promptToUse =
      customPrompt ||
      'Substitute the current clothing with the reference garment, wearing the garment naturally, dressed in the garment, perfect fit, full body dress, photo realistic';

    logger.info(`Starting Decart Lucy VTON 3.5 generation for ID: ${generation.id}...`);

    const aiOutput = await aiProvider.generateImage({
      generationId: generation.id,
      userImagePath: fullUserImgPath,
      prompt: promptToUse,
      styleName: 'Physical Garment Try-On',
      styleCategory: category || 'tops',
      options: {
        garmentImagePath: fullGarmentPath,
        category: category || 'tops',
      },
    });

    if (!aiOutput.resultUrl || aiOutput.resultUrl === originalImagePath) {
      logger.error('[DECART] Error: Generated try-on image URL is missing or identical to input camera image.');
      throw new Error('Virtual try-on output was identical to original input image');
    }

    // Update generation record in database with Decart result
    const updatedGen = await prisma.generation.update({
      where: { id: generation.id },
      data: {
        providerJobId: aiOutput.jobId,
        status: aiOutput.status,
        progress: aiOutput.progress || 100,
        generatedImagePath: aiOutput.resultUrl || null,
        completedAt: new Date(),
      },
    });

    res.json(updatedGen);
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
