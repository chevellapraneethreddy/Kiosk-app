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
 * Returns the public URL for the frontend application.
 * Dynamically reads the latest .env from disk so newly generated SSH tunnel URLs
 * take effect immediately without requiring a server reboot.
 */
export function getPublicFrontendUrl(): string {
  try {
    const rootEnvPath = path.resolve(__dirname, '../../../.env');
    if (fs.existsSync(rootEnvPath)) {
      const content = fs.readFileSync(rootEnvPath, 'utf-8');
      const match = content.match(/^PUBLIC_BASE_URL=(.+)$/m);
      if (match && match[1]) {
        const liveTunnelUrl = match[1].trim().replace(/\/$/, '');
        if (
          liveTunnelUrl &&
          !liveTunnelUrl.includes('localhost') &&
          !liveTunnelUrl.includes('127.0.0.1')
        ) {
          return liveTunnelUrl;
        }
      }
    }
  } catch (err: any) {
    logger.warn(`[ipHelper] Failed to read dynamic .env: ${err?.message}`);
  }

  if (
    config.PUBLIC_BASE_URL &&
    !config.PUBLIC_BASE_URL.includes('localhost') &&
    !config.PUBLIC_BASE_URL.includes('127.0.0.1')
  ) {
    return config.PUBLIC_BASE_URL.replace(/\/$/, '');
  }

  return getLocalFrontendUrl();
}

