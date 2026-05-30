import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import AppError from '../src/Utils/AppError.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { AD_LIMIT_REACHED, INVALID_IMAGE_IDS } from '../src/models/marketplace_model.js';

const buildApp = (registerRoutes) => {
  const app = express();
  app.use(express.json({ limit: '25b' }));
  registerRoutes(app);
  app.use(errorHandler);
  return app;
};

describe('errorHandler', () => {
  it('returns AppError status, code, and details', async () => {
    const app = buildApp((testApp) => {
      testApp.get('/app-error', (_req, _res, next) => {
        next(
          new AppError('Invalid request', {
            status: 422,
            code: 'VALIDATION_ERROR',
            details: { errors: ['name is required'] },
          }),
        );
      });
    });

    const response = await request(app).get('/app-error');

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      success: false,
      error: 'Invalid request',
      code: 'VALIDATION_ERROR',
      errors: ['name is required'],
    });
  });

  it('maps ad limit errors to a conflict response', async () => {
    const app = buildApp((testApp) => {
      testApp.post('/ads', (_req, _res, next) => {
        const error = new Error('Maximum 3 ads allowed per user');
        error.code = AD_LIMIT_REACHED;
        next(error);
      });
    });

    const response = await request(app).post('/ads');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      error: 'Maximum 3 ads allowed per user',
      code: AD_LIMIT_REACHED,
    });
  });

  it('returns invalid Cloudflare image IDs to the client', async () => {
    const app = buildApp((testApp) => {
      testApp.post('/ads', (_req, _res, next) => {
        const error = new Error('One or more image IDs are invalid or not uploaded to Cloudflare');
        error.code = INVALID_IMAGE_IDS;
        error.invalidIds = ['missing-image'];
        next(error);
      });
    });

    const response = await request(app).post('/ads');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'One or more image IDs are invalid or not uploaded to Cloudflare',
      code: INVALID_IMAGE_IDS,
      invalidIds: ['missing-image'],
    });
  });

  it('maps malformed JSON to a stable 400 response', async () => {
    const app = buildApp((testApp) => {
      testApp.post('/json', (_req, res) => {
        res.status(204).end();
      });
    });

    const response = await request(app)
      .post('/json')
      .set('Content-Type', 'application/json')
      .send('{"name":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, error: 'Invalid JSON body' });
  });

  it('hides Cloudflare service failures behind a 502 response', async () => {
    const app = buildApp((testApp) => {
      testApp.post('/images', (_req, _res, next) => {
        next(new Error('Cloudflare returned a 500 response'));
      });
    });

    const response = await request(app).post('/images');

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      success: false,
      error: 'Image service unavailable',
    });
  });
});
