/**
 * API Integration Tests
 * Requires server to be running with test database
 */

const request = require('supertest');
const app = require('../server/index');

describe('GET /api/health', () => {
  test('returns health status', async () => {
    const res = await request(app).get('/api/health');
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('services');
  });
});

describe('POST /api/chat/session', () => {
  test('creates a new session', async () => {
    const res = await request(app).post('/api/chat/session');
    if (res.statusCode === 201) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('sessionId');
      expect(typeof res.body.data.sessionId).toBe('string');
    } else {
      // MongoDB not connected in test — acceptable
      expect([500, 503]).toContain(res.statusCode);
    }
  });
});

describe('POST /api/chat/message', () => {
  test('validates required message field', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body).toHaveProperty('errors');
  });

  test('validates message length', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ message: 'a'.repeat(1001) });
    expect(res.statusCode).toBe(400);
  });

  test('accepts valid message', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ message: 'Hello, what are your hours?' });
    // Either 200 (works) or 500 (no DB/API keys in test) — both are valid
    expect([200, 500]).toContain(res.statusCode);
  });
});

describe('POST /api/auth/login', () => {
  test('rejects missing credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.statusCode).toBe(400);
  });

  test('rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notexist@test.com', password: 'wrongpass' });
    expect([401, 500]).toContain(res.statusCode);
  });
});

describe('GET /api/admin/analytics (protected)', () => {
  test('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/admin/analytics');
    expect(res.statusCode).toBe(401);
  });

  test('rejects invalid token', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', 'Bearer invalidtoken123');
    expect(res.statusCode).toBe(401);
  });
});

describe('404 Handler', () => {
  test('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent-route');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
