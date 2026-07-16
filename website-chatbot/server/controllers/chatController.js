/**
 * Chat Controller — Handles chat sessions and message processing
 */

const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const ragService = require('../services/ragService');
const Session = require('../models/Session');
const logger = require('../config/logger');

/**
 * POST /api/chat/session
 * Create a new chat session.
 */
const createSession = async (req, res, next) => {
  try {
    const sessionId = uuidv4();
    const session = await Session.create({
      sessionId,
      messages: [],
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      },
    });

    logger.info(`New session created: ${sessionId}`);
    res.status(201).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/message
 * Send a message and receive an AI response.
 */
const sendMessage = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { message, sessionId } = req.body;

  try {
    const result = await ragService.chat(sessionId || null, message);

    res.status(200).json({
      success: true,
      data: {
        response: result.response,
        sessionId: result.sessionId,
        tokensUsed: result.tokensUsed,
        latencyMs: result.latencyMs,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/history/:sessionId
 * Retrieve conversation history for a session.
 */
const getHistory = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        messages: session.messages,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/chat/session/:sessionId
 * Clear all messages in a session (soft reset).
 */
const clearSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOneAndUpdate(
      { sessionId },
      { $set: { messages: [] } },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    logger.info(`Session cleared: ${sessionId}`);
    res.status(200).json({ success: true, message: 'Session cleared successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createSession, sendMessage, getHistory, clearSession };
