import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const testUserId = '11111111-1111-1111-1111-111111111111';

vi.mock('../src/middleware/authMiddleware.js', () => ({
  verifySupabaseTokenMiddleware: (req, _res, next) => {
    req.user = { sub: testUserId, id: testUserId };
    next();
  },
}));

vi.mock('../src/services/cloudflareImages.js', () => ({
  getDirectUploadUrls: vi.fn(),
  deleteImage: vi.fn(),
  buildDeliveryUrl: vi.fn((id, variant) => `https://example.com/${id}/${variant}`),
  validateImageIds: vi.fn(),
}));

vi.mock('../src/models/marketplace_model.js', () => ({
  MAX_IMAGES_PER_AD: 5,
  INVALID_IMAGE_IDS: 'INVALID_IMAGE_IDS',
  getAdOwner: vi.fn(),
  getAdImages: vi.fn(),
  deleteAdImage: vi.fn(),
  canAddImages: vi.fn(),
}));

import app from '../src/server.js';
import { getDirectUploadUrls } from '../src/services/cloudflareImages.js';
import {
  canAddImages,
  deleteAdImage,
  getAdImages,
  getAdOwner,
} from '../src/models/marketplace_model.js';

describe('image routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns upload URLs for a valid count', async () => {
    getDirectUploadUrls.mockResolvedValue([{ uploadURL: 'https://upload', id: 'img-1' }]);

    const response = await request(app)
      .post('/api/v1/instruments/images/upload-urls')
      .set('Authorization', 'Bearer test-token')
      .send({ count: 1 });

    expect(response.status).toBe(200);
    expect(response.body.uploadUrls).toHaveLength(1);
  });

  it('returns 403 when deleting an image on someone else ad', async () => {
    getAdOwner.mockResolvedValue({ id: 1, user_id: 'other-user' });

    const response = await request(app)
      .delete('/api/v1/instruments/ads/1/images/img-1')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('deletes an owned ad image', async () => {
    getAdOwner.mockResolvedValue({ id: 1, user_id: testUserId });
    deleteAdImage.mockResolvedValue({ ad_id: 1, cloudflare_image_id: 'img-1' });

    const response = await request(app)
      .delete('/api/v1/instruments/ads/1/images/img-1')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Image removed successfully');
  });

  it('returns can-add response', async () => {
    canAddImages.mockResolvedValue({ allowed: true, current: 1, max: 5 });
    getAdImages.mockResolvedValue([]);

    const canAddResponse = await request(app)
      .get('/api/v1/instruments/ads/1/images/can-add?count=2')
      .set('Authorization', 'Bearer test-token');

    expect(canAddResponse.status).toBe(200);
    expect(canAddResponse.body.allowed).toBe(true);

    getAdImages.mockResolvedValue([{ cloudflare_image_id: 'img-1' }]);
    const imagesResponse = await request(app)
      .get('/api/v1/instruments/ads/1/images')
      .set('Authorization', 'Bearer test-token');

    expect(imagesResponse.status).toBe(200);
    expect(imagesResponse.body[0].urls.full).toContain('img-1');
  });
});
