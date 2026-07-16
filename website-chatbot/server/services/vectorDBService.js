/**
 * Vector DB Service — Wraps ChromaDB client for document indexing and search
 */

const chromaClient = require('../vectorDB/chromaClient');
const embeddingService = require('./embeddingService');
const logger = require('../config/logger');

const COLLECTION_NAME = process.env.CHROMA_COLLECTION || 'restaurant_knowledge';

/**
 * Index an array of text chunks into ChromaDB.
 * @param {string[]} chunks - Text chunks to embed and store
 * @param {object} baseMetadata - Metadata to attach to all chunks
 * @returns {Promise<number>} Number of chunks indexed
 */
const indexDocuments = async (chunks, baseMetadata = {}) => {
  if (!chunks || chunks.length === 0) {
    logger.warn('No chunks provided to indexDocuments');
    return 0;
  }

  try {
    logger.info(`Embedding ${chunks.length} chunks...`);
    const embeddings = await embeddingService.embedBatch(chunks);

    const documents = chunks.map((chunk, i) => ({
      id: `${baseMetadata.docId || 'doc'}_chunk_${i}_${Date.now()}`,
      content: chunk,
      metadata: {
        ...baseMetadata,
        chunkIndex: i,
        chunkTotal: chunks.length,
        indexedAt: new Date().toISOString(),
      },
    }));

    await chromaClient.addDocuments(COLLECTION_NAME, documents, embeddings);
    logger.info(`✅ Indexed ${chunks.length} chunks into ChromaDB collection: ${COLLECTION_NAME}`);
    return chunks.length;
  } catch (error) {
    logger.error('Failed to index documents:', error);
    throw error;
  }
};

/**
 * Search the vector database for the most relevant chunks.
 * @param {string} query - The user query
 * @param {number} k - Number of results to return
 * @returns {Promise<string[]>} Array of relevant text chunks
 */
const search = async (query, k = 5) => {
  try {
    const queryEmbedding = await embeddingService.embedText(query);
    const results = await chromaClient.query(COLLECTION_NAME, queryEmbedding, k);

    // Filter by relevance (distance threshold)
    const DISTANCE_THRESHOLD = 1.5;
    const filtered = results.filter((r) => r.distance < DISTANCE_THRESHOLD);

    logger.info(`Vector search: ${filtered.length}/${results.length} results passed threshold`);
    return filtered.map((r) => r.content);
  } catch (error) {
    logger.error('Vector search failed:', error);
    return [];
  }
};

/**
 * Delete the entire collection and re-index from scratch.
 * @param {string[]} chunks
 * @param {object} metadata
 */
const deleteAndReindex = async (chunks, metadata = {}) => {
  try {
    await chromaClient.deleteCollection(COLLECTION_NAME);
    logger.info(`Deleted collection: ${COLLECTION_NAME}`);
    await indexDocuments(chunks, metadata);
  } catch (error) {
    logger.error('Failed to delete and reindex:', error);
    throw error;
  }
};

/**
 * Get stats about the current collection.
 * @returns {Promise<object>}
 */
const getStats = async () => {
  try {
    const collections = await chromaClient.listCollections();
    const target = collections.find((c) => c.name === COLLECTION_NAME);
    return {
      collectionName: COLLECTION_NAME,
      exists: !!target,
      collections: collections.map((c) => c.name),
    };
  } catch (error) {
    logger.error('Failed to get vector DB stats:', error);
    return { collectionName: COLLECTION_NAME, exists: false, error: error.message };
  }
};

/**
 * Check if ChromaDB is reachable.
 * @returns {Promise<boolean>}
 */
const healthCheck = async () => {
  return chromaClient.healthCheck();
};

module.exports = { indexDocuments, search, deleteAndReindex, getStats, healthCheck };
