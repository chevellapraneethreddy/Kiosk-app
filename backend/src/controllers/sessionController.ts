import { Request, Response } from 'express';
import { prisma } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { generateQrDataUrl } from '../services/qrService';
import { config } from '../config';
import { getLocalIpAddress, getPublicFrontendUrl } from '../utils/ipHelper';
import { logger } from '../utils/logger';

export async function createSession(req: Request, res: Response) {
  try {
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + (config.QR_EXPIRATION_MINUTES || 60) * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        sessionToken,
        status: 'ACTIVE',
        expiresAt,
      },
    });

    // Resolve public frontend URL on LAN (port 5173) for phone QR scanning
    const frontendBaseUrl = getPublicFrontendUrl();
    const mobileUploadUrl = `${frontendBaseUrl}/mobile-upload/${sessionToken}`;
    const qrDataUrl = await generateQrDataUrl(mobileUploadUrl);

    logger.info(`[QR DEBUG] Upload Session Created: ${session.id}`);
    logger.info(`[QR DEBUG] Laptop LAN IP: ${getLocalIpAddress()}`);
    logger.info(`[QR DEBUG] Frontend LAN URL: ${frontendBaseUrl}`);
    logger.info(`[QR DEBUG] Mobile Upload URL: ${mobileUploadUrl}`);
    logger.info(`[QR DEBUG] Encoded QR URL: ${mobileUploadUrl}`);

    res.json({
      session,
      mobileUploadUrl,
      qrDataUrl,
    });
  } catch (error: any) {
    logger.error('[QR DEBUG] Error creating session QR:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export async function getSession(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
