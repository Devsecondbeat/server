import express from 'express';
import instrumentRoutes from './usedinstruments.js';
import verifyToken from '../middleware/authMiddleware.js';

const router = express.Router();

// Use imported routes
router.use('/instruments', verifyToken, instrumentRoutes);

export default router;
