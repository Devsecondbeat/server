import jwt from 'jsonwebtoken';
import { verifySupabaseToken } from '../config/supabase.js';
import logger from '../config/logger.js';

export const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const decoded = jwt.verify(token, process.env.Token_Secret_Key);
    req.emailID = decoded.emailID;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const createVerifySupabaseTokenMiddleware = ({
  verifySupabaseTokenFn = verifySupabaseToken,
  loggerInstance = logger,
} = {}) => async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header is missing',
      });
    }

    // Check if token is in Bearer format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization header format. Expected: Bearer <token>',
      });
    }

    const token = parts[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token is missing',
      });
    }

    // Verify token with Supabase
    const user = await verifySupabaseTokenFn(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Attach user information to request object
    req.user = user;
    req.supabaseToken = token;

    loggerInstance.debug('Supabase token verified for user:', user.id);
    next();
  } catch (error) {
    loggerInstance.error('Error in Supabase token verification middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during token verification',
    });
  }
};

/**
 * Middleware to verify Supabase JWT tokens.
 * Extracts token from Authorization header (Bearer <token>), verifies it with
 * Supabase, and attaches user details to req.user.
 */
export const verifySupabaseTokenMiddleware = createVerifySupabaseTokenMiddleware();
