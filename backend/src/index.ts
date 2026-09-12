import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { logger } from './utils/logger';
import apiRouter from './routes/api';
import { errorHandler } from './middleware/errorHandler';
import { startCleanupScheduler } from './services/cleanupService';
import { getLocalIpAddress } from './utils/ipHelper';

export const app = express();

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static file hosting for uploaded photos & generated output images
const uploadsDir = path.resolve(__dirname, '../../uploads');
const generatedDir = path.resolve(__dirname, '../../generated');
const assetsDir = path.resolve(__dirname, '../../frontend/public/assets');

app.use('/uploads', express.static(uploadsDir));
app.use('/generated', express.static(generatedDir));
app.use('/assets', express.static(assetsDir));

// Register API Routes
app.use('/api', apiRouter);

// Serve frontend SPA in production if built
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/uploads') ||
    req.path.startsWith('/generated') ||
    req.path.startsWith('/assets')
  ) {
    return next();
  }
  const indexHtml = path.join(frontendDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  next();
});

// Global Error Handler
app.use(errorHandler);

// Start Server if run directly
if (require.main === module) {
  const PORT = config.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIpAddress();
    const decartConfigured = !!(config.DECART_API_KEY || process.env.DECART_API_KEY);

    logger.info(`=======================================================`);
    logger.info(`✨ AI DIGITAL STANDEE BACKEND SERVER IS RUNNING ✨`);
    logger.info(`- Local URL:          http://localhost:${PORT}`);
    logger.info(`- LAN Wi-Fi URL:      http://${localIp}:${PORT}`);
    logger.info(`- Active AI Provider: DECART (Lucy Virtual Try-On 3.5)`);
    logger.info(`- DECART_API_KEY configured: ${decartConfigured}`);
    logger.info(`- Database URL:       ${config.DATABASE_URL}`);
    logger.info(`=======================================================`);

    // Start periodic image cleanup scheduler
    startCleanupScheduler(15);
  });
}

export default app;
