import { Request, Response } from 'express';
import { prisma } from '../db';
import { generateQrDataUrl } from '../services/qrService';
import { config } from '../config';
import { getLocalIpAddress, getPublicFrontendUrl } from '../utils/ipHelper';
import { logger } from '../utils/logger';

export async function getResultByToken(req: Request, res: Response) {
  try {
    const { token } = req.params;

    const generation = await prisma.generation.findUnique({
      where: { publicToken: token },
      include: {
        style: true,
        experience: true,
      },
    });

    if (!generation) {
      return res.status(404).json({ error: 'Result not found or invalid QR token' });
    }

    // Check if result has expired
    if (generation.expiresAt && new Date() > generation.expiresAt) {
      return res.status(410).json({ error: 'This AI result image has expired.', expired: true });
    }

    // Resolve public frontend URL on LAN (port 5173) for phone QR scanning
    const frontendBaseUrl = getPublicFrontendUrl();
    const publicResultUrl = `${frontendBaseUrl}/result/${generation.publicToken}`;
    const qrDataUrl = await generateQrDataUrl(publicResultUrl);

    logger.info(`[QR DEBUG] Result Token Requested: ${generation.publicToken}`);
    logger.info(`[QR DEBUG] Laptop LAN IP: ${getLocalIpAddress()}`);
    logger.info(`[QR DEBUG] Frontend LAN URL: ${frontendBaseUrl}`);
    logger.info(`[QR DEBUG] Mobile Result URL: ${publicResultUrl}`);
    logger.info(`[QR DEBUG] Encoded Result QR URL: ${publicResultUrl}`);

    res.json({
      generation,
      publicResultUrl,
      qrDataUrl,
    });
  } catch (error: any) {
    logger.error('[QR DEBUG] Error resolving result QR:', error.message);
    res.status(500).json({ error: error.message });
  }
}
