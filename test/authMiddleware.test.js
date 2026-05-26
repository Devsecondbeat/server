import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { verifySupabaseToken } from '../src/config/supabase.js';
import { verifySupabaseTokenMiddleware, verifyToken } from '../src/middleware/authMiddleware.js';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

vi.mock('../src/config/supabase.js', () => ({
  verifySupabaseToken: vi.fn(),
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const makeRequest = authorizationHeader => ({
  header: vi.fn(headerName => (headerName === 'Authorization' ? authorizationHeader : undefined)),
});

const makeResponse = () => {
  const response = {};
  response.status = vi.fn(() => response);
  response.json = vi.fn(() => response);
  return response;
};

describe('verifyToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.Token_Secret_Key = 'legacy-secret';
  });

  it('rejects protected API requests without an authorization token', () => {
    const request = makeRequest();
    const response = makeResponse();
    const next = vi.fn();

    verifyToken(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: 'Access denied' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid legacy JWTs before protected route handlers run', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('bad token');
    });
    const request = makeRequest('not-a-jwt');
    const response = makeResponse();
    const next = vi.fn();

    verifyToken(request, response, next);

    expect(jwt.verify).toHaveBeenCalledWith('not-a-jwt', 'legacy-secret');
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches the decoded email and allows valid legacy JWTs through', () => {
    jwt.verify.mockReturnValue({ emailID: 'buyer@example.com' });
    const request = makeRequest('valid-jwt');
    const response = makeResponse();
    const next = vi.fn();

    verifyToken(request, response, next);

    expect(request.emailID).toBe('buyer@example.com');
    expect(response.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('verifySupabaseTokenMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects requests missing the bearer authorization header', async () => {
    const request = makeRequest();
    const response = makeResponse();
    const next = vi.fn();

    await verifySupabaseTokenMiddleware(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: 'Authorization header is missing',
    });
    expect(verifySupabaseToken).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects malformed authorization headers before token verification', async () => {
    const request = makeRequest('Token abc123');
    const response = makeResponse();
    const next = vi.fn();

    await verifySupabaseTokenMiddleware(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid authorization header format. Expected: Bearer <token>',
    });
    expect(verifySupabaseToken).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects Supabase tokens that do not resolve to a user', async () => {
    verifySupabaseToken.mockResolvedValue(null);
    const request = makeRequest('Bearer expired-token');
    const response = makeResponse();
    const next = vi.fn();

    await verifySupabaseTokenMiddleware(request, response, next);

    expect(verifySupabaseToken).toHaveBeenCalledWith('expired-token');
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid or expired token',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches Supabase auth context and calls the next handler for valid tokens', async () => {
    const user = { id: 'user-123', email: 'seller@example.com' };
    verifySupabaseToken.mockResolvedValue(user);
    const request = makeRequest('Bearer valid-token');
    const response = makeResponse();
    const next = vi.fn();

    await verifySupabaseTokenMiddleware(request, response, next);

    expect(request.user).toBe(user);
    expect(request.supabaseToken).toBe('valid-token');
    expect(response.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});
