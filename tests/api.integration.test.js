/**
 * Live API integration tests — all public endpoints and main scenarios.
 *
 *   RUN_API_INTEGRATION=1 npm test -- tests/api.integration.test.js
 *   npm run test:api:integration
 *
 * Uses API_BASE_URL (default: staging DO app) and .env.staging for Supabase admin login.
 * Does not import src/server.js (no supertest mocks).
 */
import {
  describe, it, expect, beforeAll, afterAll,
} from 'vitest';
import {
  integrationEnabled,
  loadIntegrationEnv,
  baseUrl,
} from './integration/env.js';
import {
  apiFetch,
  apiFetchRetryGateway,
  createEphemeralUser,
  login,
  authHeaders,
  uploadSampleToCloudflare,
} from './integration/client.js';

if (integrationEnabled) {
  loadIntegrationEnv();
}

describe.skipIf(!integrationEnabled)('API integration (live server)', () => {
  let primaryUser;
  let primaryToken;
  let primaryRefresh;
  let primaryUserId;
  let secondaryUser;
  let secondaryToken;
  let createdAdId;
  let cloudflareImageId;

  beforeAll(async () => {
    primaryUser = await createEphemeralUser();
    const session = await login(primaryUser.email, primaryUser.password);
    primaryToken = session.access_token;
    primaryRefresh = session.refresh_token;

    const me = await apiFetch('/api/v1/auth/me', { headers: authHeaders(primaryToken) });
    primaryUserId = me.body.user.id;

    secondaryUser = await createEphemeralUser();
    const session2 = await login(secondaryUser.email, secondaryUser.password);
    secondaryToken = session2.access_token;
  }, 60_000);

  afterAll(async () => {
    if (createdAdId && primaryToken) {
      await apiFetch(`/api/v1/instruments/deleteinstrumentAds/${createdAdId}`, {
        method: 'DELETE',
        headers: authHeaders(primaryToken),
      });
    }
  });

  describe('root and health', () => {
    it('GET / returns root message', async () => {
      const res = await apiFetch('/');
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('root API endpoint');
    });

    it('GET /health returns liveness', async () => {
      const res = await apiFetch('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET /health/database reports database state', async () => {
      const res = await apiFetch('/health/database');
      expect([200, 503]).toContain(res.status);
      expect(res.body.database).toBeDefined();
    });

    it('GET /api/v1/unknown returns 404', async () => {
      const res = await apiFetch('/api/v1/unknown');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Route not found');
    });
  });

  describe('auth — validation and public routes', () => {
    it('POST /api/v1/auth/signup returns 400 for invalid email', async () => {
      const res = await apiFetch('/api/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: 'not-an-email', password: 'password123' }),
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/auth/signup returns 201, 503 redirect error, or 504 gateway timeout', async () => {
      const email = `signup-${Date.now()}@example.com`;
      const res = await apiFetchRetryGateway('/api/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: 'password123',
          firstName: 'Sign',
          lastName: 'Up',
        }),
      });
      expect([201, 503, 504]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body.user?.email).toBe(email);
      } else if (res.status === 503) {
        expect(res.body.success).toBe(false);
        expect(String(res.body.error)).toMatch(/redirect/i);
      } else {
        // DO App Platform gateway timeout before Supabase signup completes
        expect(typeof res.body === 'string' ? res.body : '').toMatch(/html/i);
      }
    }, 30_000);

    it('POST /api/v1/auth/activation/resend returns 400 for invalid email', async () => {
      const res = await apiFetch('/api/v1/auth/activation/resend', {
        method: 'POST',
        body: JSON.stringify({ email: 'bad' }),
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/auth/activation/resend returns 200', async () => {
      const res = await apiFetch('/api/v1/auth/activation/resend', {
        method: 'POST',
        body: JSON.stringify({ email: primaryUser.email }),
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/auth/login returns 400 for invalid payload', async () => {
      const res = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'bad-email', password: 'short' }),
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/auth/login returns 401 for wrong password', async () => {
      const res = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: primaryUser.email,
          password: 'WrongPassword123!',
        }),
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/auth/refresh returns 400 when refresh_token missing', async () => {
      const res = await apiFetch('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/refresh_token is required/i);
    });

    it('POST /api/v1/auth/logout returns 200', async () => {
      const res = await apiFetch('/api/v1/auth/logout', { method: 'POST' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/auth/password/recovery returns 400 for invalid email', async () => {
      const res = await apiFetch('/api/v1/auth/password/recovery', {
        method: 'POST',
        body: JSON.stringify({ email: 'bad' }),
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/auth/password/recovery returns 200', async () => {
      const res = await apiFetch('/api/v1/auth/password/recovery', {
        method: 'POST',
        body: JSON.stringify({ email: primaryUser.email }),
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/auth/password/update returns 400 without recovery session', async () => {
      const res = await apiFetch('/api/v1/auth/password/update', {
        method: 'POST',
        body: JSON.stringify({ password: 'ValidPassword123!' }),
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('auth — protected', () => {
    it('GET /api/v1/auth/me returns 401 without token', async () => {
      const res = await apiFetch('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/auth/me returns authenticated user', async () => {
      const res = await apiFetch('/api/v1/auth/me', {
        headers: authHeaders(primaryToken),
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.id).toBe(primaryUserId);
    });

    it('GET /api/v1/auth/verify confirms token', async () => {
      const res = await apiFetch('/api/v1/auth/verify', {
        headers: authHeaders(primaryToken),
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/verified/i);
    });

    it('POST /api/v1/auth/verify confirms token', async () => {
      const res = await apiFetch('/api/v1/auth/verify', {
        method: 'POST',
        headers: authHeaders(primaryToken),
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/auth/refresh returns new session', async () => {
      const res = await apiFetch('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: primaryRefresh }),
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.session?.access_token).toBeTruthy();
    });
  });

  describe('instruments — authorization', () => {
    it('GET /api/v1/instruments/getinstrumentMakes returns 401 without token', async () => {
      const res = await apiFetch('/api/v1/instruments/getinstrumentMakes');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Authorization header is missing/i);
    });
  });

  describe('instruments — marketplace CRUD', () => {
    it('GET /api/v1/instruments/getinstrumentMakes returns makes list', async () => {
      const res = await apiFetch('/api/v1/instruments/getinstrumentMakes', {
        headers: authHeaders(primaryToken),
      });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/instruments/getinstrumentAds returns ads', async () => {
      const res = await apiFetch(
        '/api/v1/instruments/getinstrumentAds?type=guitar&make_id=1&condition=good',
        { headers: authHeaders(primaryToken) },
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/v1/instruments/getinstrumentAdsbyUser/:id returns user ads', async () => {
      const res = await apiFetch(
        `/api/v1/instruments/getinstrumentAdsbyUser/${primaryUserId}`,
        { headers: authHeaders(primaryToken) },
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/v1/instruments/createinstrumentAds returns 400 when required fields missing', async () => {
      const res = await apiFetch('/api/v1/instruments/createinstrumentAds', {
        method: 'POST',
        headers: authHeaders(primaryToken),
        body: JSON.stringify({ name: 'Only name' }),
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/v1/instruments/createinstrumentAds returns 400 when make_id not found', async () => {
      const res = await apiFetch('/api/v1/instruments/createinstrumentAds', {
        method: 'POST',
        headers: authHeaders(primaryToken),
        body: JSON.stringify({
          make_id: 999999,
          name: 'Test',
          description: 'Test ad',
          price: 100,
          condition: 'good',
        }),
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MAKE_NOT_FOUND');
    });

    it('POST /api/v1/instruments/createinstrumentAds creates an ad', async () => {
      const res = await apiFetch('/api/v1/instruments/createinstrumentAds', {
        method: 'POST',
        headers: authHeaders(primaryToken),
        body: JSON.stringify({
          make_id: 1,
          name: `Integration ad ${Date.now()}`,
          description: 'Created by api.integration.test.js',
          price: 199,
          condition: 'good',
        }),
      });
      expect(res.status).toBe(201);
      expect(res.body.data?.id).toBeDefined();
      createdAdId = res.body.data.id;
    });

    it('PUT /api/v1/instruments/updateinstrumentAds/:id updates owned ad', async () => {
      expect(createdAdId).toBeDefined();
      const res = await apiFetch(
        `/api/v1/instruments/updateinstrumentAds/${createdAdId}`,
        {
          method: 'PUT',
          headers: authHeaders(primaryToken),
          body: JSON.stringify({
            description: 'Updated by integration test',
            price: 249,
            condition: 'excellent',
          }),
        },
      );
      expect(res.status).toBe(200);
      expect(res.body.data?.description).toBe('Updated by integration test');
    });

    it('PUT /api/v1/instruments/updateinstrumentAds/:id returns 403 for non-owner', async () => {
      expect(createdAdId).toBeDefined();
      const res = await apiFetch(
        `/api/v1/instruments/updateinstrumentAds/${createdAdId}`,
        {
          method: 'PUT',
          headers: authHeaders(secondaryToken),
          body: JSON.stringify({
            description: 'Hijack attempt',
            price: 1,
            condition: 'good',
          }),
        },
      );
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });
  });

  describe('instruments — images', () => {
    it('POST /api/v1/instruments/images/upload-urls returns 400 for invalid count', async () => {
      const res = await apiFetch('/api/v1/instruments/images/upload-urls', {
        method: 'POST',
        headers: authHeaders(primaryToken),
        body: JSON.stringify({ count: 0 }),
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/v1/instruments/images/upload-urls returns upload URLs', async () => {
      const res = await apiFetch('/api/v1/instruments/images/upload-urls', {
        method: 'POST',
        headers: authHeaders(primaryToken),
        body: JSON.stringify({ count: 1 }),
      });
      expect(res.status).toBe(200);
      expect(res.body.uploadUrls).toHaveLength(1);
      expect(res.body.uploadUrls[0].uploadURL).toMatch(/^https:\/\//);
      expect(res.body.uploadUrls[0].id).toBeTruthy();

      await uploadSampleToCloudflare(res.body.uploadUrls[0].uploadURL);
      cloudflareImageId = res.body.uploadUrls[0].id;
      await new Promise((r) => setTimeout(r, 2000));
    }, 30_000);

    it('PUT /api/v1/instruments/updateinstrumentAds/:id attaches uploaded imageIds', async () => {
      expect(createdAdId).toBeDefined();
      expect(cloudflareImageId).toBeTruthy();

      const res = await apiFetch(
        `/api/v1/instruments/updateinstrumentAds/${createdAdId}`,
        {
          method: 'PUT',
          headers: authHeaders(primaryToken),
          body: JSON.stringify({
            description: 'With image',
            price: 249,
            condition: 'excellent',
            imageIds: [cloudflareImageId],
          }),
        },
      );
      expect(res.status).toBe(200);
      expect(res.body.data?.images?.length).toBeGreaterThanOrEqual(1);
    }, 30_000);

    it('GET /api/v1/instruments/ads/:adId/images lists images with delivery URLs', async () => {
      expect(createdAdId).toBeDefined();
      const res = await apiFetch(
        `/api/v1/instruments/ads/${createdAdId}/images`,
        { headers: authHeaders(primaryToken) },
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].urls?.thumbnail).toMatch(/^https:\/\//);
      expect(res.body[0].urls?.full).toMatch(/^https:\/\//);
    });

    it('GET /api/v1/instruments/ads/:adId/images/can-add reports capacity', async () => {
      expect(createdAdId).toBeDefined();
      const res = await apiFetch(
        `/api/v1/instruments/ads/${createdAdId}/images/can-add?count=1`,
        { headers: authHeaders(primaryToken) },
      );
      expect(res.status).toBe(200);
      expect(typeof res.body.allowed).toBe('boolean');
      expect(res.body.max).toBe(5);
    });

    it('DELETE /api/v1/instruments/ads/:adId/images/:imageId returns 403 for non-owner', async () => {
      expect(createdAdId).toBeDefined();
      expect(cloudflareImageId).toBeTruthy();
      const res = await apiFetch(
        `/api/v1/instruments/ads/${createdAdId}/images/${cloudflareImageId}`,
        { method: 'DELETE', headers: authHeaders(secondaryToken) },
      );
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('DELETE /api/v1/instruments/ads/:adId/images/:imageId removes owned image', async () => {
      expect(createdAdId).toBeDefined();
      expect(cloudflareImageId).toBeTruthy();
      const res = await apiFetch(
        `/api/v1/instruments/ads/${createdAdId}/images/${cloudflareImageId}`,
        { method: 'DELETE', headers: authHeaders(primaryToken) },
      );
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/removed successfully/i);
    });
  });

  describe('instruments — delete ad', () => {
    it('DELETE /api/v1/instruments/deleteinstrumentAds/:id deletes owned ad', async () => {
      expect(createdAdId).toBeDefined();
      const res = await apiFetch(
        `/api/v1/instruments/deleteinstrumentAds/${createdAdId}`,
        { method: 'DELETE', headers: authHeaders(primaryToken) },
      );
      expect(res.status).toBe(200);
      expect(res.body.data?.id).toBe(createdAdId);
      createdAdId = undefined;
    });
  });
});

describe('API integration (skipped)', () => {
  it('documents how to run live integration tests', () => {
    if (integrationEnabled) return;
    expect(process.env.RUN_API_INTEGRATION).not.toBe('1');
  });
});
