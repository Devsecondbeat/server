import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';

describe('health routes', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  it('GET /health returns ok without touching the database', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});
