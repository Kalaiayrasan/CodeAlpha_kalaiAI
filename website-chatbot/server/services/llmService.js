'use strict';

/**
 * @fileoverview LLM service supporting OpenAI and Google Gemini providers.
 * Reads LLM_PROVIDER from env to determine which provider to use.
 * Returns a unified { response, tokensUsed } interface.
 */

const logger = require('../config/logger');

/** Restaurant name used in system prompt */
const RESTAURANT_NAME = process.env.RESTAURANT_NAME || 'our restaurant';

/**
 * Builds the system prompt string with injected context chunks.
 * @param {string[]} contextChunks - Retrieved document snippets for RAG
 * @returns {string} Fully assembled system prompt
 */
function buildSystemPrompt(contextChunks = []) {
  const contextSection =
    contextChunks.length > 0
      ? `\n\nRELEVANT INFORMATION:\n${contextChunks.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}`
      : '';

  return (
    `You are a helpful, friendly restaurant assistant for ${RESTAURANT_NAME}. ` +
    `Your job is to assist customers with questions about our menu, hours, reservations, location, and general dining experience. ` +
    `Always be warm, professional, and concise in your responses. ` +
    `If a customer asks something outside your knowledge, honestly say you don't know and suggest they contact us directly. ` +
    `Do not make up information about prices, hours, or menu items.` +
    contextSection
  );
}

// ─── OpenAI Provider ──────────────────────────────────────────────────────────

/** @type {import('openai').OpenAI|null} */
let openaiClient = null;

/**
 * Lazily initializes and returns the OpenAI client.
 * @returns {import('openai').OpenAI}
 * @throws {Error} If OPENAI_API_KEY is not set
 */
function getOpenAIClient() {
  if (openaiClient) return openaiClient;

  const { OpenAI } = require('openai');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const baseURL = process.env.OPENAI_BASE_URL || undefined;
  openaiClient = new OpenAI({ apiKey, baseURL });
  return openaiClient;
}

/**
 * Generates a response using OpenAI GPT.
 * @param {Array<{role: string, content: string}>} messages - Conversation messages
 * @param {string[]} contextChunks - RAG context chunks
 * @returns {Promise<{response: string, tokensUsed: number}>}
 */
async function generateWithOpenAI(messages, contextChunks) {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const systemPrompt = buildSystemPrompt(contextChunks);

  const systemMessage = { role: 'system', content: systemPrompt };
  const allMessages = [systemMessage, ...messages];

  logger.info(`[LLM:OpenAI] Sending request with model: ${model}, messages: ${allMessages.length}`);

  const completion = await client.chat.completions.create({
    model,
    messages: allMessages,
    max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1024', 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  });

  const response = completion.choices[0]?.message?.content || '';
  const tokensUsed = completion.usage?.total_tokens || 0;

  logger.info(`[LLM:OpenAI] Response received. Tokens used: ${tokensUsed}`);
  return { response, tokensUsed };
}

// ─── Gemini Provider ──────────────────────────────────────────────────────────

/** @type {import('@google/generative-ai').GenerativeModel|null} */
let geminiModel = null;

/**
 * Lazily initializes and returns the Gemini generative model.
 * @returns {import('@google/generative-ai').GenerativeModel}
 * @throws {Error} If GEMINI_API_KEY is not set
 */
function getGeminiModel() {
  if (geminiModel) return geminiModel;

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  geminiModel = genAI.getGenerativeModel({ model: modelName });
  return geminiModel;
}

/**
 * Generates a response using Google Gemini.
 * @param {Array<{role: string, content: string}>} messages - Conversation messages
 * @param {string[]} contextChunks - RAG context chunks
 * @returns {Promise<{response: string, tokensUsed: number}>}
 */
async function generateWithGemini(messages, contextChunks) {
  const model = getGeminiModel();
  const systemPrompt = buildSystemPrompt(contextChunks);

  // Gemini uses 'user' / 'model' roles and doesn't have a true system message
  // Prepend system instructions to the first user message
  const geminiHistory = [];
  let isFirst = true;

  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'model' : 'user';

    if (isFirst && role === 'user') {
      geminiHistory.push({
        role: 'user',
        parts: [{ text: `[System Instructions]\n${systemPrompt}\n\n[User Message]\n${msg.content}` }],
      });
      isFirst = false;
    } else {
      geminiHistory.push({
        role,
        parts: [{ text: msg.content }],
      });
    }
  }

  const lastMessage = geminiHistory.pop();
  if (!lastMessage) {
    throw new Error('No messages to send to Gemini');
  }

  logger.info(`[LLM:Gemini] Sending request with ${geminiHistory.length + 1} messages`);

  const chat = model.startChat({
    history: geminiHistory,
    generationConfig: {
      maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '1024', 10),
      temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
    },
  });

  const result = await chat.sendMessage(lastMessage.parts[0].text);
  const responseText = result.response.text();

  // Gemini SDK doesn't always expose token counts; use estimation
  const tokensUsed = result.response?.usageMetadata?.totalTokenCount || 0;

  logger.info(`[LLM:Gemini] Response received. Tokens used: ${tokensUsed}`);
  return { response: responseText, tokensUsed };
}

// ─── Unified Interface ────────────────────────────────────────────────────────

/**
 * Generates a chatbot response using the configured LLM provider.
 * Reads LLM_PROVIDER env var to choose between 'openai' and 'gemini'.
 * Falls back to OpenAI if provider is unknown.
 *
 * @param {Array<{role: string, content: string}>} messages - Conversation history
 * @param {string[]} [contextChunks=[]] - Retrieved RAG context snippets
 * @returns {Promise<{response: string, tokensUsed: number, provider: string}>}
 * @throws {Error} If LLM call fails
 */
async function generateResponse(messages, contextChunks = []) {
  const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();

  logger.info(`[LLM] Using provider: ${provider}`);

  if (provider === 'gemini') {
    const result = await generateWithGemini(messages, contextChunks);
    return { ...result, provider: 'gemini' };
  }

  // Default to OpenAI
  const result = await generateWithOpenAI(messages, contextChunks);
  return { ...result, provider: 'openai' };
}

/**
 * Returns the name of the currently configured LLM provider.
 * @returns {string} 'openai' or 'gemini'
 */
function getCurrentProvider() {
  return (process.env.LLM_PROVIDER || 'openai').toLowerCase();
}

module.exports = {
  generateResponse,
  buildSystemPrompt,
  getCurrentProvider,
};
