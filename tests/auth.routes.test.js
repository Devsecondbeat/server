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
import {
  createActivationResendLink,
  createPasswordRecoveryLink,
  createSignupWithActivationLink,
  refreshAuthSession,
  signInWithPassword,
} from '../src/services/supabaseAuth.js';
import { sendActivationEmail, sendPasswordResetEmail } from '../src/Utils/sendEmail.js';

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

  it('creates a signup and sends the activation email', async () => {
    createSignupWithActivationLink.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
      activationLink: 'https://activate.example/link',
    });

    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'user@example.com',
        password: 'password123',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(createSignupWithActivationLink).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
      metadata: {
        first_name: 'Ada',
        last_name: 'Lovelace',
      },
      redirectTo: undefined,
    });
    expect(sendActivationEmail).toHaveBeenCalledWith(
      'user@example.com',
      'https://activate.example/link',
      'Ada Lovelace',
    );
  });

  it('returns a refreshed session when the refresh token is valid', async () => {
    refreshAuthSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
      session: {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        token_type: 'bearer',
      },
    });

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: 'refresh-token' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.session.access_token).toBe('new-access');
    expect(refreshAuthSession).toHaveBeenCalledWith('refresh-token');
  });

  it('hides password recovery lookup failures from clients', async () => {
    createPasswordRecoveryLink.mockRejectedValue(new Error('User not found'));

    const response = await request(app)
      .post('/api/v1/auth/password/recovery')
      .send({ email: 'missing@example.com' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'If an account with that email exists, you will receive password reset instructions.',
    });
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('hides activation resend lookup failures from clients', async () => {
    createActivationResendLink.mockRejectedValue(new Error('User not found'));

    const response = await request(app)
      .post('/api/v1/auth/activation/resend')
      .send({ email: 'missing@example.com' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'If an account with that email exists, you will receive an activation email.',
    });
    expect(sendActivationEmail).not.toHaveBeenCalled();
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
