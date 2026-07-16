/**
 * Auth Controller — Admin authentication
 */

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../config/logger');

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    logger.info(`Admin login: ${email}`);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register
 * Only accessible if no users exist, or by superadmin
 */
const register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { username, email, password, role } = req.body;

  try {
    const existingCount = await User.countDocuments();
    // Only allow if first user (setup) OR if caller is superadmin
    if (existingCount > 0) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(403).json({ success: false, message: 'Forbidden: Admin registration requires superadmin token' });
      }
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'superadmin') {
          return res.status(403).json({ success: false, message: 'Only superadmins can create new admins' });
        }
      } catch {
        return res.status(403).json({ success: false, message: 'Invalid token' });
      }
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({
      username,
      email,
      password,
      role: existingCount === 0 ? 'superadmin' : (role || 'admin'),
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`New user registered: ${email} (${user.role})`);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: { id: user._id, username: user.username, email: user.email, role: user.role } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);
    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, register, getProfile, changePassword };
