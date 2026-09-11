import { Request, Response } from 'express';
import { prisma } from '../db';
import { config } from '../config';

export async function healthCheck(req: Request, res: Response) {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
  }

  res.json({
    status: 'ok',
    database: dbStatus,
    aiProvider: config.AI_PROVIDER,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}
