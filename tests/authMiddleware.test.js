import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/supabase.js', () => ({
  verifySupabaseToken: vi.fn(),
}));

import { verifySupabaseToken } from '../src/config/supabase.js';
import { verifySupabaseTokenMiddleware } from '../src/middleware/authMiddleware.js';

const createResponse = () => {
  const res = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  };
  return res;
};

describe('verifySupabaseTokenMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when Supabase rejects the token', async () => {
    verifySupabaseToken.mockResolvedValue(null);
    const req = {
      header: vi.fn(() => 'Bearer expired-token'),
    };
    const res = createResponse();
    const next = vi.fn();

    await verifySupabaseTokenMiddleware(req, res, next);

    expect(verifySupabaseToken).toHaveBeenCalledWith('expired-token');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid or expired token',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches the Supabase user and token before continuing', async () => {
    verifySupabaseToken.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
    const req = {
      header: vi.fn(() => 'Bearer valid-token'),
    };
    const res = createResponse();
    const next = vi.fn();

    await verifySupabaseTokenMiddleware(req, res, next);

    expect(req.user).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      sub: 'user-1',
    });
    expect(req.supabaseToken).toBe('valid-token');
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
