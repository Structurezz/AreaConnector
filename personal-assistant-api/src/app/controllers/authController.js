import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User  from '../models/User.js'; // assuming you have a User model
//import { sendSMS } from '../services/smsService.js'; // assuming you have an SMS service
import { sendEmail } from '../services/emailService.js'; // assuming you have an email service
import { registerSchema, loginSchema,  forgotPasswordSchema, verifySMSCodeSchema} from '../schema/authSchemas.js';
import { validateRequest } from '../middleware/validateeRequest.js';

// Inside your register function
export const register = async (req, res) => {
  
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate SMS verification code
    const smsCode = Math.floor(100000 + Math.random() * 900000).toString();
    await sendSMS(phone, `Your verification code is ${smsCode}`); // Ensure sendSMS is defined

    // Create user
    user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      smsCode,
    });
    await user.save();

    // Send a welcome email after successful user creation
    await sendEmail(
      email,
      'Welcome to Our Service',
      'Thank you for registering!',
      '<h1>Welcome onBoard!!</h1>'
    );

    res.status(201).json({ message: 'User registered successfully, please verify your phone number.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

  
export const login = [
  validateRequest(loginSchema),
  async (req, res) => {
    try {
      const { email, password, smsCode } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      if (user.smsCode !== smsCode) {
        return res.status(400).json({ message: 'Invalid SMS verification code' });
      }

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      await sendEmail(
        email,
        'Login Notification',
        'You have successfully logged into your account.',
        '<h1>Login Successful</h1><p>If this wasn’t you, please secure your account immediately.</p>'
      );

      res.json({ token });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },
];
  
export const forgotPassword = [
  validateRequest(forgotPasswordSchema),
  async (req, res) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }

      const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      await sendEmail(email, 'Password Reset', `Click here to reset your password: ${resetLink}`);

      res.json({ message: 'Password reset link sent to your email.' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },
];
  
export const verifySMSCode = [
  validateRequest(verifySMSCodeSchema),
  async (req, res) => {
    try {
      const { userId, smsCode } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }

      if (user.smsCode !== smsCode) {
        return res.status(400).json({ message: 'Invalid SMS verification code' });
      }

      user.smsCode = null;
      await user.save();

      res.json({ message: 'Phone number verified successfully.' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  },
];