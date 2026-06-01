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

const clientIp = (req) => req.ip || req.socket.remoteAddress || 'unknown';

export const authRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10),
});

// Stricter, dedicated limiter for token refresh. Uses a namespaced key so its
// bucket is independent from the shared auth bucket above (which is keyed by raw
// IP). Refresh is an unauthenticated upstream Supabase call, so it gets a tighter
// per-IP cap to prevent quota/latency exhaustion from garbage refresh floods.
export const refreshRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: parseInt(process.env.REFRESH_RATE_LIMIT_MAX || '10', 10),
  keyGenerator: (req) => `refresh:${clientIp(req)}`,
  message: 'Too many refresh requests, please try again later',
});

// Limiter for image-bearing marketplace writes. These are authenticated routes,
// so prefer a per-account key (falling back to IP) and a namespaced bucket so it
// does not interfere with auth/refresh limits.
export const writeRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: parseInt(process.env.WRITE_RATE_LIMIT_MAX || '60', 10),
  keyGenerator: (req) => `write:${req.user?.sub || req.user?.id || clientIp(req)}`,
  message: 'Too many write requests, please try again later',
});
