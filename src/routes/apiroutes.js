import express from 'express';
import instrumentRoutes from './usedinstruments.js';
import userRoutes from './user.js';
import { verifyToken } from '../middleware/authMiddleware.js';


const router = express.Router();

// Use imported routes
router.use('/instruments', verifyToken,instrumentRoutes);
router.use('/users', userRoutes);

export default router;
