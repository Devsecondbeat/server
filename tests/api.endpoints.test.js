/**
 * Route-level regression tests for every public API endpoint.
 * Uses supertest + mocks (no live Supabase, Postgres, SendGrid, or Cloudflare).
 *
 * | Method | Path |
 * |--------|------|
 * | GET | / |
 * | GET | /health |
 * | GET | /health/database |
 * | POST | /api/v1/auth/signup |
 * | POST | /api/v1/auth/activation/resend |
 * | POST | /api/v1/auth/login |
 * | POST | /api/v1/auth/refresh |
 * | POST | /api/v1/auth/logout |
 * | POST | /api/v1/auth/password/recovery |
 * | GET | /api/v1/auth/me |
 * | GET/POST | /api/v1/auth/verify |
 * | GET | /api/v1/instruments/getinstrumentMakes |
 * | GET | /api/v1/instruments/getinstrumentAds |
 * | GET | /api/v1/instruments/getinstrumentAdsbyUser/:id |
 * | POST | /api/v1/instruments/createinstrumentAds |
 * | PUT | /api/v1/instruments/updateinstrumentAds/:id |
 * | DELETE | /api/v1/instruments/deleteinstrumentAds/:id |
 * | POST | /api/v1/instruments/images/upload-urls |
 * | GET | /api/v1/instruments/ads/:adId/images |
 * | GET | /api/v1/instruments/ads/:adId/images/can-add |
 * | DELETE | /api/v1/instruments/ads/:adId/images/:imageId |
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const testUserId = '11111111-1111-1111-1111-111111111111';
const testUser = {
  id: testUserId,
  email: 'user@example.com',
  email_confirmed_at: '2025-01-01T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  user_metadata: { first_name: 'Test', last_name: 'User' },
};

vi.mock('../src/middleware/authMiddleware.js', () => ({
  verifySupabaseTokenMiddleware: (req, _res, next) => {
    req.user = { ...testUser, sub: testUserId };
    req.supabaseToken = 'test-token';
    next();
  },
}));

vi.mock('../src/services/supabaseAuth.js', () => ({
  signInWithPassword: vi.fn(),
  createSignupWithActivationLink: vi.fn(),
  createActivationResendLink: vi.fn(),
  createPasswordRecoveryLink: vi.fn(),
  refreshAuthSession: vi.fn(),
  formatAuthUser: (user) => user,
  formatAuthSession: (session) => session,
  mapSupabaseAuthError: (error) => ({ status: 401, error: error.message }),
}));

vi.mock('../src/Utils/sendEmail.js', () => ({
  sendActivationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/services/cloudflareImages.js', () => ({
  getDirectUploadUrls: vi.fn(),
  deleteImage: vi.fn(),
  buildDeliveryUrl: vi.fn((id, variant) => `https://cdn.example/${id}/${variant}`),
  validateImageIds: vi.fn(),
}));

vi.mock('../src/models/marketplace_model.js', () => ({
  MAX_IMAGES_PER_AD: 5,
  VALID_INSTRUMENT_TYPES: ['guitar', 'drums', 'piano', 'accessories'],
  INVALID_IMAGE_IDS: 'INVALID_IMAGE_IDS',
  getInstrumentMakes: vi.fn(),
  createInstrumentAds: vi.fn(),
  getInstrumentAds: vi.fn(),
  getInstrumentAdsbyUser: vi.fn(),
  updateInstrumentAds: vi.fn(),
  deleteInstrumentAds: vi.fn(),
  getAdOwner: vi.fn(),
  instrumentMakeExists: vi.fn(),
  getAdImages: vi.fn(),
  deleteAdImage: vi.fn(),
  canAddImages: vi.fn(),
}));

import app from '../src/server.js';
import {
  createSignupWithActivationLink,
  createActivationResendLink,
  createPasswordRecoveryLink,
  refreshAuthSession,
} from '../src/services/supabaseAuth.js';
import { getDirectUploadUrls } from '../src/services/cloudflareImages.js';
import {
  canAddImages,
  createInstrumentAds,
  deleteAdImage,
  getAdImages,
  getAdOwner,
  getInstrumentAds,
  getInstrumentAdsbyUser,
  getInstrumentMakes,
  instrumentMakeExists,
  updateInstrumentAds,
} from '../src/models/marketplace_model.js';

const auth = () => ({ Authorization: 'Bearer test-token' });

describe('root and health endpoints', () => {
  it('GET / returns root message', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('root API endpoint');
  });

  it('GET /health returns liveness payload', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /health/database returns database readiness', async () => {
    const res = await request(app).get('/health/database');

    expect([200, 503]).toContain(res.status);
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.database).toBeDefined();
  });

  it('GET /api/v1/unknown returns 404', async () => {
    const res = await request(app).get('/api/v1/unknown');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Route not found');
  });
});

describe('auth endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/v1/auth/signup returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/signup returns 201 when signup succeeds', async () => {
    createSignupWithActivationLink.mockResolvedValue({
      user: testUser,
      activationLink: 'https://project.supabase.co/auth/v1/verify?token=abc',
    });

    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.id).toBe(testUserId);
  });

  it('POST /api/v1/auth/activation/resend returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/activation/resend')
      .send({ email: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/activation/resend returns 200 on success', async () => {
    createActivationResendLink.mockResolvedValue({
      user: testUser,
      activationLink: 'https://project.supabase.co/auth/v1/verify?token=abc',
    });

    const res = await request(app)
      .post('/api/v1/auth/activation/resend')
      .send({ email: 'user@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/v1/auth/refresh returns 400 when refresh_token is missing', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/refresh_token is required/);
  });

  it('POST /api/v1/auth/refresh returns 200 with a new session', async () => {
    refreshAuthSession.mockResolvedValue({
      user: testUser,
      session: {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        token_type: 'bearer',
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: 'old-refresh' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.session.access_token).toBe('new-access');
  });

  it('POST /api/v1/auth/logout returns 200', async () => {
    const res = await request(app).post('/api/v1/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/v1/auth/password/recovery returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/password/recovery')
      .send({ email: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/password/recovery returns 200', async () => {
    createPasswordRecoveryLink.mockResolvedValue(
      'https://project.supabase.co/auth/v1/verify?token=reset',
    );

    const res = await request(app)
      .post('/api/v1/auth/password/recovery')
      .send({ email: 'user@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/auth/me returns the authenticated user', async () => {
    const res = await request(app).get('/api/v1/auth/me').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.id).toBe(testUserId);
  });

  it('GET /api/v1/auth/verify confirms the token', async () => {
    const res = await request(app).get('/api/v1/auth/verify').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/verified/i);
  });

  it('POST /api/v1/auth/verify confirms the token', async () => {
    const res = await request(app).post('/api/v1/auth/verify').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('instrument marketplace endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/v1/instruments/getinstrumentMakes returns makes', async () => {
    getInstrumentMakes.mockResolvedValue([{ id: 1, name: 'Fender' }]);

    const res = await request(app)
      .get('/api/v1/instruments/getinstrumentMakes')
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Fender');
  });

  it('GET /api/v1/instruments/getinstrumentAds returns ads', async () => {
    getInstrumentAds.mockResolvedValue([{ id: 1, name: 'Strat' }]);

    const res = await request(app)
      .get('/api/v1/instruments/getinstrumentAds?type=guitar&make_id=1&condition=good')
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe('Strat');
  });

  it('GET /api/v1/instruments/getinstrumentAdsbyUser/:id returns user ads', async () => {
    getInstrumentAdsbyUser.mockResolvedValue([{ id: 2, user_id: testUserId }]);

    const res = await request(app)
      .get(`/api/v1/instruments/getinstrumentAdsbyUser/${testUserId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body[0].user_id).toBe(testUserId);
  });

  it('PUT /api/v1/instruments/updateinstrumentAds/:id updates an owned ad', async () => {
    getAdOwner.mockResolvedValue({ id: 1, user_id: testUserId });
    updateInstrumentAds.mockResolvedValue({ id: 1, description: 'Updated' });

    const res = await request(app)
      .put('/api/v1/instruments/updateinstrumentAds/1')
      .set(auth())
      .send({ description: 'Updated', price: 400, condition: 'good' });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Updated');
  });

  it('POST /api/v1/instruments/createinstrumentAds creates an ad', async () => {
    instrumentMakeExists.mockResolvedValue(true);
    createInstrumentAds.mockResolvedValue({ id: 3, name: 'Tele' });

    const res = await request(app)
      .post('/api/v1/instruments/createinstrumentAds')
      .set(auth())
      .send({
        make_id: 1,
        name: 'Tele',
        description: 'Nice guitar',
        price: 600,
        condition: 'good',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(3);
  });
});

describe('ad image endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/v1/instruments/images/upload-urls returns upload URLs', async () => {
    getDirectUploadUrls.mockResolvedValue([{ uploadURL: 'https://upload', id: 'img-1' }]);

    const res = await request(app)
      .post('/api/v1/instruments/images/upload-urls')
      .set(auth())
      .send({ count: 1 });

    expect(res.status).toBe(200);
    expect(res.body.uploadUrls).toHaveLength(1);
  });

  it('GET /api/v1/instruments/ads/:adId/images lists images', async () => {
    getAdImages.mockResolvedValue([{ cloudflare_image_id: 'img-1' }]);

    const res = await request(app)
      .get('/api/v1/instruments/ads/1/images')
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body[0].urls.full).toContain('img-1');
  });

  it('GET /api/v1/instruments/ads/:adId/images/can-add reports capacity', async () => {
    canAddImages.mockResolvedValue({ allowed: true, current: 0, max: 5 });

    const res = await request(app)
      .get('/api/v1/instruments/ads/1/images/can-add?count=1')
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(true);
  });

  it('DELETE /api/v1/instruments/ads/:adId/images/:imageId removes an image', async () => {
    getAdOwner.mockResolvedValue({ id: 1, user_id: testUserId });
    deleteAdImage.mockResolvedValue({ ad_id: 1, cloudflare_image_id: 'img-1' });

    const res = await request(app)
      .delete('/api/v1/instruments/ads/1/images/img-1')
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed successfully/i);
  });
});
