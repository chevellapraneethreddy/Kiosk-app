import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/db';

describe('AI Digital Standee API Tests', () => {
  beforeAll(async () => {
    // Ensure DB is initialized
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.aiProvider).toBeDefined();
  });

  it('GET /api/experiences should return active experiences list', async () => {
    const res = await request(app).get('/api/experiences');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/styles should return active styles list', async () => {
    const res = await request(app).get('/api/styles');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/sessions should create new session and return QR code URL', async () => {
    const res = await request(app).post('/api/sessions');
    expect(res.status).toBe(200);
    expect(res.body.session).toBeDefined();
    expect(res.body.session.sessionToken).toBeDefined();
    expect(res.body.qrDataUrl).toContain('data:image/png;base64');
  });

  it('POST /api/admin/login with invalid credentials should fail', async () => {
    const res = await request(app).post('/api/admin/login').send({
      email: 'admin@standee.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });
});
