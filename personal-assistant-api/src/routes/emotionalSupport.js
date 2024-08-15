import express from 'express';
import { getEmotionalSupport } from '../app/controllers/emotionalSupportController.js';

const router = express.Router();

router.get('/', getEmotionalSupport);

export default router;
