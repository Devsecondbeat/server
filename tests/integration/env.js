import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const loadIntegrationEnv = () => {
  dotenv.config({ path: path.join(root, '.env.staging') });
  dotenv.config({ path: path.join(root, '.env'), override: false });
};

export const integrationEnabled = process.env.RUN_API_INTEGRATION === '1';

export const baseUrl = (
  process.env.API_BASE_URL || 'https://secondbeat-server-nywxc.ondigitalocean.app'
).replace(/\/$/, '');

/** Minimal 1×1 PNG for Cloudflare direct upload */
export const samplePngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
