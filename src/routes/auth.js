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

const authRoutes = express.Router();

authRoutes.post('/signup', signUp);
authRoutes.post('/activation/resend', resendActivationEmail);
authRoutes.post('/login', signIn);
authRoutes.post('/refresh', refreshSession);
authRoutes.post('/logout', signOut);
authRoutes.post('/password/recovery', requestPasswordRecovery);

authRoutes.get('/me', verifySupabaseTokenMiddleware, getCurrentUser);
authRoutes.post('/verify', verifySupabaseTokenMiddleware, verifyToken);
authRoutes.get('/verify', verifySupabaseTokenMiddleware, verifyToken);

export default authRoutes;
