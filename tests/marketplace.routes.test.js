import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const testUserId = '11111111-1111-1111-1111-111111111111';

vi.mock('../src/middleware/authMiddleware.js', () => ({
  verifySupabaseTokenMiddleware: (req, _res, next) => {
    req.user = { sub: testUserId, id: testUserId };
    next();
  },
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
  createInstrumentAds,
  deleteInstrumentAds,
  getAdOwner,
  instrumentMakeExists,
  updateInstrumentAds,
} from '../src/models/marketplace_model.js';

describe('marketplace routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when required ad fields are missing', async () => {
    const response = await request(app)
      .post('/api/v1/instruments/createinstrumentAds')
      .set('Authorization', 'Bearer test-token')
      .send({ name: 'Only name' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when make_id does not exist', async () => {
    instrumentMakeExists.mockResolvedValue(false);

    const response = await request(app)
      .post('/api/v1/instruments/createinstrumentAds')
      .set('Authorization', 'Bearer test-token')
      .send({
        make_id: 999,
        name: 'Strat',
        description: 'Nice guitar',
        price: 500,
        condition: 'good',
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('MAKE_NOT_FOUND');
  });

  it('creates an ad when payload is valid', async () => {
    instrumentMakeExists.mockResolvedValue(true);
    createInstrumentAds.mockResolvedValue({ id: 1, name: 'Strat' });

    const response = await request(app)
      .post('/api/v1/instruments/createinstrumentAds')
      .set('Authorization', 'Bearer test-token')
      .send({
        make_id: 1,
        name: 'Strat',
        description: 'Nice guitar',
        price: 500,
        condition: 'good',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe(1);
  });

  it('returns 403 when updating someone else ad', async () => {
    getAdOwner.mockResolvedValue({ id: 1, user_id: 'other-user' });

    const response = await request(app)
      .put('/api/v1/instruments/updateinstrumentAds/1')
      .set('Authorization', 'Bearer test-token')
      .send({ description: 'Updated', price: 400, condition: 'good' });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('deletes an owned ad', async () => {
    getAdOwner.mockResolvedValue({ id: 1, user_id: testUserId });
    deleteInstrumentAds.mockResolvedValue({ id: 1, user_id: testUserId });

    const response = await request(app)
      .delete('/api/v1/instruments/deleteinstrumentAds/1')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(1);
  });
});
