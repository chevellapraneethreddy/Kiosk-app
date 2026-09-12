import { Router } from 'express';
import { createSession, getSession } from '../controllers/sessionController';
import { uploadImage } from '../controllers/uploadController';
import { createGeneration, getGeneration, getGenerationStatus } from '../controllers/generationController';
import { getResultByToken } from '../controllers/resultController';
import { getStyles } from '../controllers/styleController';
import { getExperiences } from '../controllers/experienceController';
import { handleMobileUpload, getMobileUploadStatus } from '../controllers/mobileUploadController';
import {
  adminLogin,
  getAdminStats,
  getAdminGenerations,
  createStyle,
  updateStyle,
  deleteStyle,
  triggerManualCleanup,
} from '../controllers/adminController';
import { healthCheck } from '../controllers/healthController';
import { handleTryOn, handleTryOnHealth } from '../controllers/tryonController';
import { uploadMiddleware } from '../middleware/uploadMiddleware';
import { authenticateAdmin } from '../middleware/adminAuth';
import { sseService } from '../services/sseService';

const router = Router();

// Health check endpoints
router.get('/health', healthCheck);
router.get('/tryon/health', handleTryOnHealth);

// Standalone OpenAI Virtual Try-On endpoint
router.post(
  '/tryon',
  uploadMiddleware.fields([
    { name: 'personImage', maxCount: 1 },
    { name: 'garmentImage', maxCount: 1 },
  ]),
  handleTryOn
);

// SSE Subscription endpoint
router.get('/events', (req, res) => {
  const clientId = `sse_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const sessionId = req.query.sessionId as string;
  const generationId = req.query.generationId as string;
  sseService.addClient(clientId, res, sessionId, generationId);
});

// Experiences & Styles
router.get('/experiences', getExperiences);
router.get('/styles', getStyles);

// Sessions
router.post('/sessions', createSession);
router.get('/sessions/:token', getSession);

// Uploads
router.post('/uploads', uploadMiddleware.single('image'), uploadImage);

// Mobile Upload Workflow
router.post('/mobile-upload/:token', uploadMiddleware.single('image'), handleMobileUpload);
router.get('/mobile-upload/:token/status', getMobileUploadStatus);

// Generations
router.post('/generations', createGeneration);
router.get('/generations/:id', getGeneration);
router.get('/generations/:id/status', getGenerationStatus);

// Public Results (QR scan)
router.get('/results/:token', getResultByToken);

// Admin Authentication & Operations
router.post('/admin/login', adminLogin);
router.get('/admin/stats', authenticateAdmin, getAdminStats);
router.get('/admin/generations', authenticateAdmin, getAdminGenerations);
router.post('/admin/styles', authenticateAdmin, createStyle);
router.put('/admin/styles/:id', authenticateAdmin, updateStyle);
router.delete('/admin/styles/:id', authenticateAdmin, deleteStyle);
router.post('/admin/cleanup', authenticateAdmin, triggerManualCleanup);

export default router;
