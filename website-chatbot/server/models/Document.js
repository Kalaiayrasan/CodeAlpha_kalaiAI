'use strict';

/**
 * @fileoverview Mongoose Document model for tracking uploaded knowledge base files.
 * Stores metadata about documents that have been processed and indexed into ChromaDB.
 */

const mongoose = require('mongoose');

/**
 * @typedef {Object} IDocument
 * @property {string} filename - Stored filename on disk (uuid-based)
 * @property {string} originalName - Original filename as uploaded
 * @property {'pdf'|'docx'|'txt'|'csv'} type - Document type
 * @property {string} mimeType - Full MIME type string
 * @property {number} chunksCount - Number of text chunks generated
 * @property {number} fileSize - File size in bytes
 * @property {'processing'|'indexed'|'failed'} status - Processing status
 * @property {string} [errorMessage] - Error detail if status is 'failed'
 * @property {mongoose.Types.ObjectId} uploadedBy - Admin user who uploaded
 * @property {string} collectionName - ChromaDB collection where indexed
 */

const documentSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: [true, 'Stored filename is required'],
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      maxlength: [255, 'Filename too long'],
    },
    type: {
      type: String,
      enum: {
        values: ['pdf', 'docx', 'txt', 'csv', 'json'],
        message: 'Document type must be pdf, docx, txt, csv, or json',
      },
      required: [true, 'Document type is required'],
    },
    mimeType: {
      type: String,
      default: '',
    },
    chunksCount: {
      type: Number,
      default: 0,
      min: [0, 'Chunk count cannot be negative'],
    },
    fileSize: {
      type: Number,
      default: 0,
      min: [0, 'File size cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['processing', 'indexed', 'failed'],
        message: 'Status must be processing, indexed, or failed',
      },
      default: 'processing',
      index: true,
    },
    errorMessage: {
      type: String,
      default: '',
      maxlength: [2000, 'Error message too long'],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    collectionName: {
      type: String,
      default: 'restaurant_knowledge',
    },
    processingStartedAt: {
      type: Date,
      default: null,
    },
    processingCompletedAt: {
      type: Date,
      default: null,
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
documentSchema.index({ status: 1 });
documentSchema.index({ createdAt: -1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ type: 1 });

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Marks the document as successfully indexed.
 * @param {number} chunksCount - Number of chunks generated
 * @returns {Promise<IDocument>}
 */
documentSchema.methods.markIndexed = async function markIndexed(chunksCount) {
  this.status = 'indexed';
  this.chunksCount = chunksCount;
  this.processingCompletedAt = new Date();
  this.errorMessage = '';
  return this.save();
};

/**
 * Marks the document as failed with an error message.
 * @param {string} errorMessage - Description of the failure
 * @returns {Promise<IDocument>}
 */
documentSchema.methods.markFailed = async function markFailed(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.processingCompletedAt = new Date();
  return this.save();
};

/**
 * Marks the document as currently being processed.
 * @returns {Promise<IDocument>}
 */
documentSchema.methods.markProcessing = async function markProcessing() {
  this.status = 'processing';
  this.processingStartedAt = new Date();
  return this.save();
};

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
