/**
 * Admin Routes — Protected by JWT auth
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const {
  uploadDocument, reindex, getDocuments,
  deleteDocument, getChatLogs, getAnalytics,
} = require('../controllers/adminController');

// All admin routes require authentication
router.use(authMiddleware);

// Document management
router.post('/upload', upload.array('files', 10), handleMulterError, uploadDocument);
router.post('/reindex', reindex);
router.get('/documents', getDocuments);
router.delete('/documents/:id', deleteDocument);

// Analytics & logs
router.get('/logs', getChatLogs);
router.get('/analytics', getAnalytics);

module.exports = router;
