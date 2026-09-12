import os from 'os';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from './logger';

export function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    if (!iface) continue;
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal && alias.address !== '127.0.0.1') {
        return alias.address;
      }
    }
  }
  return '127.0.0.1';
}

/**
 * Returns the direct local Wi-Fi / LAN URL (e.g. http://192.168.1.50:5173).
 * Extremely fast and reliable for any phone on the same Wi-Fi network.
 */
export function getLocalFrontendUrl(): string {
  const localIp = getLocalIpAddress();
  const rawFrontend = config.FRONTEND_URL || 'http://localhost:5173';
  let port = '5173';
  try {
    const parsed = new URL(rawFrontend);
    if (parsed.port) port = parsed.port;
  } catch {}

  return `http://${localIp}:${port}`;
}

/**
 * Helper to test if a given URL is a local or private network address
 */
export function isLocalOrPrivateAddress(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0') ||
    /:\/\/(10\.\d+|192\.168\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+)/.test(url)
  );
}

/**
 * Returns the public Vercel frontend HTTPS URL for QR code generation.
 * Requirements strictly enforced:
 * 1. Uses PUBLIC_BASE_URL (or FRONTEND_URL).
 * 2. In production, guarantees HTTPS.
 * 3. In production, NEVER returns localhost, 127.0.0.1, 10.x.x.x, or 192.168.x.x.
 */
export function getPublicFrontendUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Check process.env and parsed config
  let primaryPublicUrl = (
    process.env.PUBLIC_BASE_URL ||
    config.PUBLIC_BASE_URL ||
    process.env.FRONTEND_URL ||
    config.FRONTEND_URL ||
    ''
  ).trim();

  // Strip trailing slashes
  primaryPublicUrl = primaryPublicUrl.replace(/\/+$/, '');

  // If valid public URL provided (not local/private), format and return
  if (primaryPublicUrl && !isLocalOrPrivateAddress(primaryPublicUrl)) {
    if (isProduction && primaryPublicUrl.startsWith('http://')) {
      primaryPublicUrl = primaryPublicUrl.replace('http://', 'https://');
    }
    return primaryPublicUrl;
  }

  // 2. In local development only: check dynamic .env for SSH tunnels or fall back to local Wi-Fi
  if (!isProduction) {
    try {
      const rootEnvPath = path.resolve(__dirname, '../../../.env');
      if (fs.existsSync(rootEnvPath)) {
        const content = fs.readFileSync(rootEnvPath, 'utf-8');
        const match = content.match(/^PUBLIC_BASE_URL=(.+)$/m);
        if (match && match[1]) {
          const liveTunnelUrl = match[1].trim().replace(/\/+$/, '');
          if (liveTunnelUrl && !isLocalOrPrivateAddress(liveTunnelUrl)) {
            return liveTunnelUrl;
          }
        }
      }
    } catch (err: any) {
      logger.warn(`[ipHelper] Failed to read dynamic .env: ${err?.message}`);
    }

    return getLocalFrontendUrl();
  }

  // 3. Fallback for production if misconfigured: use FRONTEND_URL or log clear alert
  const frontendFallback = (process.env.FRONTEND_URL || config.FRONTEND_URL || '').trim().replace(/\/+$/, '');
  if (frontendFallback && !isLocalOrPrivateAddress(frontendFallback)) {
    return frontendFallback.startsWith('http://')
      ? frontendFallback.replace('http://', 'https://')
      : frontendFallback;
  }

  logger.error('[ipHelper] CRITICAL: PUBLIC_BASE_URL is not configured for production! Please set PUBLIC_BASE_URL in Render environment variables.');
  return 'https://kiosk-app.vercel.app';
}


