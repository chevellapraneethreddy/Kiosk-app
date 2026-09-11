import os from 'os';
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
 * Returns the public LAN URL for the frontend application (Vite on port 5173).
 * Phone devices scanning QR codes will access this exact URL.
 */
export function getPublicFrontendUrl(): string {
  if (config.PUBLIC_BASE_URL && !config.PUBLIC_BASE_URL.includes('localhost') && !config.PUBLIC_BASE_URL.includes('127.0.0.1')) {
    return config.PUBLIC_BASE_URL.replace(/\/$/, '');
  }

  const localIp = getLocalIpAddress();
  const rawFrontend = config.FRONTEND_URL || 'http://localhost:5173';
  let port = '5173';
  try {
    const parsed = new URL(rawFrontend);
    if (parsed.port) port = parsed.port;
  } catch {}

  return `http://${localIp}:${port}`;
}
