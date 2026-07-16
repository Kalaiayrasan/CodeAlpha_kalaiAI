'use strict';

/**
 * @fileoverview Document processor for the RAG pipeline.
 * Handles extraction of text from PDF, DOCX, TXT, CSV files,
 * plus sliding-window chunking and text cleaning.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

// ─── Text Cleaning ────────────────────────────────────────────────────────────

/**
 * Cleans extracted text by removing excessive whitespace, control characters,
 * and other noise that would degrade embedding quality.
 *
 * @param {string} text - Raw extracted text
 * @returns {string} Cleaned text
 */
function cleanText(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/\r\n/g, '\n')           // normalize line endings
    .replace(/\r/g, '\n')
    .replace(/[^\x20-\x7E\n\t]/g, ' ') // remove non-printable except newline/tab
    .replace(/[ \t]+/g, ' ')           // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')        // collapse excessive blank lines
    .replace(/^\s+|\s+$/gm, '')        // trim each line
    .trim();
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

/**
 * Splits text into overlapping chunks using a sliding window approach.
 * Tries to split on sentence boundaries for better semantic coherence.
 *
 * @param {string} text - Full document text
 * @param {number} [chunkSize=500] - Target character count per chunk
 * @param {number} [overlap=50] - Character overlap between consecutive chunks
 * @returns {string[]} Array of non-empty text chunks
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  if (!text || text.trim() === '') return [];

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    if (end < text.length) {
      // Try to find a sentence boundary (period, ?, !) near the end
      const searchStart = Math.max(start, end - 100);
      const segment = text.substring(searchStart, end);
      const lastPeriod = Math.max(
        segment.lastIndexOf('. '),
        segment.lastIndexOf('? '),
        segment.lastIndexOf('! '),
        segment.lastIndexOf('\n')
      );

      if (lastPeriod !== -1) {
        end = searchStart + lastPeriod + 1;
      }
    }

    const chunk = text.substring(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move start forward by chunkSize - overlap
    start = end - overlap;
    if (start <= 0 || start >= text.length - 1) break;
  }

  logger.info(`[Processor] Split text into ${chunks.length} chunks (size: ${chunkSize}, overlap: ${overlap})`);
  return chunks.filter((c) => c.trim().length > 20); // drop tiny chunks
}

// ─── PDF Parser ───────────────────────────────────────────────────────────────

/**
 * Extracts text from a PDF file using pdf-parse.
 * @param {string} filePath - Absolute path to the PDF file
 * @returns {Promise<string>} Extracted plain text
 */
async function processPDF(filePath) {
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);
  logger.info(`[Processor] Parsing PDF: ${path.basename(filePath)}`);

  const data = await pdfParse(buffer);
  logger.info(`[Processor] PDF has ${data.numpages} pages. Extracted ${data.text.length} chars`);
  return cleanText(data.text);
}

// ─── DOCX Parser ─────────────────────────────────────────────────────────────

/**
 * Extracts plain text from a DOCX file using mammoth.
 * @param {string} filePath - Absolute path to the DOCX file
 * @returns {Promise<string>} Extracted plain text
 */
async function processDOCX(filePath) {
  const mammoth = require('mammoth');
  logger.info(`[Processor] Parsing DOCX: ${path.basename(filePath)}`);

  const result = await mammoth.extractRawText({ path: filePath });

  if (result.messages && result.messages.length > 0) {
    result.messages.forEach((msg) => {
      if (msg.type === 'warning') {
        logger.warn(`[Processor] DOCX warning: ${msg.message}`);
      }
    });
  }

  logger.info(`[Processor] DOCX extracted ${result.value.length} chars`);
  return cleanText(result.value);
}

// ─── TXT Parser ───────────────────────────────────────────────────────────────

/**
 * Reads a plain text file from disk.
 * @param {string} filePath - Absolute path to the TXT file
 * @returns {Promise<string>} File contents as string
 */
