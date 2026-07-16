'use strict';

/**
 * @fileoverview MongoDB/Mongoose connection with auto-fallback to in-memory MongoDB.
 * In development, if no external MongoDB is reachable, automatically starts
 * an embedded MongoMemoryServer so the app works with zero external dependencies.
 */

const mongoose = require('mongoose');
const logger = require('./logger');

let mongod = null; // MongoMemoryServer instance (if used)
let isIntentionalClose = false;

/**
 * Attempts to start an embedded in-memory MongoDB server.
 * @returns {Promise<string>} The URI of the in-memory server
 */
async function startMemoryServer() {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create({
    instance: { dbName: 'chatbot_db' },
  });
  const uri = mongod.getUri();
  logger.info('[MongoDB] 🧠 Using embedded in-memory MongoDB (no external DB required)');
  return uri;
}

/**
 * Connects to MongoDB. If MONGODB_URI is set, uses that.
 * Otherwise falls back to an embedded in-memory MongoDB.
 * @returns {Promise<void>}
 */
async function connectDB() {
  isIntentionalClose = false;

  let uri = process.env.MONGODB_URI || '';

  // If no URI provided or it points to localhost, try connecting first;
  // if that fails, fall back to in-memory MongoDB
  const isLocalhost = uri === '' || uri.includes('localhost') || uri.includes('127.0.0.1');

  const options = {
    serverSelectionTimeoutMS: 3000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 1,
  };

  if (!isLocalhost) {
    // Cloud URI — connect directly
    try {
      logger.info(`[MongoDB] Connecting to cloud URI...`);
      await mongoose.connect(uri, options);
      logger.info('[MongoDB] ✅ Successfully connected to MongoDB Atlas');
      await ensureAdminUser();
      return;
    } catch (err) {
      logger.error(`[MongoDB] Cloud connection failed: ${err.message}`);
      throw err;
    }
  }

  // Try local MongoDB first (if it happens to be running)
  if (uri) {
    try {
      logger.info(`[MongoDB] Trying local MongoDB at ${uri}...`);
      await mongoose.connect(uri, { ...options, serverSelectionTimeoutMS: 2000 });
      logger.info('[MongoDB] ✅ Connected to local MongoDB');
      await ensureAdminUser();
      return;
    } catch {
      logger.warn('[MongoDB] Local MongoDB not available — switching to embedded in-memory MongoDB');
      await mongoose.disconnect().catch(() => {});
    }
  }

  // Fall back to embedded in-memory MongoDB
  try {
    const memUri = await startMemoryServer();
    await mongoose.connect(memUri, options);
    logger.info('[MongoDB] ✅ Embedded MongoDB ready');
    await ensureAdminUser();
  } catch (err) {
    logger.error(`[MongoDB] Failed to start embedded MongoDB: ${err.message}`);
    throw err;
  }
}

/**
 * Ensures a default admin user exists in the database.
 * Creates one automatically if none is found.
 */
async function ensureAdminUser() {
  try {
    const User = require('../models/User');
    const count = await User.countDocuments({});
    if (count === 0) {
      const email = process.env.ADMIN_EMAIL || 'admin@kalairestaurant.com';
      const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
      const username = process.env.ADMIN_USERNAME || 'admin';

      await User.create({ username, email, password, role: 'superadmin' });
      logger.info(`[MongoDB] 👤 Default admin user created: ${email}`);
    }
  } catch (err) {
    logger.warn(`[MongoDB] Could not create admin user: ${err.message}`);
  }
}

// ─── Mongoose Event Listeners ─────────────────────────────────────────────────

mongoose.connection.on('connected', () => {
  logger.info('[MongoDB] Mongoose connection established');
});

mongoose.connection.on('error', (err) => {
  logger.error(`[MongoDB] Mongoose connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  if (!isIntentionalClose && !mongod) {
    // Only log, don't loop-reconnect — embedded server handles persistence
    logger.warn('[MongoDB] Mongoose connection disconnected');
  }
});

mongoose.connection.on('reconnected', () => {
  logger.info('[MongoDB] Mongoose reconnected successfully');
});

/**
 * Gracefully closes the MongoDB connection and stops embedded server if used.
 * @returns {Promise<void>}
 */
async function disconnectDB() {
  isIntentionalClose = true;
  try {
    await mongoose.connection.close(false);
    logger.info('[MongoDB] Connection closed gracefully');
    if (mongod) {
      await mongod.stop();
      logger.info('[MongoDB] Embedded MongoDB server stopped');
    }
  } catch (error) {
    logger.error(`[MongoDB] Error closing connection: ${error.message}`);
    throw error;
  }
}

/**
 * Returns the current Mongoose connection state as a readable string.
 * @returns {'connected'|'disconnected'|'connecting'|'disconnecting'|'unknown'}
 */
function getConnectionState() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
}

module.exports = { connectDB, disconnectDB, getConnectionState };
