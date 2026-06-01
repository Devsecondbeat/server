import { randomUUID } from 'crypto';
import logger from '../config/logger.js';
import { formatResponseBodyForLog } from '../Utils/authErrorLog.js';

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
  let responseBody;

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const statusCode = res.statusCode;
    const response = formatResponseBodyForLog(responseBody);
    const payload = {
      event: 'http.request.completed',
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ...(req.user?.id ? { userId: req.user.id } : {}),
      ...(response ? { response } : {}),
    };

    logger.log(levelForStatus(statusCode), 'HTTP request completed', payload);
  });

  next();
};

export default requestLogMiddleware;
