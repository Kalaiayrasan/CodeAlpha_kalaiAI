'use strict';

/**
 * @fileoverview Multer upload middleware configuration.
 * Handles file uploads with type filtering and size limits.
 * Stores files in the uploads/ directory with UUID-based filenames.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/** Directory where uploaded files are stored */
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

/** Maximum file size: 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Maximum number of files per upload request */
const MAX_FILES = 10;

/** Allowed MIME types mapped to their extensions */
const ALLOWED_MIME_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/csv': 'csv',
  'application/json': 'json',
};

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  logger.info(`[Upload] Created uploads directory: ${UPLOAD_DIR}`);
}

/**
 * Multer disk storage configuration.
 * Files are saved with UUID-based names to avoid collisions.
 */
const storage = multer.diskStorage({
  /**
   * Sets the destination folder for uploaded files.
   * @param {import('express').Request} req
   * @param {Express.Multer.File} file
   * @param {Function} cb
   */
  destination(req, file, cb) {
    cb(null, UPLOAD_DIR);
  },

  /**
   * Generates a unique filename while preserving the original extension.
   * Format: {uuid}-{original-sanitized-name}.{ext}
   * @param {import('express').Request} req
   * @param {Express.Multer.File} file
   * @param {Function} cb
   */
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);
    const uniqueName = `${uuidv4()}-${baseName}${ext}`;
    logger.info(`[Upload] Storing file as: ${uniqueName} (original: ${file.originalname})`);
    cb(null, uniqueName);
  },
});

/**
 * File filter function that rejects files with disallowed MIME types.
 * @param {import('express').Request} req
 * @param {Express.Multer.File} file
 * @param {Function} cb
 */
function fileFilter(req, file, cb) {
  const allowedTypes = Object.keys(ALLOWED_MIME_TYPES);

  if (allowedTypes.includes(file.mimetype)) {
    logger.info(`[Upload] Accepted file: ${file.originalname} (${file.mimetype})`);
    cb(null, true);
  } else {
    logger.warn(`[Upload] Rejected file: ${file.originalname} (${file.mimetype}) - not allowed`);
    cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `File type not allowed: ${file.mimetype}. Allowed types: PDF, DOCX, TXT, CSV, JSON`
      ),
      false
    );
  }
}

/**
 * Main multer upload instance.
 * Configured for disk storage with MIME type filtering and size limits.
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
});

/**
 * Multer error handler middleware.
 * Converts multer-specific errors into structured JSON responses.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    logger.error(`[Upload] Multer error: ${err.code} - ${err.message}`);

    const errorMessages = {
      LIMIT_FILE_SIZE: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
      LIMIT_FILE_COUNT: `Too many files. Maximum is ${MAX_FILES} files per upload.`,
      LIMIT_UNEXPECTED_FILE: err.message || 'Unexpected file field.',
      LIMIT_PART_COUNT: 'Too many form parts.',
      LIMIT_FIELD_KEY: 'Field name too long.',
      LIMIT_FIELD_VALUE: 'Field value too long.',
      LIMIT_FIELD_COUNT: 'Too many fields.',
    };

    return res.status(400).json({
      success: false,
      message: errorMessages[err.code] || `Upload error: ${err.message}`,
    });
  }

  if (err) {
    return next(err);
  }

  next();
}

/**
 * Gets the document type from a MIME type string.
 * @param {string} mimeType - MIME type of the file
 * @returns {string} Document type extension
 */
function getDocumentType(mimeType) {
  return ALLOWED_MIME_TYPES[mimeType] || 'unknown';
}

module.exports = {
  upload,
  handleMulterError,
  getDocumentType,
  UPLOAD_DIR,
  ALLOWED_MIME_TYPES,
};
