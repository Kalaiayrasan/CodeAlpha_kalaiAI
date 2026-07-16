'use strict';

/**
 * @fileoverview Mongoose Session model for managing chat sessions.
 * Stores conversation history and session metadata.
 */

const mongoose = require('mongoose');

/**
 * @typedef {Object} IMessage
 * @property {'user'|'assistant'|'system'} role - Message role
 * @property {string} content - Message text content
 * @property {Date} timestamp - When the message was created
 */

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: {
        values: ['user', 'assistant', 'system'],
        message: 'Role must be user, assistant, or system',
      },
      required: [true, 'Message role is required'],
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [10000, 'Message content too long'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

/**
 * @typedef {Object} ISessionMetadata
 * @property {string} [userAgent] - Browser user agent string
 * @property {string} [ip] - Client IP address
 * @property {string} [language] - Preferred language
 */

const metadataSchema = new mongoose.Schema(
  {
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    language: { type: String, default: 'en' },
    platform: { type: String, default: '' },
  },
  { _id: false }
);

/**
 * @typedef {Object} ISession
 * @property {string} sessionId - UUID-based session identifier
 * @property {mongoose.Types.ObjectId} [userId] - Optional linked user
 * @property {IMessage[]} messages - Conversation history
 * @property {ISessionMetadata} metadata - Session context metadata
 * @property {Date} expiresAt - TTL expiry for the session
 */

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: [true, 'Session ID is required'],
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    metadata: {
      type: metadataSchema,
      default: () => ({}),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ createdAt: -1 });

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Appends a message to the session's messages array.
 * @param {'user'|'assistant'|'system'} role
 * @param {string} content
 * @returns {Promise<ISession>}
 */
sessionSchema.methods.addMessage = async function addMessage(role, content) {
  this.messages.push({ role, content, timestamp: new Date() });
  return this.save();
};

/**
 * Returns the last N messages from the session.
 * @param {number} n - Number of messages to return
 * @returns {IMessage[]}
 */
sessionSchema.methods.getRecentMessages = function getRecentMessages(n = 10) {
  return this.messages.slice(-n);
};

/**
 * Clears all messages from the session.
 * @returns {Promise<ISession>}
 */
sessionSchema.methods.clearMessages = async function clearMessages() {
  this.messages = [];
  return this.save();
};

/**
 * Refreshes the session TTL by extending expiresAt by 24 hours from now.
 * @returns {Promise<ISession>}
 */
sessionSchema.methods.refreshExpiry = async function refreshExpiry() {
  this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return this.save();
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
