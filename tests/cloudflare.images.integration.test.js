/**
 * Live Cloudflare Images direct-upload test using .env.staging credentials.
 *
 *   RUN_CLOUDFLARE_INTEGRATION=1 npm test -- tests/cloudflare.images.integration.test.js
 *
 * Or (loads .env.staging before Vitest):
 *
 *   npm run test:cloudflare:staging
 *
 * Requires in .env.staging:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN
 *   CLOUDFLARE_IMAGES_HASH
 */
import { describe, it, expect, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const runIntegration = process.env.RUN_CLOUDFLARE_INTEGRATION === '1';

const loadStagingCloudflareEnv = () => {
  const stagingPath = path.join(root, '.env.staging');
  const loaded = dotenv.config({ path: stagingPath, override: true });
  if (loaded.error) {
    throw new Error(`Could not load .env.staging: ${loaded.error.message}`);
  }

  const required = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_IMAGES_HASH'];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing in .env.staging: ${missing.join(', ')}. Copy from .env.staging.example and fill Cloudflare values.`,
    );
  }

  return {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID.trim(),
    imagesHash: process.env.CLOUDFLARE_IMAGES_HASH.trim(),
    tokenPrefix: process.env.CLOUDFLARE_API_TOKEN.trim().slice(0, 8),
  };
};

describe.skipIf(!runIntegration)('Cloudflare Images integration (.env.staging)', () => {
  let getDirectUploadUrl;
  let getDirectUploadUrls;
  let buildDeliveryUrl;
  let stagingConfig;

  beforeAll(async () => {
    stagingConfig = loadStagingCloudflareEnv();

    const mod = await import('../src/services/cloudflareImages.js');
    getDirectUploadUrl = mod.getDirectUploadUrl;
    getDirectUploadUrls = mod.getDirectUploadUrls;
    buildDeliveryUrl = mod.buildDeliveryUrl;
  });

  it('getDirectUploadUrl returns uploadURL and image id from Cloudflare API', async () => {
    const result = await getDirectUploadUrl();

    expect(result).toMatchObject({
      uploadURL: expect.stringMatching(/^https:\/\//),
      id: expect.any(String),
    });
    expect(result.id.length).toBeGreaterThan(0);
    expect(result.uploadURL).toContain('upload');
  }, 30_000);

  it('getDirectUploadUrls returns multiple URLs when count is 2', async () => {
    const results = await getDirectUploadUrls(2);

    expect(results).toHaveLength(2);
    results.forEach((entry) => {
      expect(entry.uploadURL).toMatch(/^https:\/\//);
      expect(entry.id).toBeTruthy();
    });
    expect(results[0].id).not.toBe(results[1].id);
  }, 30_000);

  it('buildDeliveryUrl uses CLOUDFLARE_IMAGES_HASH and variant names', () => {
    const imageId = 'test-cloudflare-image-id';
    const thumbnail = buildDeliveryUrl(imageId, 'thumbnail');

    expect(thumbnail).toBe(
      `https://imagedelivery.net/${stagingConfig.imagesHash}/${imageId}/thumbnail`,
    );
  });

  it('rejects count outside 1–5 without calling Cloudflare', async () => {
    await expect(getDirectUploadUrls(0)).rejects.toThrow(/between 1 and 5/);
    await expect(getDirectUploadUrls(6)).rejects.toThrow(/between 1 and 5/);
  });
});

describe('Cloudflare Images integration (skipped)', () => {
  it('documents how to run live Cloudflare tests', () => {
    if (runIntegration) {
      return;
    }
    expect(process.env.RUN_CLOUDFLARE_INTEGRATION).not.toBe('1');
  });
});
