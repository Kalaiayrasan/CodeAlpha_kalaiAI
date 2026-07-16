/**
 * Health Check Route
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const vectorDBService = require('../services/vectorDBService');

router.get('/', async (req, res) => {
  let vectorDBStatus = 'disconnected';
  try {
    const healthy = await vectorDBService.healthCheck();
    vectorDBStatus = healthy ? 'connected' : 'disconnected';
  } catch {
    vectorDBStatus = 'disconnected';
  }

  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  const status = mongoStatus === 'connected' ? 'ok' : 'degraded';

  res.status(status === 'ok' ? 200 : 503).json({
    success: status === 'ok',
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    services: {
      mongodb: mongoStatus,
      vectorDB: vectorDBStatus,
      llmProvider: process.env.LLM_PROVIDER || 'openai',
    },
  });
});

module.exports = router;
