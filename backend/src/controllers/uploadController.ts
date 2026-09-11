import { Request, Response } from 'express';
import { processAndOptimizeImage } from '../utils/sharpHelper';
import { storageService } from '../services/storageService';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export async function uploadImage(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const originalPath = req.file.path;
    const filename = `upload_${uuidv4()}.jpg`;
    const tempPath = path.join(os.tmpdir(), filename);

    // Optimize image into temporary location outside target uploads directory
    await processAndOptimizeImage(originalPath, tempPath, { maxWidth: 1920, quality: 85 });

    // Save optimized file into storage directory
    const relativeUrl = await storageService.saveFile(tempPath, filename, 'uploads');

    // Clean up temporary processing files safely
    if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    res.json({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      filePath: relativeUrl,
      publicUrl: storageService.getPublicUrl(relativeUrl),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
