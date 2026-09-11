import { Request, Response } from 'express';
import { decartVtonService } from '../services/DecartVtonService';
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
        provider: 'decart',
      });
    }

    const category = req.body.category || 'tops';

    logger.info(`[TRYON Controller] Received POST /api/tryon (Category: ${category})`);

    const result = await decartVtonService.processTryOn({
      generationId: `tryon_${Date.now()}`,
      userImagePath: personImgPath,
      garmentImagePath: garmentImgPath,
      category,
    });

    return res.json({
      success: true,
      resultUrl: result.resultUrl,
      provider: 'decart',
    });
  } catch (error: any) {
    logger.error('[TRYON Controller] Failed:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Decart Virtual Try-On failed',
      provider: 'decart',
    });
  }
}

export async function handleTryOnHealth(req: Request, res: Response) {
  const decartKey = config.DECART_API_KEY || process.env.DECART_API_KEY || '';
  res.json({
    success: true,
    provider: 'decart',
    model: 'lucy-vton-3.5',
    decartKeyConfigured: !!decartKey,
  });
}
