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
    const uploadsDir = storageService.getStorageDir('uploads');
    const destPath = path.join(uploadsDir, filename);

    // Optimize and write directly to uploads directory in a single pass
    await processAndOptimizeImage(originalPath, destPath, { maxWidth: 1920, quality: 86 });

    // Clean up temporary multer upload file
    if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);

    const relativeUrl = `/uploads/${filename}`;

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
