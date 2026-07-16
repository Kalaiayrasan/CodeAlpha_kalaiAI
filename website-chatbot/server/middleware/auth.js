'use strict';

/**
 * @fileoverview JWT authentication middleware.
 * Validates Bearer tokens from Authorization header and attaches req.user.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

/**
 * Extracts and verifies a JWT from the Authorization header.
 * On success, attaches the decoded user to req.user.
 * On failure, passes an error to next().
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('Authentication required. Please provide a Bearer token.');
      error.statusCode = 401;
      return next(error);
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
      const error = new Error('Authentication token is missing.');
      error.statusCode = 401;
      return next(error);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('[Auth] JWT_SECRET environment variable is not set!');
      const error = new Error('Server authentication configuration error.');
      error.statusCode = 500;
      return next(error);
    }

    // Verify the token
    const decoded = jwt.verify(token, secret);

    // Optionally fetch fresh user from DB to check isActive, role changes etc.
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      const error = new Error('User associated with this token no longer exists.');
      error.statusCode = 401;
      return next(error);
    }

    if (!user.isActive) {
      const error = new Error('This account has been deactivated.');
      error.statusCode = 403;
      return next(error);
    }

    // Attach decoded user to request
    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };

    logger.info(`[Auth] Authenticated user: ${user.username} (${user.role})`);
    next();
  } catch (error) {
    // JsonWebTokenError and TokenExpiredError are forwarded to errorHandler
    next(error);
  }
}

/**
 * Role-based access control middleware factory.
 * Returns middleware that checks if req.user has one of the allowed roles.
 *
 * @param {...string} roles - Allowed roles (e.g., 'superadmin', 'admin')
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.delete('/users/:id', authMiddleware, requireRole('superadmin'), deleteUser);
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      const error = new Error('Authentication required.');
      error.statusCode = 401;
      return next(error);
    }

    if (!roles.includes(req.user.role)) {
      const error = new Error(`Access denied. Required role: ${roles.join(' or ')}.`);
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
}

module.exports = { authMiddleware, requireRole };
