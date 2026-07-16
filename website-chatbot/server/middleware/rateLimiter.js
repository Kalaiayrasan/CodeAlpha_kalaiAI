'use strict';

/**
 * @fileoverview Rate limiter middleware configurations.
 * Exports globalLimiter (100 req/15min) and chatLimiter (20 req/min).
 */

const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * Custom rate limit exceeded handler.
 * Returns a structured JSON response instead of the default text response.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function rateLimitHandler(req, res) {
  logger.warn(`[RateLimit] Limit exceeded for IP: ${req.ip} on path: ${req.path}`);
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please slow down and try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
}

/**
 * Global rate limiter applied to all API routes.
 * Allows up to 100 requests per 15-minute window per IP.
 *
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,  // Disable `X-RateLimit-*` headers
  handler: rateLimitHandler,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health' || req.path === '/health';
  },
  keyGenerator: (req) => {
    // Use forwarded IP if behind a proxy, otherwise direct IP
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  },
});

/**
 * Stricter rate limiter for chat endpoints.
 * Allows up to 20 requests per 1-minute window per IP.
 * Prevents abuse of expensive LLM API calls.
 *
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  },
  message: {
    success: false,
    message: 'Too many chat requests. Please wait a moment before sending another message.',
  },
});

/**
 * Strict rate limiter for authentication endpoints.
 * Allows up to 10 attempts per 15 minutes to prevent brute-force attacks.
 *
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`[RateLimit] Auth limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again in 15 minutes.',
    });
  },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  },
});

module.exports = { globalLimiter, chatLimiter, authLimiter };
