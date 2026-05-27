import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockRelease = vi.fn();

vi.mock('../src/config/database.js', () => ({
  getPool: () => ({
    connect: mockConnect,
  }),
}));

vi.mock('../src/services/cloudflareImages.js', () => ({
  validateImageIds: vi.fn().mockResolvedValue({ valid: true, invalidIds: [] }),
  buildDeliveryUrl: vi.fn(),
  deleteImages: vi.fn(),
}));

import { createInstrumentAds, AD_LIMIT_REACHED, MAX_ADS_PER_USER } from '../src/models/marketplace_model.js';

describe('createInstrumentAds ad limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    });
  });

  it(`rejects when user already has ${MAX_ADS_PER_USER} ads`, async () => {
    mockQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ count: MAX_ADS_PER_USER }] });

    await expect(
      createInstrumentAds({
        user_id: 'user-1',
        make_id: 1,
        name: 'Guitar',
        description: 'Nice',
        price: 1000,
        condition: 'good',
        imageIds: [],
      }),
    ).rejects.toMatchObject({
      code: AD_LIMIT_REACHED,
      message: `Maximum ${MAX_ADS_PER_USER} ads allowed per user`,
    });

    expect(mockRelease).toHaveBeenCalled();
  });
});
