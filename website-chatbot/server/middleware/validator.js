'use strict';

/**
 * @fileoverview Express-validator validation chains for request input validation.
 * Exports named validator chains for chat, auth, and document upload endpoints.
 */

const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');

// ─── Validation Result Handler ────────────────────────────────────────────────

/**
 * Middleware that checks for validation errors and returns 422 if any exist.
 * Must be placed AFTER validation chain middleware in route definitions.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Request validation failed',
      errors: errors.array().map((e) => ({
        field: e.path || e.param,
        message: e.msg,
        value: e.value,
      })),
    });
  }
  next();
}

// ─── Chat Validators ──────────────────────────────────────────────────────────

/**
 * Validates the body of a chat message request.
 * - message: required string, 1–1000 chars
 * - sessionId: optional string
 */
const chatMessageValidator = [
  body('message')
    .exists({ checkFalsy: true })
    .withMessage('Message is required')
    .isString()
    .withMessage('Message must be a string')
    .trim()
    .notEmpty()
    .withMessage('Message cannot be empty')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),

  body('sessionId')
    .optional()
    .isString()
    .withMessage('Session ID must be a string')
    .trim()
    .isUUID()
    .withMessage('Session ID must be a valid UUID'),

  handleValidationErrors,
];

// ─── Auth Validators ──────────────────────────────────────────────────────────

/**
 * Validates the body of a login request.
 * - email: required, valid email format
 * - password: required, min 1 char
 */
const loginValidator = [
  body('email')
    .exists({ checkFalsy: true })
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim(),

  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required')
    .isString()
    .withMessage('Password must be a string')
    .isLength({ min: 1 })
    .withMessage('Password cannot be empty'),

  handleValidationErrors,
];

/**
 * Validates the body of a user registration request.
 * - username: required, 3–50 chars, alphanumeric + underscore/dash
 * - email: required, valid email
 * - password: required, min 8 chars, must have upper, lower, number
 * - role: optional, must be admin or superadmin
 */
const registerValidator = [
  body('username')
    .exists({ checkFalsy: true })
    .withMessage('Username is required')
    .isString()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  body('email')
    .exists({ checkFalsy: true })
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim(),

  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('role')
    .optional()
    .isIn(['admin', 'superadmin'])
    .withMessage('Role must be admin or superadmin'),

  handleValidationErrors,
];

/**
 * Validates the change-password request body.
 * - currentPassword: required
 * - newPassword: required, min 8 chars with complexity
 */
const changePasswordValidator = [
  body('currentPassword')
    .exists({ checkFalsy: true })
    .withMessage('Current password is required'),

  body('newPassword')
    .exists({ checkFalsy: true })
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  handleValidationErrors,
];

// ─── Document Upload Validators ───────────────────────────────────────────────

/**
 * Validates an upload document request.
 * File validation is handled by multer; this validates optional metadata.
 */
const uploadDocumentValidator = [
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),

  body('collectionName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Collection name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Collection name can only contain letters, numbers, underscores, and hyphens'),

  handleValidationErrors,
];

// ─── Param Validators ─────────────────────────────────────────────────────────

/**
 * Validates sessionId route parameter as UUID.
 */
const sessionIdParamValidator = [
  param('sessionId')
    .isUUID()
    .withMessage('Session ID must be a valid UUID'),

  handleValidationErrors,
];

/**
 * Validates MongoDB ObjectId in route param.
 */
const mongoIdParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID must be a valid MongoDB ObjectId'),

  handleValidationErrors,
];

// ─── Query Validators ─────────────────────────────────────────────────────────

/**
 * Validates pagination query parameters.
 */
const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  handleValidationErrors,
];

module.exports = {
  chatMessageValidator,
  loginValidator,
  registerValidator,
  changePasswordValidator,
  uploadDocumentValidator,
  sessionIdParamValidator,
  mongoIdParamValidator,
  paginationValidator,
  handleValidationErrors,
};
