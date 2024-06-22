import express from 'express';
import instrumentRoutes from './usedinstruments.js';

const router = express.Router();

// Use imported routes
router.use('/', instrumentRoutes);



export default router;