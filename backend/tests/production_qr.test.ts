import request from 'supertest';

jest.mock('@decartai/sdk', () => ({
  createDecartClient: jest.fn(() => ({})),
  models: {},
}));

import app from '../src/index';
import { prisma } from '../src/db';
import path from 'path';
import fs from 'fs';

describe('Production QR Code & Cross-Domain End-to-End Tests', () => {
  const originalEnv = { ...process.env };
  const mockVercelDomain = 'https://my-brand-kiosk.vercel.app';

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.PUBLIC_BASE_URL = mockVercelDomain;
    process.env.FRONTEND_URL = mockVercelDomain;
    await prisma.$connect();
  });

  afterAll(async () => {
    process.env = originalEnv;
    await prisma.$disconnect();
  });

  it('1. Mobile Upload QR: should generate clean HTTPS Vercel URL with no localhost or LAN IP', async () => {
    const res = await request(app).post('/api/sessions');
    expect(res.status).toBe(200);

    const { session, mobileUploadUrl, qrDataUrl, lanUploadUrl, lanQrDataUrl } = res.body;

    // Check token
    expect(session.sessionToken).toBeDefined();
    expect(session.sessionToken.length).toBeGreaterThan(10);

    // Format requirement: https://YOUR-VERCEL-DOMAIN/mobile-upload/<token>
    expect(mobileUploadUrl).toBe(`${mockVercelDomain}/mobile-upload/${session.sessionToken}`);

    // Must never contain localhost, 127.0.0.1, or local subnet
    expect(mobileUploadUrl).not.toContain('localhost');
    expect(mobileUploadUrl).not.toContain('127.0.0.1');
    expect(mobileUploadUrl).not.toMatch(/192\.168\.\d+\.\d+/);
    expect(mobileUploadUrl).not.toMatch(/10\.\d+\.\d+\.\d+/);

    // QR must be a valid high-contrast base64 PNG data URL
    expect(qrDataUrl).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/);

    // In production, direct LAN fallbacks must NOT be emitted
    expect(lanUploadUrl).toBeUndefined();
    expect(lanQrDataUrl).toBeUndefined();
  });

  it('2. Mobile Upload Flow: should accept uploaded photo and update session', async () => {
    // Create session
    const sessRes = await request(app).post('/api/sessions');
    const token = sessRes.body.session.sessionToken;

    // Create a real JPEG image buffer using sharp
    const sharp = require('sharp');
    const validImageBuffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 200, g: 150, b: 50 } }
    }).jpeg().toBuffer();

    // Mobile uploads photo
    const uploadRes = await request(app)
      .post(`/api/mobile-upload/${token}`)
      .attach('image', validImageBuffer, 'test_photo.jpg');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.filePath).toMatch(/^\/uploads\/.+/);

    // Verify session updated with uploaded photo
    const checkRes = await request(app).get(`/api/sessions/${token}`);
    expect(checkRes.status).toBe(200);
    expect(checkRes.body.uploadedPhotoUrl).toBe(uploadRes.body.filePath);
  });

  it('3. Result QR: should generate clean HTTPS Vercel URL with no localhost or LAN IP', async () => {
    // Create a dummy completed generation in the database
    const token = 'test-token-' + Date.now();
    const generation = await prisma.generation.create({
      data: {
        publicToken: token,
        originalImagePath: '/uploads/sample_input.jpg',
        generatedImagePath: '/generated/sample_output.jpg',
        provider: 'decart',
        status: 'COMPLETED',
        progress: 100,
      },
    });

    const res = await request(app).get(`/api/results/${token}`);
    expect(res.status).toBe(200);

    const { publicResultUrl, qrDataUrl, lanResultUrl, lanQrDataUrl } = res.body;

    // Format requirement: https://YOUR-VERCEL-DOMAIN/result/<token>
    expect(publicResultUrl).toBe(`${mockVercelDomain}/result/${token}`);

    // Must never contain localhost or private IP
    expect(publicResultUrl).not.toContain('localhost');
    expect(publicResultUrl).not.toContain('127.0.0.1');
    expect(publicResultUrl).not.toMatch(/192\.168\.\d+\.\d+/);
    expect(publicResultUrl).not.toMatch(/10\.\d+\.\d+\.\d+/);

    // QR must be a valid high-contrast base64 PNG data URL
    expect(qrDataUrl).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/);

    // In production, direct LAN fallbacks must NOT be emitted
    expect(lanResultUrl).toBeUndefined();
    expect(lanQrDataUrl).toBeUndefined();

    // Clean up test generation
    await prisma.generation.delete({ where: { id: generation.id } });
  });

  it('4. Static Assets: should return Cross-Origin-Resource-Policy and CORS headers', async () => {
    // Check uploads directory endpoint responds with CORP headers
    const res = await request(app).get('/uploads/');
    // Even on 404/directory listing, the custom setHeaders middleware runs for static assets
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
