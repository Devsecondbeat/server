import logger from '../config/logger.js';
import AppError from '../Utils/AppError.js';
import { INVALID_IMAGE_IDS, AD_LIMIT_REACHED } from '../models/marketplace_model.js';

export const notFoundHandler = (_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
};

export const errorHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.details ?? {}),
    });
  }

  if (err.code === INVALID_IMAGE_IDS) {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: INVALID_IMAGE_IDS,
      invalidIds: err.invalidIds,
    });
  }

  if (err.code === AD_LIMIT_REACHED) {
    return res.status(409).json({
      success: false,
      error: err.message,
      code: AD_LIMIT_REACHED,
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Request body too large' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Invalid JSON body' });
  }

  const errorMeta = {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl || req.path,
    ...(err.code ? { code: err.code } : {}),
  };

  if (err.message?.includes('Cloudflare')) {
    logger.error('Cloudflare service error', { ...errorMeta, error: err.message });
    return res.status(502).json({ success: false, error: 'Image service unavailable' });
  }

  if (
    err.message?.includes('Maximum')
    || err.message?.includes('instrument_type must be')
  ) {
    return res.status(400).json({ success: false, error: err.message });
  }

  logger.error('Unhandled error', {
    ...errorMeta,
    error: err.message,
    stack: err.stack,
  });

  return res.status(500).json({ success: false, error: 'Internal server error' });
};
