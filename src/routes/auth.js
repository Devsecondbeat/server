import express from 'express';
import {
  getCurrentUser,
  refreshSession,
  requestPasswordRecovery,
  resendActivationEmail,
  signIn,
  signOut,
  signUp,
  verifyToken,
} from '../controllers/authController.js';
import { verifySupabaseTokenMiddleware } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const authRoutes = express.Router();

authRoutes.post('/signup', authRateLimiter, signUp);
authRoutes.post('/activation/resend', authRateLimiter, resendActivationEmail);
authRoutes.post('/login', authRateLimiter, signIn);
authRoutes.post('/refresh', refreshSession);
authRoutes.post('/logout', signOut);
authRoutes.post('/password/recovery', authRateLimiter, requestPasswordRecovery);

authRoutes.get('/me', verifySupabaseTokenMiddleware, getCurrentUser);
authRoutes.post('/verify', verifySupabaseTokenMiddleware, verifyToken);
authRoutes.get('/verify', verifySupabaseTokenMiddleware, verifyToken);

export default authRoutes;
