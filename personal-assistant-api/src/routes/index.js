import express from 'express';
import emotionalSupportRouter from './emotionalSupport.js';
import newsUpdatesRouter from './newsUpdates.js';
import schedulesRouter from './schedules.js';
import musicRouter from './music.js';
import callsRouter from './calls.js';
import transactionsRouter from './transactions.js';
import authRouter from './authRoutes.js'; // Import the auth router

const router = express.Router();

router.use('/emotional-support', emotionalSupportRouter);
router.use('/news-updates', newsUpdatesRouter);
router.use('/schedules', schedulesRouter);
router.use('/music', musicRouter);
router.use('/calls', callsRouter);
router.use('/transactions', transactionsRouter);
router.use('/auth', authRouter); // Add the auth routes

export default router;
