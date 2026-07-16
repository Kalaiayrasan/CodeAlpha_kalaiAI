/**
 * RAG Service — Core Retrieval-Augmented Generation Pipeline
 * Orchestrates: session loading → retrieval → LLM generation → logging
 */

const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const ChatLog = require('../models/ChatLog');
const vectorDBService = require('./vectorDBService');
const llmService = require('./llmService');
const logger = require('../config/logger');

// ─── Fallback responses when AI/DB is unavailable ─────────────────────────────
const FALLBACK_RESPONSES = {
  greeting: `Welcome to ${process.env.RESTAURANT_NAME || 'Kalai Restaurant'}! 🍽️ How can I help you today? I can answer questions about our menu, hours, reservations, and more.`,
  hours: `We're open Monday–Thursday 11AM–10PM, Friday–Saturday 11AM–11PM, and Sunday 12PM–9PM. We're closed on major holidays.`,
  menu: `We offer a wide selection of starters, mains, sides, desserts, and cocktails. Our popular dishes include the 28-Day Aged Ribeye, Pan-Seared Salmon, Truffle Mushroom Risotto, and Lobster Linguine. Would you like details on any specific dish?`,
  reservation: `You can make a reservation by calling +1 (555) 123-4567, emailing reservations@kalairestaurant.com, or using our online booking form. We recommend booking 24h in advance for weekends.`,
  delivery: `We offer delivery within 5 miles via our website and through Uber Eats, DoorDash, and JustEat. Available Tue–Sun from 5PM–9:30PM. Minimum order: $25.`,
  contact: `📞 Phone: +1 (555) 123-4567 | 📧 Email: info@kalairestaurant.com | 📍 Address: 123 Main Street, City, State 12345`,
  payment: `We accept all major credit/debit cards, Apple Pay, Google Pay, and cash. No personal checks accepted.`,
  default: `Thank you for your question! I'm here to help with anything about ${process.env.RESTAURANT_NAME || 'Kalai Restaurant'}. Could you please rephrase your question? You can ask about our menu, hours, reservations, delivery, or policies.`,
};

// ─── Intent Detection via keyword matching ────────────────────────────────────
/**
 * Detect the likely intent of a user message.
 * @param {string} message
 * @returns {string} intent key
 */
const detectIntent = (message) => {
  const lower = message.toLowerCase();
  if (/\b(hi|hello|hey|good morning|good evening|howdy|greetings)\b/.test(lower)) return 'greeting';
  if (/\b(hour|open|close|timing|schedule|when)\b/.test(lower)) return 'hours';
  if (/\b(menu|food|dish|eat|meal|starter|main|dessert|drink|cocktail|price|cost)\b/.test(lower)) return 'menu';
  if (/\b(reserv|book|table|seat|availab)\b/.test(lower)) return 'reservation';
  if (/\b(deliver|takeaway|takeout|order online)\b/.test(lower)) return 'delivery';
  if (/\b(contact|phone|call|email|address|where|location)\b/.test(lower)) return 'contact';
  if (/\b(pay|card|cash|visa|mastercard|apple pay|google pay)\b/.test(lower)) return 'payment';
  return 'default';
};

/**
 * Build a system prompt injecting retrieved context into the LLM call.
 * @param {string[]} contextChunks - retrieved text chunks from vector DB
 * @returns {string}
 */
const buildSystemPrompt = (contextChunks) => {
  const restaurantName = process.env.RESTAURANT_NAME || 'Kalai Restaurant';
  const basePrompt = `You are a helpful, friendly, and knowledgeable AI assistant for ${restaurantName}. 
Your role is to assist customers with questions about our menu, hours, reservations, policies, delivery, and anything related to the restaurant.

Guidelines:
- Always be warm, friendly, and professional
- Keep responses concise (2-4 sentences unless listing items)
- If asked about something outside the restaurant, politely redirect
- Use emojis sparingly but naturally (1-2 per response)
- Format lists with bullet points when listing multiple items
- Always offer to help with follow-up questions`;

  if (contextChunks && contextChunks.length > 0) {
    const context = contextChunks.join('\n\n---\n\n');
    return `${basePrompt}

RELEVANT INFORMATION FROM OUR KNOWLEDGE BASE:
${context}

Use the above information to answer the customer's question accurately. If the information doesn't fully answer the question, use your best judgment based on what's available.`;
  }

  return basePrompt;
};

/**
 * Main chat function — the RAG pipeline entry point.
 * @param {string} sessionId - existing session ID or null to create new
 * @param {string} userMessage - the user's message
 * @returns {Promise<{response: string, sessionId: string, tokensUsed: number, retrievedDocs: string[]}>}
 */
const chat = async (sessionId, userMessage) => {
  const startTime = Date.now();
  let currentSessionId = sessionId;
  let retrievedDocs = [];
  let tokensUsed = 0;

  try {
    // ── 1. Ensure session exists ───────────────────────────────────────────────
    if (!currentSessionId) {
      currentSessionId = uuidv4();
    }

    let session = await Session.findOne({ sessionId: currentSessionId });
    if (!session) {
      session = new Session({
        sessionId: currentSessionId,
        messages: [],
      });
    }

    // ── 2. Retrieve relevant docs from vector DB ───────────────────────────────
    try {
      const results = await vectorDBService.search(userMessage, 5);
      retrievedDocs = results;
      logger.info(`Retrieved ${results.length} relevant documents for query`);
    } catch (vecError) {
      logger.warn('Vector DB search failed, falling back to no context:', vecError.message);
    }

    // ── 3. Build conversation history (last 10 messages for context window) ────
    const recentMessages = session.messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // ── 4. Build conversation messages with latest user message ────────────
    const fullMessages = [
      ...recentMessages,
      { role: 'user', content: userMessage },
    ];

    // ── 5. Generate LLM response ──────────────────────────────────────────────
    let response;
    try {
      const result = await llmService.generateResponse(
        fullMessages,
        retrievedDocs
      );
      response = result.response;
      tokensUsed = result.tokensUsed || 0;
    } catch (llmError) {
      logger.warn('LLM call failed, using fallback response:', llmError.message);
      const intent = detectIntent(userMessage);
      response = FALLBACK_RESPONSES[intent] || FALLBACK_RESPONSES.default;
    }

    // ── 6. Save messages to session ────────────────────────────────────────────
    session.messages.push(
      { role: 'user', content: userMessage, timestamp: new Date() },
      { role: 'assistant', content: response, timestamp: new Date() }
    );
    await session.save();

    // ── 7. Log the conversation ────────────────────────────────────────────────
    const latencyMs = Date.now() - startTime;
    try {
      await ChatLog.create({
        sessionId: currentSessionId,
        userMessage,
        botResponse: response,
        tokensUsed,
        latencyMs,
        retrieved_docs: retrievedDocs,
        intent: detectIntent(userMessage),
      });
    } catch (logError) {
      logger.warn('Failed to write chat log:', logError.message);
    }

    return {
      response,
      sessionId: currentSessionId,
      tokensUsed,
      retrievedDocs,
      latencyMs,
    };
  } catch (error) {
    logger.error('RAG chat error:', error);
    // Last resort fallback
    const intent = detectIntent(userMessage);
    return {
      response: FALLBACK_RESPONSES[intent] || FALLBACK_RESPONSES.default,
      sessionId: currentSessionId || uuidv4(),
      tokensUsed: 0,
      retrievedDocs: [],
      latencyMs: Date.now() - startTime,
    };
  }
};

module.exports = { chat, detectIntent, buildSystemPrompt, FALLBACK_RESPONSES };
