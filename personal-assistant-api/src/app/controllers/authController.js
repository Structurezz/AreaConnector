import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User  from '../models/User.js'; // assuming you have a User model
import { sendSMS } from '../services/smsService.js'; // assuming you have an SMS service
import { sendEmail } from '../services/emailService.js'; // assuming you have an email service

export const register = async (req, res) => {
    try {
      const { name, email, password, phone } = req.body;
  
      // Sending a welcome email
      await sendEmail(
        email,
        'Welcome to Our Service',
        'Thank you for registering!',
        '<h1>Welcome onBoard!!</h1>'
      );
  
      // Check if user already exists
      let user = await User.findOne({ where: { email } });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }
  
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
  
      // Create user
      user = await User.create({
        name,
        email,
        password: hashedPassword,
        phone,
      });
  
      // Generate SMS verification code
      const smsCode = Math.floor(100000 + Math.random() * 900000).toString();
      await sendSMS(phone, `Your verification code is ${smsCode}`);
      
      // Store the verification code
      user.smsCode = smsCode;
      await user.save();
  
      res.status(201).json({ message: 'User registered successfully, please verify your phone number.' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };
  
  export const login = async (req, res) => {
    try {
      const { email, password, smsCode } = req.body;
  
      // Check if user exists
      let user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      // Check SMS verification code
      if (user.smsCode !== smsCode) {
        return res.status(400).json({ message: 'Invalid SMS verification code' });
      }
  
      // Generate JWT token
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
      res.json({ token });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };
  
  export const forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;
  
      // Check if user exists
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
  
      // Generate reset token
      const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  
      // Send reset token via email
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await sendEmail(email, 'Password Reset', `Click here to reset your password: ${resetLink}`);
  
      res.json({ message: 'Password reset link sent to your email.' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };
  
  export const verifySMSCode = async (req, res) => {
    try {
      const { userId, smsCode } = req.body;
  
      // Find user by ID
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
  
      // Verify SMS code
      if (user.smsCode !== smsCode) {
        return res.status(400).json({ message: 'Invalid SMS verification code' });
      }
  
      // Clear the verification code after successful verification
      user.smsCode = null;
      await user.save();
  
      res.json({ message: 'Phone number verified successfully.' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };