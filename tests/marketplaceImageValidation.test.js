import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateImageIds } from '../src/services/cloudflareImages.js';

describe('validateImageIds', () => {
  beforeEach(() => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'account-id';
    process.env.CLOUDFLARE_API_TOKEN = 'token';
    process.env.CLOUDFLARE_IMAGES_HASH = 'hash';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns valid for an empty image list', async () => {
    await expect(validateImageIds([])).resolves.toEqual({
      valid: true,
      invalidIds: [],
    });
  });

  it('returns invalid IDs that do not exist in Cloudflare', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => ({
      json: async () => ({
        success: String(url).includes('/good-id'),
      }),
    }));

    const result = await validateImageIds(['good-id', 'bad-id']);

    expect(result).toEqual({
      valid: false,
      invalidIds: ['bad-id'],
    });
  });

  it('returns valid when all image IDs exist in Cloudflare', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ success: true }),
    });

    const result = await validateImageIds(['img-1', 'img-2']);

    expect(result).toEqual({
      valid: true,
      invalidIds: [],
    });
  });
});
