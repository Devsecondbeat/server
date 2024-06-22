import express from 'express';
import instrumentRoutes from './usedinstruments.js';
import userRoutes from './user.js';



const router = express.Router();

// Use imported routes
router.use('/instruments', instrumentRoutes);
router.use('/users', userRoutes);


export default router;
