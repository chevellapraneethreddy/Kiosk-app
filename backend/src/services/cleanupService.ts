import { prisma } from '../db';
import { storageService } from './storageService';
import { logger } from '../utils/logger';

export async function runCleanupTask(): Promise<{ deletedCount: number }> {
  try {
    const now = new Date();
    // Find generations whose expiration date has passed
    const expiredGenerations = await prisma.generation.findMany({
      where: {
        expiresAt: {
          lte: now,
        },
        status: {
          not: 'PROCESSING', // Do not delete files currently processing
        },
      },
    });

    let count = 0;
    for (const gen of expiredGenerations) {
      if (gen.originalImagePath) {
        await storageService.deleteFile(gen.originalImagePath);
      }
      if (gen.generatedImagePath) {
        await storageService.deleteFile(gen.generatedImagePath);
      }

      await prisma.generation.delete({
        where: { id: gen.id },
      });
      count++;
    }

    if (count > 0) {
      logger.info(`Cleanup completed. Removed ${count} expired generations & files.`);
    }
    return { deletedCount: count };
  } catch (error) {
    logger.error('Error during cleanup task:', error);
    return { deletedCount: 0 };
  }
}

export function startCleanupScheduler(intervalMinutes: number = 15): void {
  setInterval(async () => {
    await runCleanupTask();
  }, intervalMinutes * 60 * 1000);
  logger.info(`Cleanup scheduler started (running every ${intervalMinutes} minutes).`);
}
