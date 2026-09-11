import { Request, Response } from 'express';
import { prisma } from '../db';

export async function getStyles(req: Request, res: Response) {
  try {
    const { experienceId, category } = req.query;

    const whereClause: any = { enabled: true };
    if (experienceId) whereClause.experienceId = String(experienceId);
    if (category) whereClause.category = String(category);

    const styles = await prisma.style.findMany({
      where: whereClause,
      orderBy: { order: 'asc' },
    });

    res.json(styles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
