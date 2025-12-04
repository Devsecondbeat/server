import express from 'express';
import verifyToken from '../controllers/authController.js';
import { verifySupabaseTokenMiddleware } from '../middleware/authMiddleware.js';

const authRoutes = express.Router();

/**
 * POST /api/v1/auth/verify
 * Verifies Supabase JWT token sent from frontend
 * Requires: Authorization header with Bearer token
 * Returns: User information if token is valid
 */
authRoutes.post('/verify', verifySupabaseTokenMiddleware, verifyToken);

/**
 * GET /api/v1/auth/verify
 * Alternative GET endpoint for token verification
 * Requires: Authorization header with Bearer token
 * Returns: User information if token is valid
 */
authRoutes.get('/verify', verifySupabaseTokenMiddleware, verifyToken);

export default authRoutes;

