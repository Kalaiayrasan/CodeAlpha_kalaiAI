/**
 * Admin Controller — Document management, analytics, and chat logs
 */

const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const ChatLog = require('../models/ChatLog');
const Session = require('../models/Session');
const documentProcessor = require('../embeddings/documentProcessor');
const vectorDBService = require('../services/vectorDBService');
const logger = require('../config/logger');

/**
 * POST /api/admin/upload
 * Upload and index document(s) into the knowledge base.
 */
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const results = [];

    for (const file of req.files) {
      // Create document record
      const doc = await Document.create({
        filename: file.filename,
        originalName: file.originalname,
        type: path.extname(file.originalname).replace('.', '').toLowerCase(),
        status: 'processing',
        uploadedBy: req.user?.id,
        filePath: file.path,
      });

      // Process asynchronously
      processDocumentAsync(doc, file).then((chunks) => {
        logger.info(`Document ${doc.originalName} indexed with ${chunks} chunks`);
      }).catch((err) => {
        logger.error(`Failed to index document ${doc.originalName}:`, err.message);
      });

      results.push({
        id: doc._id,
        originalName: doc.originalName,
        type: doc.type,
        status: doc.status,
      });
    }

    res.status(200).json({
      success: true,
      message: `${results.length} file(s) uploaded and being processed`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: process a single document file and index it
 */
const processDocumentAsync = async (doc, file) => {
  try {
    const chunks = await documentProcessor.processFile(file.path, file.mimetype);

    await vectorDBService.indexDocuments(chunks, {
      docId: doc._id.toString(),
      originalName: doc.originalName,
      type: doc.type,
      uploadedAt: new Date().toISOString(),
    });

    await Document.findByIdAndUpdate(doc._id, {
      status: 'indexed',
      chunksCount: chunks.length,
    });

    return chunks.length;
  } catch (error) {
    await Document.findByIdAndUpdate(doc._id, { status: 'failed' });
    throw error;
  }
};

/**
 * POST /api/admin/reindex
 * Re-index all uploaded documents from scratch.
 */
const reindex = async (req, res, next) => {
  try {
    const documents = await Document.find({ status: 'indexed' });

    if (documents.length === 0) {
      return res.status(400).json({ success: false, message: 'No indexed documents found to reindex' });
    }

    let allChunks = [];
    let baseMetadata = { reindexedAt: new Date().toISOString() };

    for (const doc of documents) {
      try {
        if (doc.filePath && fs.existsSync(doc.filePath)) {
          const chunks = await documentProcessor.processFile(doc.filePath, `application/${doc.type}`);
          allChunks = allChunks.concat(chunks.map((c) => ({ chunk: c, meta: { ...baseMetadata, docId: doc._id.toString(), originalName: doc.originalName } })));
        }
      } catch (err) {
        logger.warn(`Skipping document ${doc.originalName}: ${err.message}`);
      }
    }

    if (allChunks.length > 0) {
      // Delete and reindex
      await vectorDBService.deleteAndReindex(
        allChunks.map((c) => c.chunk),
        baseMetadata
      );
    }

    // Update document statuses
    await Document.updateMany({ status: 'indexed' }, { $set: { status: 'indexed' } });

    logger.info(`Reindexed ${documents.length} documents (${allChunks.length} chunks)`);

    res.status(200).json({
      success: true,
      message: `Reindexed ${documents.length} documents with ${allChunks.length} total chunks`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/documents
 */
const getDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/documents/:id
 */
const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    // Remove physical file
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }

    await Document.findByIdAndDelete(req.params.id);
    logger.info(`Document deleted: ${doc.originalName}`);

    res.status(200).json({ success: true, message: 'Document deleted. Reindex to reflect changes.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/logs
 */
const getChatLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ChatLog.find().sort({ timestamp: -1 }).skip(skip).limit(limit),
      ChatLog.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics
 */
const getAnalytics = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalChats, avgStats, docsCount, dailyChats, topIntents] = await Promise.all([
      ChatLog.countDocuments(),
      ChatLog.aggregate([
        { $group: { _id: null, avgLatency: { $avg: '$latencyMs' }, totalTokens: { $sum: '$tokensUsed' } } },
      ]),
      Document.countDocuments({ status: 'indexed' }),
      ChatLog.aggregate([
        { $match: { timestamp: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ]),
      ChatLog.aggregate([
        { $match: { intent: { $exists: true } } },
        { $group: { _id: '$intent', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
        { $project: { intent: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalChats,
        avgLatency: Math.round(avgStats[0]?.avgLatency || 0),
        totalTokens: avgStats[0]?.totalTokens || 0,
        docsCount,
        dailyChats,
        topIntents,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadDocument, reindex, getDocuments, deleteDocument, getChatLogs, getAnalytics };
