import express from 'express';
import {
    register,
    login,
    forgotPassword,
    verifySMSCode,
} from '../app/controllers/authController.js'; // Adjust the path as necessary

const router = express.Router();

// Route for user registration
router.post('/register', register);

// Route for user login
router.post('/login', login);

// Route for password recovery
router.post('/forgot-password', forgotPassword);

// Route for SMS verification
router.post('/verify-sms', verifySMSCode);

export default router;
