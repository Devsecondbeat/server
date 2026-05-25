import { verifySupabaseToken } from '../config/supabase.js';
import logger from '../config/logger.js';

export const extractBearerToken = (authHeader) => {
  if (!authHeader) {
    return { error: 'Authorization header is missing' };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { error: 'Invalid authorization header format. Expected: Bearer <token>' };
  }

  if (!parts[1]) {
    return { error: 'Token is missing' };
  }

  return { token: parts[1] };
};

/**
 * Verifies Supabase JWT tokens from Authorization: Bearer <token>
 * and attaches the Supabase user to req.user (with sub = user.id).
 */
export const verifySupabaseTokenMiddleware = async (req, res, next) => {
  try {
    const { token, error: headerError } = extractBearerToken(req.header('Authorization'));

    if (headerError) {
      return res.status(401).json({ success: false, error: headerError });
    }

    const user = await verifySupabaseToken(token);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    req.user = { ...user, sub: user.id };
    req.supabaseToken = token;

    logger.debug('Supabase token verified', { userId: user.id });
    return next();
  } catch (error) {
    logger.error('Supabase token verification middleware failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Internal server error during token verification',
    });
  }
};
