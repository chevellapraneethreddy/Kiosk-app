import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const configSchema = z.object({
  PORT: z.string().default('5000').transform(val => parseInt(val, 10)),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  PUBLIC_BASE_URL: z.string().default('http://localhost:5000'),
  DATABASE_URL: z.string().default('file:./dev.db').transform(val => {
    if (val.startsWith('file:./')) {
      const absDbPath = path.resolve(__dirname, '../../', val.replace('file:./', ''));
      return `file:${absDbPath}`;
    }
    return val;
  }),
  AI_PROVIDER: z.enum(['decart', 'fashn', 'huggingface', 'mock', 'custom', 'gemini', 'replicate', 'openai']).default('decart'),
  DECART_API_KEY: z.string().optional(),
  MOCK_GENERATION_SECONDS: z.string().default('5').transform(val => parseInt(val, 10)),
  HF_TOKEN: z.string().optional(),
  HF_SPACE: z.string().default('fashn-ai/fashn-vton-1.5'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  STORAGE_PROVIDER: z.enum(['local', 's3', 'r2', 'supabase']).default('local'),
  ADMIN_EMAIL: z.string().email().default('admin@standee.com'),
  ADMIN_PASSWORD_HASH: z.string().default('$2b$10$EpRnTzVlqHNP0.fKbXWkDeZtB2t02Tj/l8n0j4mS5v8H/r1P2Q4i2'),
  JWT_SECRET: z.string().default('super-secret-standee-jwt-key-2026'),
  QR_EXPIRATION_MINUTES: z.string().default('60').transform(val => parseInt(val, 10)),
  DEFAULT_CLEANUP_HOURS: z.string().default('24').transform(val => parseInt(val, 10)),
  MAX_UPLOAD_MB: z.string().default('15').transform(val => parseInt(val, 10)),
  KIOSK_MODE: z.string().default('true').transform(val => val === 'true'),
  RESULT_TIMEOUT_SECONDS: z.string().default('60').transform(val => parseInt(val, 10)),
  INACTIVITY_TIMEOUT_SECONDS: z.string().default('120').transform(val => parseInt(val, 10)),
});

export const config = configSchema.parse(process.env);