async function processTXT(filePath) {
  logger.info(`[Processor] Reading TXT: ${path.basename(filePath)}`);
  const text = fs.readFileSync(filePath, 'utf-8');
  logger.info(`[Processor] TXT read ${text.length} chars`);
  return cleanText(text);
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

/**
 * Parses a CSV file and formats each row as a Q&A pair.
 * Expects columns: question, answer (case-insensitive).
 * Falls back to joining all column values if headers don't match.
 *
 * @param {string} filePath - Absolute path to the CSV file
 * @returns {Promise<string>} Formatted text with Q/A pairs
 */
async function processCSV(filePath) {
  return new Promise((resolve, reject) => {
    const csvParser = require('csv-parser');
    const rows = [];

    logger.info(`[Processor] Parsing CSV: ${path.basename(filePath)}`);

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        logger.info(`[Processor] CSV parsed ${rows.length} rows`);

        const lines = rows.map((row) => {
          const keys = Object.keys(row).map((k) => k.toLowerCase());
          const questionKey = Object.keys(row).find((k) => k.toLowerCase().includes('question') || k.toLowerCase() === 'q');
          const answerKey = Object.keys(row).find((k) => k.toLowerCase().includes('answer') || k.toLowerCase() === 'a');

          if (questionKey && answerKey) {
            return `Q: ${row[questionKey]} A: ${row[answerKey]}`;
          }

          // Fall back: join all values
          return Object.entries(row)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ');
        });

        resolve(cleanText(lines.join('\n')));
      })
      .on('error', (err) => {
        logger.error(`[Processor] CSV parse error: ${err.message}`);
        reject(err);
      });
  });
}

// ─── JSON Parser ─────────────────────────────────────────────────────────────

/**
 * Parses a JSON knowledge-base file into flattened text.
 * Supports arrays of objects or nested structures.
 *
 * @param {string} filePath - Absolute path to the JSON file
 * @returns {Promise<string>} Formatted plain text
 */
async function processJSON(filePath) {
  logger.info(`[Processor] Parsing JSON: ${path.basename(filePath)}`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  function flattenObject(obj, prefix = '') {
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
    if (Array.isArray(obj)) {
      return obj.map((item) => flattenObject(item, prefix)).join('\n');
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.entries(obj)
        .map(([k, v]) => `${prefix}${k}: ${flattenObject(v, '')}`)
        .join('\n');
    }
    return '';
  }

  const text = flattenObject(data);
  logger.info(`[Processor] JSON extracted ${text.length} chars`);
  return cleanText(text);
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Processes a file and returns an array of text chunks ready for embedding.
 * Dispatches to the appropriate parser based on MIME type or file extension.
 *
 * @param {string} filePath - Absolute path to the file
 * @param {string} mimeType - MIME type of the file
 * @param {Object} [options={}] - Chunking options
 * @param {number} [options.chunkSize=500] - Characters per chunk
 * @param {number} [options.overlap=50] - Overlap characters
 * @returns {Promise<string[]>} Array of text chunks
 * @throws {Error} If the file type is unsupported or parsing fails
 */
async function processFile(filePath, mimeType, options = {}) {
  const { chunkSize = 500, overlap = 50 } = options;
  const ext = path.extname(filePath).toLowerCase().replace('.', '');

  logger.info(`[Processor] Processing file: ${path.basename(filePath)} (${mimeType})`);

  let text = '';

  if (mimeType === 'application/pdf' || ext === 'pdf') {
    text = await processPDF(filePath);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    text = await processDOCX(filePath);
  } else if (mimeType === 'text/plain' || ext === 'txt') {
    text = await processTXT(filePath);
  } else if (mimeType === 'text/csv' || mimeType === 'application/csv' || ext === 'csv') {
    text = await processCSV(filePath);
  } else if (mimeType === 'application/json' || ext === 'json') {
    text = await processJSON(filePath);
  } else {
    throw new Error(`Unsupported file type: ${mimeType} (${ext})`);
  }

  if (!text || text.trim() === '') {
    logger.warn(`[Processor] File produced empty text: ${path.basename(filePath)}`);
    return [];
  }

  const chunks = chunkText(text, chunkSize, overlap);
  logger.info(`[Processor] File processed into ${chunks.length} chunks`);
  return chunks;
}

module.exports = {
  processFile,
  processPDF,
  processDOCX,
  processTXT,
  processCSV,
  processJSON,
  chunkText,
  cleanText,
};
