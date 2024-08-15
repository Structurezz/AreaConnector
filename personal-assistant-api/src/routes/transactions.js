import express from 'express';
import { initiateTransaction, getTransactionStatus, listTransactions } from '../app/controllers/transactionController.js';
import validateRequest from '../app/middleware/validateRequest.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Route to initiate a new transaction
router.post('/initiate',
    [
        body('userId').isString().withMessage('User ID must be a string'),
        body('amount').isNumeric().withMessage('Amount must be a number'),
        body('recipientAccount').isString().withMessage('Recipient account must be a string'),
        body('transactionType').isString().withMessage('Transaction type must be a string')
    ],
    validateRequest,
    initiateTransaction
);

// Route to get the status of a transaction
router.get('/status/:transactionId',
    [
        param('transactionId').isString().withMessage('Transaction ID must be a string')
    ],
    validateRequest,
    getTransactionStatus
);

// Route to list recent transactions
router.get('/list',
    [
        query('userId').isString().withMessage('User ID must be a string'),
        query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer')
    ],
    validateRequest,
    listTransactions
);

export default router;
