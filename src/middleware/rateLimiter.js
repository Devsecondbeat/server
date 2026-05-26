import AppError from '../Utils/AppError.js';

const buckets = new Map();

const pruneTimestamps = (timestamps, now, windowMs) => timestamps.filter(
  (timestamp) => now - timestamp < windowMs,
);

export const createRateLimiter = ({
  windowMs = 60_000,
  max = 10,
  keyGenerator = (req) => req.ip || req.socket.remoteAddress || 'unknown',
  message = 'Too many requests, please try again later',
}) => (req, _res, next) => {
  const key = keyGenerator(req);
  const now = Date.now();
  const existing = buckets.get(key) || { timestamps: [] };
  const timestamps = pruneTimestamps(existing.timestamps, now, windowMs);

  if (timestamps.length >= max) {
    return next(new AppError(message, { status: 429, code: 'RATE_LIMIT_EXCEEDED' }));
  }

  buckets.set(key, { timestamps: [...timestamps, now] });
  return next();
};

export const authRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10),
});
