import { randomUUID } from 'crypto';
import logger from '../config/logger.js';

const REQUEST_ID_HEADER = 'x-request-id';
const CORRELATION_ID_HEADER = 'x-correlation-id';

const pickRequestId = (req) => {
  const incoming = req.get(REQUEST_ID_HEADER) || req.get(CORRELATION_ID_HEADER);
  if (incoming && typeof incoming === 'string' && incoming.length <= 128) {
    return incoming.trim();
  }
  return randomUUID();
};

const levelForStatus = (statusCode) => {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
};

/** One structured line per HTTP request (success and error responses). */
export const requestLogMiddleware = (req, res, next) => {
  const requestId = pickRequestId(req);
  const start = process.hrtime.bigint();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const statusCode = res.statusCode;
    const payload = {
      event: 'http.request.completed',
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ...(req.user?.id ? { userId: req.user.id } : {}),
    };

    logger.log(levelForStatus(statusCode), 'HTTP request completed', payload);
  });

  next();
};

export default requestLogMiddleware;
