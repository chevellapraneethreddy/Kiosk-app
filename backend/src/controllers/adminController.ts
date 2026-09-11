import { Request, Response } from 'express';
import { prisma } from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { runCleanupTask } from '../services/cleanupService';

export async function adminLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email }, config.JWT_SECRET, {
      expiresIn: '24h',
    });

    res.json({
      token,
      admin: { id: admin.id, email: admin.email },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAdminStats(req: Request, res: Response) {
  try {
    const totalGenerations = await prisma.generation.count();
    const successfulGenerations = await prisma.generation.count({ where: { status: 'COMPLETED' } });
    const failedGenerations = await prisma.generation.count({ where: { status: 'FAILED' } });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayGenerations = await prisma.generation.count({
      where: { createdAt: { gte: startOfToday } },
    });

    const topStylesRaw = await prisma.generation.groupBy({
      by: ['styleId'],
      _count: { styleId: true },
      orderBy: { _count: { styleId: 'desc' } },
      take: 5,
    });

    const topStyles = await Promise.all(
      topStylesRaw.map(async item => {
        const style = item.styleId ? await prisma.style.findUnique({ where: { id: item.styleId } }) : null;
        return {
          name: style ? style.name : 'Real Saree/Dress Try-On',
          count: item._count.styleId,
        };
      })
    );

    res.json({
      totalGenerations,
      successfulGenerations,
      failedGenerations,
      todayGenerations,
      topStyles,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAdminGenerations(req: Request, res: Response) {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const where: any = {};
    if (status) where.status = String(status);

    const generations = await prisma.generation.findMany({
      where,
      include: { style: true, experience: true },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    const total = await prisma.generation.count({ where });

    res.json({ generations, total });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function createStyle(req: Request, res: Response) {
  try {
    const { experienceId, name, category, thumbnailUrl, garmentImageUrl, prompt, negativePrompt, order } = req.body;

    const styleData: any = {
      experienceId,
      name,
      category: category || 'General',
      thumbnailUrl: thumbnailUrl || garmentImageUrl || '/assets/sample-pink-saree.jpg',
      garmentImageUrl: garmentImageUrl || thumbnailUrl || '/assets/sample-pink-saree.jpg',
      prompt,
      negativePrompt,
      order: Number(order) || 0,
      enabled: true,
    };
    const style = await prisma.style.create({ data: styleData });

    res.status(201).json(style);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateStyle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = req.body;

    const updated = await prisma.style.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteStyle(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.style.delete({
      where: { id },
    });

    res.json({ message: 'Style deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function triggerManualCleanup(req: Request, res: Response) {
  try {
    const result = await runCleanupTask();
    res.json({ message: 'Cleanup execution finished', ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
