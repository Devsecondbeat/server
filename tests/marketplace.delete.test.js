import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  release: vi.fn(),
  deleteImages: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock('../src/config/database.js', () => ({
  getPool: () => ({
    connect: mocks.connect,
  }),
}));

vi.mock('../src/services/cloudflareImages.js', () => ({
  validateImageIds: vi.fn().mockResolvedValue({ valid: true, invalidIds: [] }),
  buildDeliveryUrl: vi.fn((imageId, variant) => `https://example.com/${imageId}/${variant}`),
  deleteImages: mocks.deleteImages,
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: mocks.loggerWarn,
  },
}));

const deletedAd = {
  id: 42,
  user_id: 'user-1',
  name: 'Jazz Bass',
};

const runDeleteQueries = ({ imageRows, adRows, rowCount, operations }) => {
  mocks.query.mockImplementation(async (query) => {
    operations.push(query);

    if (query === 'DELETE FROM ad_images WHERE ad_id = $1 RETURNING cloudflare_image_id') {
      return { rows: imageRows };
    }

    if (query === 'DELETE FROM used_instrument_ads WHERE id = $1 RETURNING *') {
      return { rowCount, rows: adRows };
    }

    return { rows: [] };
  });
};

import { deleteInstrumentAds } from '../src/models/marketplace_model.js';

describe('deleteInstrumentAds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connect.mockResolvedValue({
      query: mocks.query,
      release: mocks.release,
    });
    mocks.deleteImages.mockResolvedValue({ success: [], failed: [] });
  });

  it('commits database deletion before removing Cloudflare images', async () => {
    const operations = [];
    runDeleteQueries({
      operations,
      imageRows: [
        { cloudflare_image_id: 'img-1' },
        { cloudflare_image_id: 'img-2' },
      ],
      adRows: [deletedAd],
      rowCount: 1,
    });
    mocks.deleteImages.mockImplementation(async (imageIds) => {
      operations.push(`deleteImages:${imageIds.join(',')}`);
      return { success: imageIds, failed: [] };
    });

    await expect(deleteInstrumentAds(42)).resolves.toEqual(deletedAd);

    expect(operations).toEqual([
      'BEGIN',
      'DELETE FROM ad_images WHERE ad_id = $1 RETURNING cloudflare_image_id',
      'DELETE FROM used_instrument_ads WHERE id = $1 RETURNING *',
      'COMMIT',
      'deleteImages:img-1,img-2',
    ]);
    expect(mocks.deleteImages).toHaveBeenCalledWith(['img-1', 'img-2']);
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back and skips Cloudflare cleanup when the ad does not exist', async () => {
    const operations = [];
    runDeleteQueries({
      operations,
      imageRows: [{ cloudflare_image_id: 'orphaned-img' }],
      adRows: [],
      rowCount: 0,
    });

    await expect(deleteInstrumentAds(404)).resolves.toBeNull();

    expect(operations).toEqual([
      'BEGIN',
      'DELETE FROM ad_images WHERE ad_id = $1 RETURNING cloudflare_image_id',
      'DELETE FROM used_instrument_ads WHERE id = $1 RETURNING *',
      'ROLLBACK',
    ]);
    expect(mocks.deleteImages).not.toHaveBeenCalled();
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it('returns the deleted ad when post-commit Cloudflare cleanup fails', async () => {
    const operations = [];
    runDeleteQueries({
      operations,
      imageRows: [{ cloudflare_image_id: 'img-1' }],
      adRows: [deletedAd],
      rowCount: 1,
    });
    mocks.deleteImages.mockRejectedValue(new Error('Cloudflare unavailable'));

    await expect(deleteInstrumentAds(42)).resolves.toEqual(deletedAd);

    expect(operations).toContain('COMMIT');
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      'Failed to delete some Cloudflare images during ad delete',
      {
        adId: 42,
        error: 'Cloudflare unavailable',
      },
    );
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });
});
