import express from 'express';
import { getSchedule, addEvent, updateEvent, deleteEvent } from '../app/controllers/schedulesController.js';
import validateRequest from '../app/middleware/validateRequest.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Route to get the schedule for a specific user or date
router.get('/',
    [
        query('userId').optional().isString().withMessage('User ID must be a string'),
        query('date').optional().isDate().withMessage('Date must be a valid date format')
    ],
    validateRequest,
    getSchedule
);

// Route to add a new event to the schedule
router.post('/add',
    [
        body('userId').isString().withMessage('User ID must be a string'),
        body('title').isString().withMessage('Title must be a string'),
        body('startTime').isISO8601().withMessage('Start time must be a valid ISO8601 date string'),
        body('endTime').isISO8601().withMessage('End time must be a valid ISO8601 date string'),
        body('description').optional().isString().withMessage('Description must be a string')
    ],
    validateRequest,
    addEvent
);

// Route to update an existing event
router.put('/update/:eventId',
    [
        param('eventId').isString().withMessage('Event ID must be a string'),
        body('title').optional().isString().withMessage('Title must be a string'),
        body('startTime').optional().isISO8601().withMessage('Start time must be a valid ISO8601 date string'),
        body('endTime').optional().isISO8601().withMessage('End time must be a valid ISO8601 date string'),
        body('description').optional().isString().withMessage('Description must be a string')
    ],
    validateRequest,
    updateEvent
);

// Route to delete an event
router.delete('/delete/:eventId',
    [
        param('eventId').isString().withMessage('Event ID must be a string')
    ],
    validateRequest,
    deleteEvent
);

export default router;
