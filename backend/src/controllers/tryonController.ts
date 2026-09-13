import { Request, Response } from 'express';
import { openAiVtonService } from '../services/OpenAIVtonService';
import { config } from '../config';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

export async function handleTryOn(req: Request, res: Response) {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let personImgPath = '';
    let garmentImgPath = '';

    if (files?.personImage?.[0]) {
      personImgPath = files.personImage[0].path;
    } else if (req.body.personImagePath) {
      personImgPath = path.resolve(__dirname, '../../..', req.body.personImagePath.replace(/^\//, ''));
    }

    if (files?.garmentImage?.[0]) {
      garmentImgPath = files.garmentImage[0].path;
    } else if (req.body.garmentImagePath) {
      garmentImgPath = path.resolve(__dirname, '../../..', req.body.garmentImagePath.replace(/^\//, ''));
    } else if (personImgPath) {
      garmentImgPath = personImgPath;
    }

    if (!personImgPath || !fs.existsSync(personImgPath)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid personImage file',
        provider: 'openai',
      });
    }

    const category = req.body.category || 'shirt';
    const gender = req.body.gender;

    logger.info(`[TRYON Controller] Received POST /api/tryon (Gender: ${gender || 'AUTO'}, Category: ${category})`);

    const result = await openAiVtonService.processTryOn({
      generationId: `tryon_${Date.now()}`,
      userImagePath: personImgPath,
      garmentImagePath: garmentImgPath,
      category,
      gender,
    });

    return res.json({
      success: true,
      resultUrl: result.resultUrl,
      provider: 'openai',
    });
  } catch (error: any) {
    logger.error('[TRYON Controller] Failed:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'OpenAI Virtual Try-On failed',
      provider: 'openai',
    });
  }
}

export async function handleTryOnHealth(req: Request, res: Response) {
  const openaiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const model = config.OPENAI_IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
  res.json({
    success: true,
    provider: 'openai',
    model,
    openaiKeyConfigured: !!openaiKey,
  });
}
