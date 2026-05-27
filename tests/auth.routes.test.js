import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../src/services/supabaseAuth.js', () => ({
  signInWithPassword: vi.fn(),
  createSignupWithActivationLink: vi.fn(),
  createActivationResendLink: vi.fn(),
  createPasswordRecoveryLink: vi.fn(),
  refreshAuthSession: vi.fn(),
  formatAuthUser: (user) => user,
  formatAuthSession: (session) => session,
  mapSupabaseAuthError: (error) => ({ status: 401, error: error.message }),
}));

vi.mock('../src/Utils/sendEmail.js', () => ({
  sendActivationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import app from '../src/server.js';
import { signInWithPassword } from '../src/services/supabaseAuth.js';

describe('auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid login payload', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'bad-email', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeTruthy();
  });

  it('returns session on successful login', async () => {
    signInWithPassword.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
      session: {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'bearer',
      },
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.session.access_token).toBe('access');
  });

  it('returns 401 for invalid credentials', async () => {
    signInWithPassword.mockRejectedValue(new Error('Invalid login credentials'));

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
