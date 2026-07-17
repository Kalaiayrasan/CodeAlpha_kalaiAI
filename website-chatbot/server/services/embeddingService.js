'use strict';

/**
 * @fileoverview Embedding service for generating text vector embeddings via OpenAI.
 * Uses text-embedding-3-small model with in-memory caching via node-cache.
 */

const { OpenAI } = require('openai');
const NodeCache = require('node-cache');
const crypto = require('crypto');
const logger = require('../config/logger');

/** Cache embeddings for 1 hour (3600 seconds) */
const embeddingCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

/** Maximum texts per batch embedding call */
const BATCH_SIZE = 100;

/** Embedding model to use */
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

/** Dimensions for the chosen model (3-small = 1536) */
const EMBEDDING_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10);

/** @type {OpenAI|null} */
let client = null;

/**
 * Lazily initializes and returns the OpenAI client.
 * @returns {OpenAI}
 * @throws {Error} If OPENAI_API_KEY is missing
 */
function getClient() {
  if (client) return client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set. Embedding service requires OpenAI.');
  }

  const baseURL = process.env.OPENAI_BASE_URL || undefined;
  client = new OpenAI({ apiKey, baseURL });
  return client;
}

/**
 * Generates a cache key for a given text by hashing its content.
 * @param {string} text - Input text
 * @returns {string} MD5 hash used as cache key
 */
function getCacheKey(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

/**
 * Cleans text before embedding: trims whitespace, collapses multiple spaces.
 * @param {string} text - Raw input text
 * @returns {string} Cleaned text
 */
function preprocessText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Generates an embedding vector for a single text string.
 * Results are cached in-memory using the text's MD5 hash as key.
 *
 * @param {string} text - Text to embed (max ~8191 tokens)
 * @returns {Promise<number[]>} Float array representing the embedding
 * @throws {Error} If text is empty or OpenAI call fails
 */
async function embedText(text) {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    throw new Error('embedText requires a non-empty string input');
  }

  const cleaned = preprocessText(text);
  const cacheKey = getCacheKey(cleaned);

  // Check cache first
  const cached = embeddingCache.get(cacheKey);
  if (cached) {
    logger.debug(`[Embedding] Cache hit for text: "${cleaned.substring(0, 50)}..."`);
    return cached;
  }

  logger.info(`[Embedding] Generating embedding for text (${cleaned.length} chars)`);

  const openai = getClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: cleaned,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const embedding = response.data[0].embedding;

  // Store in cache
  embeddingCache.set(cacheKey, embedding);
  logger.info(`[Embedding] Embedding generated and cached. Dimensions: ${embedding.length}`);

  return embedding;
}

/**
 * Generates embeddings for an array of texts in batches.
 * Processes texts in chunks of BATCH_SIZE to avoid API limits.
 * Uses cache to avoid re-embedding duplicate/cached texts.
 *
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} Array of embedding vectors in the same order as input
 * @throws {Error} If any batch fails
 */
async function embedBatch(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('embedBatch requires a non-empty array of strings');
  }

  const openai = getClient();
  const results = new Array(texts.length);
  const uncachedIndices = [];
  const uncachedTexts = [];

  // Identify which texts need embedding (not cached)
  for (let i = 0; i < texts.length; i++) {
    const cleaned = preprocessText(texts[i]);
    const cacheKey = getCacheKey(cleaned);
    const cached = embeddingCache.get(cacheKey);

    if (cached) {
      results[i] = cached;
      logger.debug(`[Embedding] Batch cache hit for index ${i}`);
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(cleaned);
    }
  }

  if (uncachedTexts.length === 0) {
    logger.info('[Embedding] All texts served from cache');
    return results;
  }

  logger.info(`[Embedding] Embedding ${uncachedTexts.length} texts in batches of ${BATCH_SIZE}`);

  // Process uncached texts in batches
  for (let batchStart = 0; batchStart < uncachedTexts.length; batchStart += BATCH_SIZE) {
    const batchTexts = uncachedTexts.slice(batchStart, batchStart + BATCH_SIZE);
    const batchIndices = uncachedIndices.slice(batchStart, batchStart + BATCH_SIZE);

    logger.info(`[Embedding] Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: ${batchTexts.length} texts`);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batchTexts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    // Map results back and cache them
    for (let j = 0; j < response.data.length; j++) {
      const embedding = response.data[j].embedding;
      const originalIndex = batchIndices[j];
      const cacheKey = getCacheKey(batchTexts[j]);

      results[originalIndex] = embedding;
      embeddingCache.set(cacheKey, embedding);
    }

    // Rate limiting pause between batches (100ms)
    if (batchStart + BATCH_SIZE < uncachedTexts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  logger.info(`[Embedding] Batch embedding complete. Total: ${texts.length} texts`);
  return results;
}

/**
 * Returns the current size of the embedding cache.
 * @returns {{ keys: number, hits: number, misses: number }}
 */
function getCacheStats() {
  const stats = embeddingCache.getStats();
  return {
    keys: embeddingCache.keys().length,
    hits: stats.hits,
    misses: stats.misses,
  };
}

/**
 * Clears the embedding cache.
 */
function clearCache() {
  embeddingCache.flushAll();
  logger.info('[Embedding] Cache cleared');
}

module.exports = {
  embedText,
  embedBatch,
  getCacheStats,
  clearCache,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
};
