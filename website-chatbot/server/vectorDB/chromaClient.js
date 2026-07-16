'use strict';

/**
 * @fileoverview ChromaDB client wrapper.
 * Provides get/create collection, upsert, query, and health check operations.
 * Uses the chromadb npm package v1.7.x API.
 */

const { ChromaClient } = require('chromadb');
const logger = require('../config/logger');

/** Default ChromaDB URL */
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';

/** @type {ChromaClient|null} */
let chromaInstance = null;

/**
 * Lazily initializes and returns the ChromaDB client singleton.
 * @returns {ChromaClient}
 */
function getChromaClient() {
  if (chromaInstance) return chromaInstance;

  logger.info(`[ChromaDB] Initializing client at: ${CHROMA_URL}`);
  chromaInstance = new ChromaClient({ path: CHROMA_URL });
  return chromaInstance;
}

/**
 * Gets an existing ChromaDB collection or creates it if it doesn't exist.
 * Collections use cosine distance metric for semantic similarity.
 *
 * @param {string} name - Collection name
 * @returns {Promise<import('chromadb').Collection>} ChromaDB collection
 */
async function getCollection(name) {
  const client = getChromaClient();
  logger.info(`[ChromaDB] Getting or creating collection: ${name}`);

  const collection = await client.getOrCreateCollection({
    name,
    metadata: {
      'hnsw:space': 'cosine',
      description: 'Restaurant knowledge base for RAG chatbot',
    },
  });

  logger.info(`[ChromaDB] Collection ready: ${name}`);
  return collection;
}

/**
 * Adds or updates documents in a ChromaDB collection.
 * Uses upsert to handle both new documents and updates.
 *
 * @param {string} collectionName - Target collection name
 * @param {Array<{id: string, content: string, metadata?: Object}>} documents - Documents to index
 * @param {number[][]} embeddings - Pre-computed embedding vectors (same order as documents)
 * @returns {Promise<void>}
 * @throws {Error} If documents and embeddings arrays have different lengths
 */
async function addDocuments(collectionName, documents, embeddings) {
  if (documents.length !== embeddings.length) {
    throw new Error(`Documents (${documents.length}) and embeddings (${embeddings.length}) must have equal length`);
  }

  if (documents.length === 0) {
    logger.warn('[ChromaDB] addDocuments called with empty arrays — skipping');
    return;
  }

  const collection = await getCollection(collectionName);

  const ids = documents.map((d) => d.id);
  const contents = documents.map((d) => d.content);
  const metadatas = documents.map((d) => d.metadata || {});

  logger.info(`[ChromaDB] Upserting ${documents.length} documents into collection: ${collectionName}`);

  // ChromaDB v1.7.x uses upsert for add-or-update
  await collection.upsert({
    ids,
    documents: contents,
    embeddings,
    metadatas,
  });

  logger.info(`[ChromaDB] Successfully upserted ${documents.length} documents`);
}

/**
 * Queries a ChromaDB collection with an embedding vector to find similar documents.
 *
 * @param {string} collectionName - Collection to query
 * @param {number[]} queryEmbedding - Query vector
 * @param {number} [nResults=5] - Number of results to return
 * @returns {Promise<Array<{id: string, content: string, metadata: Object, distance: number}>>}
 */
async function query(collectionName, queryEmbedding, nResults = 5) {
  const collection = await getCollection(collectionName);

  logger.info(`[ChromaDB] Querying collection: ${collectionName} (top-${nResults})`);

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults,
    include: ['documents', 'metadatas', 'distances'],
  });

  // Flatten the nested result structure
  const ids = results.ids[0] || [];
  const documents = results.documents[0] || [];
  const metadatas = results.metadatas[0] || [];
  const distances = results.distances[0] || [];

  const formatted = ids.map((id, i) => ({
    id,
    content: documents[i] || '',
    metadata: metadatas[i] || {},
    distance: distances[i] || 0,
  }));

  logger.info(`[ChromaDB] Query returned ${formatted.length} results`);
  return formatted;
}

/**
 * Deletes an entire ChromaDB collection by name.
 *
 * @param {string} name - Collection name to delete
 * @returns {Promise<void>}
 */
async function deleteCollection(name) {
  const client = getChromaClient();
  logger.info(`[ChromaDB] Deleting collection: ${name}`);

  try {
    await client.deleteCollection({ name });
    logger.info(`[ChromaDB] Collection deleted: ${name}`);
  } catch (error) {
    if (error.message && error.message.includes('does not exist')) {
      logger.warn(`[ChromaDB] Collection ${name} does not exist — skipping delete`);
    } else {
      throw error;
    }
  }
}

/**
 * Lists all collections in the ChromaDB instance.
 *
 * @returns {Promise<string[]>} Array of collection names
 */
async function listCollections() {
  const client = getChromaClient();
  logger.info('[ChromaDB] Listing all collections');

  const collections = await client.listCollections();
  const names = collections.map((c) => (typeof c === 'string' ? c : c.name));
  logger.info(`[ChromaDB] Found ${names.length} collections: ${names.join(', ')}`);
  return names;
}

/**
 * Returns the number of documents in a collection.
 *
 * @param {string} collectionName - Collection to count
 * @returns {Promise<number>} Document count
 */
async function getCollectionCount(collectionName) {
  const collection = await getCollection(collectionName);
  const count = await collection.count();
  logger.info(`[ChromaDB] Collection ${collectionName} has ${count} documents`);
  return count;
}

/**
 * Checks ChromaDB health by attempting to list collections.
 *
 * @returns {Promise<{healthy: boolean, url: string, collectionsCount?: number, error?: string}>}
 */
async function healthCheck() {
  try {
    const client = getChromaClient();
    const collections = await client.listCollections();
    return {
      healthy: true,
      url: CHROMA_URL,
      collectionsCount: collections.length,
    };
  } catch (error) {
    logger.error(`[ChromaDB] Health check failed: ${error.message}`);
    return {
      healthy: false,
      url: CHROMA_URL,
      error: error.message,
    };
  }
}

/**
 * Deletes all documents from a collection without deleting the collection itself.
 * Achieved by deleting the collection and allowing it to be recreated on next use.
 *
 * @param {string} collectionName - Collection to clear
 * @returns {Promise<void>}
 */
async function clearCollection(collectionName) {
  logger.info(`[ChromaDB] Clearing collection: ${collectionName}`);
  await deleteCollection(collectionName);
  // Collection will be auto-recreated on next getCollection call
  logger.info(`[ChromaDB] Collection cleared: ${collectionName}`);
}

module.exports = {
  getChromaClient,
  getCollection,
  addDocuments,
  query,
  deleteCollection,
  clearCollection,
  listCollections,
  getCollectionCount,
  healthCheck,
};
