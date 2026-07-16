/**
 * Chat Routes
 */
const express = require('express');
const router = express.Router();
const { chatLimiter } = require('../middleware/rateLimiter');
const { chatMessageValidator } = require('../middleware/validator');
const { createSession, sendMessage, getHistory, clearSession } = require('../controllers/chatController');

// POST /api/chat/session — Create new session
router.post('/session', createSession);

// POST /api/chat/message — Send message (rate limited)
router.post('/message', chatLimiter, chatMessageValidator, sendMessage);

// GET /api/chat/history/:sessionId — Get conversation history
router.get('/history/:sessionId', getHistory);

// DELETE /api/chat/session/:sessionId — Clear session
router.delete('/session/:sessionId', clearSession);

module.exports = router;
