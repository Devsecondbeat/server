import { describe, it, expect } from 'vitest';
import { extractBearerToken } from '../src/middleware/authMiddleware.js';
import { mapSupabaseAuthError } from '../src/services/supabaseAuth.js';

describe('extractBearerToken', () => {
  it('returns an error when the header is missing', () => {
    expect(extractBearerToken(undefined)).toEqual({
      error: 'Authorization header is missing',
    });
  });

  it('returns an error when the header is not Bearer format', () => {
    expect(extractBearerToken('Token abc')).toEqual({
      error: 'Invalid authorization header format. Expected: Bearer <token>',
    });
  });

  it('returns the token from a valid Bearer header', () => {
    expect(extractBearerToken('Bearer supabase-jwt')).toEqual({
      token: 'supabase-jwt',
    });
  });
});

describe('mapSupabaseAuthError', () => {
  it('maps invalid credentials to 401', () => {
    expect(mapSupabaseAuthError({ message: 'Invalid login credentials' })).toEqual({
      status: 401,
      error: 'Invalid email or password',
    });
  });

  it('maps duplicate signup to 409', () => {
    expect(mapSupabaseAuthError({ message: 'User already registered' })).toEqual({
      status: 409,
      error: 'An account with this email already exists',
    });
  });
});
