import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
process.env.CLOUDFLARE_API_TOKEN = 'test-token';
process.env.CLOUDFLARE_IMAGES_HASH = 'test-hash';

vi.mock('../src/config/databaseManager.js', () => ({
  getPool: vi.fn(),
  getConnectionType: vi.fn(() => null),
  isConnectionHealthy: vi.fn(() => false),
  initializeConnectionManager: vi.fn().mockResolvedValue(undefined),
  shutdown: vi.fn().mockResolvedValue(undefined),
}));
