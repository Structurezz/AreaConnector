import express from 'express';
import { makeCall, getCallStatus } from '../app/controllers/callsController.js';
import validateRequest from '../app/middleware/validateRequest.js';
import { body } from 'express-validator';

const router = express.Router();

// Route to make a call
router.post('/make', 
    [
        body('phoneNumber').isString().isLength({ min: 10, max: 15 }).withMessage('Phone number must be between 10 and 15 characters'),
        body('message').optional().isString().withMessage('Message must be a string')
    ],
    validateRequest,
    makeCall
);

// Route to get call status
router.get('/status/:callId', 
    [
        body('callId').isUUID().withMessage('Call ID must be a valid UUID')
    ],
    validateRequest,
    getCallStatus
);

export default router;
