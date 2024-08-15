import express from 'express';
import {
    register,
    login,
    forgotPassword,
    verifySMSCode,
} from '../app/controllers/authController.js';

const router = express.Router();

// Route for user registration with SMS verification
router.post('/register', register);

// Route for user login with SMS verification
router.post('/login', login);

// Route for password recovery
router.post('/forgot-password', forgotPassword);

// Route for SMS verification (could be used for both register and login)
router.post('/verify-sms', verifySMSCode);

export default router;
