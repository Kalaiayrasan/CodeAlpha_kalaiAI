'use strict';

/**
 * @fileoverview Centralized error handler middleware for Express.
 * Normalizes various error types into consistent JSON responses.
 */

const logger = require('../config/logger');

/**
 * @typedef {Object} ErrorResponse
 * @property {boolean} success - Always false for errors
 * @property {string} message - Human-readable error message
 * @property {Array} [errors] - Validation errors array (if applicable)
 * @property {string} [stack] - Stack trace (development only)
 */

/**
 * Handles Mongoose ValidationError — field-level validation failures.
 * @param {import('mongoose').Error.ValidationError} err
 * @returns {{ statusCode: number, message: string, errors: string[] }}
 */
function handleValidationError(err) {
  const errors = Object.values(err.errors).map((e) => e.message);
  return {
    statusCode: 400,
    message: 'Validation failed',
    errors,
  };
}

/**
 * Handles Mongoose CastError — invalid ObjectId or type mismatch.
 * @param {import('mongoose').Error.CastError} err
 * @returns {{ statusCode: number, message: string }}
 */
function handleCastError(err) {
  return {
    statusCode: 400,
    message: `Invalid value for field: ${err.path}`,
  };
}

/**
 * Handles MongoDB duplicate key errors (code 11000).
 * @param {Object} err
 * @returns {{ statusCode: number, message: string }}
 */
function handleDuplicateKeyError(err) {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  return {
    statusCode: 409,
    message: `Duplicate value for ${field}. Please use a different value.`,
  };
}

/**
 * Handles JWT JsonWebTokenError — malformed or invalid token.
 * @returns {{ statusCode: number, message: string }}
 */
function handleJWTError() {
  return {
    statusCode: 401,
    message: 'Invalid authentication token. Please log in again.',
  };
}

/**
 * Handles JWT TokenExpiredError — token has expired.
 * @returns {{ statusCode: number, message: string }}
 */
function handleJWTExpiredError() {
  return {
    statusCode: 401,
    message: 'Authentication token has expired. Please log in again.',
  };
}

/**
 * Handles express-validator validation result errors.
 * @param {Object} err
 * @returns {{ statusCode: number, message: string, errors: string[] }}
 */
function handleExpressValidatorError(err) {
  return {
    statusCode: 422,
    message: 'Request validation failed',
    errors: err.validationErrors || [],
  };
}

/**
 * Global Express error handling middleware.
 * Must be registered LAST (after all routes) in Express app.
 *
 * @param {Error} err - Error object thrown or passed to next()
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
function errorHandler(err, req, res, next) {
  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    const handled = handleValidationError(err);
    statusCode = handled.statusCode;
    message = handled.message;
    errors = handled.errors;
  } else if (err.name === 'CastError') {
    const handled = handleCastError(err);
    statusCode = handled.statusCode;
    message = handled.message;
  } else if (err.code === 11000) {
    const handled = handleDuplicateKeyError(err);
    statusCode = handled.statusCode;
    message = handled.message;
  } else if (err.name === 'JsonWebTokenError') {
    const handled = handleJWTError();
    statusCode = handled.statusCode;
    message = handled.message;
  } else if (err.name === 'TokenExpiredError') {
    const handled = handleJWTExpiredError();
    statusCode = handled.statusCode;
    message = handled.message;
  } else if (err.type === 'express-validator') {
    const handled = handleExpressValidatorError(err);
    statusCode = handled.statusCode;
    message = handled.message;
    errors = handled.errors;
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request payload is too large.';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON in request body.';
  }

  /** @type {ErrorResponse} */
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
