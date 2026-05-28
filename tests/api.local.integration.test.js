/**
 * Optional live checks against a running local server.
 *
 *   npm run dev
 *   RUN_API_INTEGRATION=1 npm test -- tests/api.local.integration.test.js
 *
 * Set API_BASE_URL (default http://localhost:3000) and optional API_TEST_EMAIL /
 * API_TEST_PASSWORD for auth-protected routes.
 */
import { describe, it, expect } from 'vitest';

const runIntegration = process.env.RUN_API_INTEGRATION === '1';
const baseUrl = (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const jsonFetch = async (path, options = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
};

describe.skipIf(!runIntegration)('local API server (RUN_API_INTEGRATION=1)', () => {
  it('GET /health is reachable', async () => {
    const { status, body } = await jsonFetch('/health');

    expect(status).toBe(200);
    expect(body.status).toBe('ok');
  });

  it('GET / returns root payload', async () => {
    const { status, body } = await jsonFetch('/');

    expect(status).toBe(200);
    expect(body.message).toBeTruthy();
  });

  it('GET /health/database reports database state', async () => {
    const { status, body } = await jsonFetch('/health/database');

    expect([200, 503]).toContain(status);
    expect(body.database).toBeDefined();
  });

  it('GET /api/v1/instruments/getinstrumentMakes without token returns 401', async () => {
    const { status, body } = await jsonFetch('/api/v1/instruments/getinstrumentMakes');

    expect(status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('POST /api/v1/auth/login validates credentials when env vars are set', async () => {
    const email = process.env.API_TEST_EMAIL;
    const password = process.env.API_TEST_PASSWORD;

    if (!email || !password) {
      const { status, body } = await jsonFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'bad-email', password: 'short' }),
      });
      expect(status).toBe(400);
      expect(body.success).toBe(false);
      return;
    }

    const { status, body } = await jsonFetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.session?.access_token).toBeTruthy();
  });
});
