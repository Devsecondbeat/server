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
import { signInWithPassword, createSignupWithActivationLink } from '../src/services/supabaseAuth.js';
import { sendActivationEmail } from '../src/Utils/sendEmail.js';

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

describe('auth routes email errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 503 when activation email is not configured', async () => {
    createSignupWithActivationLink.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
      activationLink: 'https://example.com/activate',
    });
    sendActivationEmail.mockRejectedValue(
      Object.assign(new Error('AWS SES is not configured.'), { code: 'EMAIL_NOT_CONFIGURED' }),
    );

    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('AWS SES is not configured');
  });

  it('returns 503 with quota message when SES is throttled', async () => {
    createSignupWithActivationLink.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
      activationLink: 'https://example.com/activate',
    });
    sendActivationEmail.mockRejectedValue(
      Object.assign(new Error('Maximum sending rate exceeded'), {
        code: 'EMAIL_SEND_FAILED',
        name: 'Throttling',
      }),
    );

    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Email service quota exceeded');
  });

  it('returns 503 with delivery failure message for other email errors', async () => {
    createSignupWithActivationLink.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
      activationLink: 'https://example.com/activate',
    });
    sendActivationEmail.mockRejectedValue(
      Object.assign(new Error('Email address is not verified'), { code: 'EMAIL_SEND_FAILED' }),
    );

    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Email delivery failed: Email address is not verified');
  });
});
