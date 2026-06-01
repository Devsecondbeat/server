import { describe, it, expect } from 'vitest';
import {
  formatAuthFailure,
  formatResponseBodyForLog,
  buildRequestLogContext,
} from '../src/Utils/authErrorLog.js';

describe('formatAuthFailure', () => {
  it('includes structured error fields', () => {
    const error = new Error('Email delivery failed');
    error.code = 'SENDGRID_SEND_FAILED';
    error.status = 403;
    error.signupStep = 'send_activation_email';
    error.sendGridStatus = 403;

    expect(formatAuthFailure(error)).toEqual({
      message: 'Email delivery failed',
      code: 'SENDGRID_SEND_FAILED',
      status: 403,
      name: 'Error',
      signupStep: 'send_activation_email',
      sendGridStatus: 403,
    });
  });
});

describe('formatResponseBodyForLog', () => {
  it('returns a redacted API error summary', () => {
    expect(formatResponseBodyForLog({
      success: false,
      error: 'Invalid email or password',
      code: 'AUTH_FAILED',
    })).toEqual({
      success: false,
      error: 'Invalid email or password',
      code: 'AUTH_FAILED',
      message: undefined,
    });
  });

  it('returns undefined for empty bodies', () => {
    expect(formatResponseBodyForLog({})).toBeUndefined();
  });
});

describe('buildRequestLogContext', () => {
  it('includes request metadata', () => {
    expect(buildRequestLogContext({
      requestId: 'req-123',
      method: 'POST',
      originalUrl: '/api/v1/auth/signup',
    })).toEqual({
      requestId: 'req-123',
      method: 'POST',
      path: '/api/v1/auth/signup',
    });
  });
});
