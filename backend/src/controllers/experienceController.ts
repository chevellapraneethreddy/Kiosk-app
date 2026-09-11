import { Request, Response } from 'express';
import { prisma } from '../db';

export async function getExperiences(req: Request, res: Response) {
  try {
    const experiences = await prisma.experience.findMany({
      where: { enabled: true },
      include: {
        styles: {
          where: { enabled: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    res.json(experiences);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
