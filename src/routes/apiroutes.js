import express from 'express';
import instrumentRoutes from './usedinstruments.js';
import authRoutes from './auth.js';
import { verifySupabaseTokenMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/instruments', verifySupabaseTokenMiddleware, instrumentRoutes);

export default router;
