import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createRateLimiter } from '../src/middleware/rateLimiter.js';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes requests until the configured limit is reached', () => {
    const limiter = createRateLimiter({
      windowMs: 1_000,
      max: 2,
      keyGenerator: (req) => req.rateLimitKey,
      message: 'Slow down',
    });

    const firstNext = vi.fn();
    const secondNext = vi.fn();
    const thirdNext = vi.fn();
    const req = { rateLimitKey: 'limit-user' };

    limiter(req, {}, firstNext);
    limiter(req, {}, secondNext);
    limiter(req, {}, thirdNext);

    expect(firstNext.mock.calls[0]).toEqual([]);
    expect(secondNext.mock.calls[0]).toEqual([]);
    expect(thirdNext.mock.calls[0][0]).toMatchObject({
      message: 'Slow down',
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
    });
  });

  it('prunes timestamps once the window has elapsed', () => {
    const limiter = createRateLimiter({
      windowMs: 1_000,
      max: 1,
      keyGenerator: (req) => req.rateLimitKey,
    });
    const req = { rateLimitKey: 'prune-user' };

    const firstNext = vi.fn();
    limiter(req, {}, firstNext);
    expect(firstNext.mock.calls[0]).toEqual([]);

    vi.advanceTimersByTime(999);
    const blockedNext = vi.fn();
    limiter(req, {}, blockedNext);
    expect(blockedNext.mock.calls[0][0]).toMatchObject({
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
    });

    vi.advanceTimersByTime(1);
    const allowedNext = vi.fn();
    limiter(req, {}, allowedNext);
    expect(allowedNext.mock.calls[0]).toEqual([]);
  });
});
