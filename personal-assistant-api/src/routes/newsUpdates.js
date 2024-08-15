import express from 'express';
import { getLatestNews, searchNews } from '../app/controllers/newsUpdatesController.js';
import validateRequest from '../app/middleware/validateRequest.js';
import { query, param } from 'express-validator';

const router = express.Router();

// Route to get latest news updates
router.get('/latest',
    [
        query('category').optional().isString().withMessage('Category must be a string'),
        query('language').optional().isString().withMessage('Language must be a string')
    ],
    validateRequest,
    getLatestNews
);

// Route to search news
router.get('/search',
    [
        query('query').isString().withMessage('Query must be a string'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page number must be a positive integer')
    ],
    validateRequest,
    searchNews
);

export default router;
