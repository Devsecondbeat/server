import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/config/supabase.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    verifySupabaseToken: vi.fn().mockResolvedValue(null),
  };
});

import app from '../src/server.js';

describe('protected routes without Bearer token', () => {
  it('GET /api/v1/instruments/getinstrumentMakes returns 401', async () => {
    const res = await request(app).get('/api/v1/instruments/getinstrumentMakes');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Authorization header is missing/);
  });

  it('GET /api/v1/auth/me returns 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
