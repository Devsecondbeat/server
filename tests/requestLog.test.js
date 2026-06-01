import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import { EventEmitter } from 'events';
import { requestLogMiddleware } from '../src/middleware/requestLog.js';

const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
}));

vi.mock('../src/config/logger.js', () => ({
  default: mockLogger,
}));

describe('requestLogMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs completed requests with response error summary', () => {
    const req = {
      method: 'POST',
      originalUrl: '/api/v1/auth/signup',
      get: vi.fn(),
    };
    const res = new EventEmitter();
    res.statusCode = 503;
    res.setHeader = vi.fn();
    res.json = vi.fn((body) => {
      res._body = body;
      return res;
    });

    requestLogMiddleware(req, res, () => {});
    req.requestId = req.requestId || 'generated-id';
    res.json({
      success: false,
      error: 'Email delivery failed: quota exceeded',
    });
    res.emit('finish');

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
    expect(mockLogger.log).toHaveBeenCalledWith(
      'error',
      'HTTP request completed',
      expect.objectContaining({
        event: 'http.request.completed',
        method: 'POST',
        path: '/api/v1/auth/signup',
        statusCode: 503,
        response: {
          success: false,
          error: 'Email delivery failed: quota exceeded',
          code: undefined,
          message: undefined,
        },
      }),
    );
  });

  it('reuses incoming x-request-id', () => {
    const req = {
      method: 'GET',
      originalUrl: '/health',
      get: vi.fn((header) => (header === 'x-request-id' ? 'client-req-1' : undefined)),
    };
    const res = new EventEmitter();
    res.statusCode = 200;
    res.setHeader = vi.fn();
    res.json = vi.fn(() => res);

    requestLogMiddleware(req, res, () => {});
    res.json({ status: 'ok' });
    res.emit('finish');

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'client-req-1');
    expect(mockLogger.log).toHaveBeenCalledWith(
      'info',
      'HTTP request completed',
      expect.objectContaining({
        requestId: 'client-req-1',
        statusCode: 200,
      }),
    );
  });
});
