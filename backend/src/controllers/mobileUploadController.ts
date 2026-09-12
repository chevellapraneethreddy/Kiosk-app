import { Request, Response } from 'express';
import { prisma } from '../db';
import { processAndOptimizeImage } from '../utils/sharpHelper';
import { storageService } from '../services/storageService';
import { sseService } from '../services/sseService';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export async function handleMobileUpload(req: Request, res: Response) {
  try {
    const { token } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
    });

    if (!session || session.status === 'EXPIRED') {
      return res.status(404).json({ error: 'Upload session is invalid or expired' });
    }

    const originalPath = req.file.path;
    const filename = `mobile_${uuidv4()}.jpg`;
    const tempPath = path.join(os.tmpdir(), filename);

    await processAndOptimizeImage(originalPath, tempPath, { maxWidth: 1920, quality: 85 });
    const relativeUrl = await storageService.saveFile(tempPath, filename, 'uploads');

    if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    // Update database session
    await prisma.session.update({
      where: { id: session.id },
      data: {
        uploadedPhotoUrl: relativeUrl,
      },
    });

    // Notify connected Kiosk client via real-time SSE
    sseService.sendEventToSession(session.id, 'mobile_photo_uploaded', {
      sessionToken: token,
      photoUrl: relativeUrl,
    });

    res.json({
      success: true,
      message: 'Photo uploaded successfully!',
      filePath: relativeUrl,
      photoUrl: relativeUrl,
      publicUrl: storageService.getPublicUrl(relativeUrl),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getMobileUploadStatus(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionToken: token,
      status: session.status,
      uploadedPhotoUrl: session.uploadedPhotoUrl,
      hasPhoto: Boolean(session.uploadedPhotoUrl),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
