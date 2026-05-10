import express from 'express';
import rateLimit from 'express-rate-limit';
import instrumentRoutes from './usedinstruments.js';
import userRoutes from './user.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rate limiters for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const createAdLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many ad creations, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to auth routes
router.use('/users', authLimiter, userRoutes);
// Instruments protected by auth + create limiter on POST create
router.use('/instruments', verifyToken, createAdLimiter, instrumentRoutes);

export default router;

