import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const testUserId = '11111111-1111-1111-1111-111111111111';
const mockPoolQuery = vi.fn();
const mockConnect = vi.fn();
const mockClientQuery = vi.fn();
const mockRelease = vi.fn();

vi.mock('../src/middleware/authMiddleware.js', () => ({
  verifySupabaseTokenMiddleware: (req, _res, next) => {
    req.user = { sub: testUserId, id: testUserId };
    next();
  },
}));

vi.mock('../src/services/cloudflareImages.js', () => ({
  validateImageIds: vi.fn(),
  buildDeliveryUrl: vi.fn((id, variant) => `https://example.com/${id}/${variant}`),
  deleteImages: vi.fn(),
}));

import app from '../src/server.js';
import { getPool } from '../src/config/databaseManager.js';
import { validateImageIds } from '../src/services/cloudflareImages.js';
import {
  AD_LIMIT_REACHED,
  INVALID_IMAGE_IDS,
  MAX_ADS_PER_USER,
} from '../src/models/marketplace_model.js';

const validAdPayload = {
  make_id: 1,
  name: 'Strat',
  description: 'Nice guitar',
  price: 500,
  condition: 'good',
};

describe('marketplace route error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPool.mockReturnValue({
      query: mockPoolQuery,
      connect: mockConnect,
    });
    mockConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockRelease,
    });
    mockPoolQuery.mockResolvedValue({ rowCount: 1, rows: [{ id: 1 }] });
  });

  it('returns invalid Cloudflare image IDs from the create ad HTTP contract', async () => {
    validateImageIds.mockResolvedValue({ valid: false, invalidIds: ['bad-image'] });

    const response = await request(app)
      .post('/api/v1/instruments/createinstrumentAds')
      .set('Authorization', 'Bearer test-token')
      .send({
        ...validAdPayload,
        imageIds: ['good-image', 'bad-image'],
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      code: INVALID_IMAGE_IDS,
      invalidIds: ['bad-image'],
    });
    expect(validateImageIds).toHaveBeenCalledWith(['good-image', 'bad-image']);
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalled();
  });

  it('maps a reached ad limit to HTTP 409 instead of a generic failure', async () => {
    mockClientQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ count: MAX_ADS_PER_USER }] })
      .mockResolvedValueOnce(undefined);

    const response = await request(app)
      .post('/api/v1/instruments/createinstrumentAds')
      .set('Authorization', 'Bearer test-token')
      .send(validAdPayload);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      success: false,
      code: AD_LIMIT_REACHED,
      error: `Maximum ${MAX_ADS_PER_USER} ads allowed per user`,
    });
    expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalled();
  });
});
