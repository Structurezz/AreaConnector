import express from 'express';
import { playMusic, getMusicDetails } from '../app/controllers/musicController.js';
import validateRequest from '../app/middleware/validateRequest.js';
import { body, param } from 'express-validator';

const router = express.Router();

// Route to play music
router.post('/play', 
    [
        body('trackId').isString().withMessage('Track ID must be a string'),
        body('userId').isString().withMessage('User ID must be a string')
    ],
    validateRequest,
    playMusic
);

// Route to get music details
router.get('/details/:trackId', 
    [
        param('trackId').isString().withMessage('Track ID must be a string')
    ],
    validateRequest,
    getMusicDetails
);

export default router;
