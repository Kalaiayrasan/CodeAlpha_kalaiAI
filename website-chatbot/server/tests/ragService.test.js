/**
 * RAG Service Tests
 */

const { detectIntent, buildSystemPrompt, FALLBACK_RESPONSES } = require('../services/ragService');

describe('ragService - detectIntent', () => {
  test('detects greeting intent', () => {
    expect(detectIntent('hello there')).toBe('greeting');
    expect(detectIntent('Hi!')).toBe('greeting');
    expect(detectIntent('Good morning')).toBe('greeting');
  });

  test('detects hours intent', () => {
    expect(detectIntent('What time do you open?')).toBe('hours');
    expect(detectIntent('When do you close?')).toBe('hours');
    expect(detectIntent('What are your opening hours?')).toBe('hours');
  });

  test('detects menu intent', () => {
    expect(detectIntent('What food do you serve?')).toBe('menu');
    expect(detectIntent('Can I see the menu?')).toBe('menu');
    expect(detectIntent('What are your prices?')).toBe('menu');
  });

  test('detects reservation intent', () => {
    expect(detectIntent('Can I book a table?')).toBe('reservation');
    expect(detectIntent('I want to make a reservation')).toBe('reservation');
  });

  test('detects delivery intent', () => {
    expect(detectIntent('Do you deliver?')).toBe('delivery');
    expect(detectIntent('Can I order takeaway?')).toBe('delivery');
  });

  test('detects contact intent', () => {
    expect(detectIntent('What is your phone number?')).toBe('contact');
    expect(detectIntent('Where are you located?')).toBe('contact');
  });

  test('defaults to default intent for unknown queries', () => {
    expect(detectIntent('something completely random xyz')).toBe('default');
  });
});

describe('ragService - buildSystemPrompt', () => {
  test('returns base prompt when no context provided', () => {
    const prompt = buildSystemPrompt([]);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(10);
  });

  test('includes context when provided', () => {
    const chunks = ['Our hours are 9-5', 'We are located at 123 Main St'];
    const prompt = buildSystemPrompt(chunks);
    expect(prompt).toContain('RELEVANT INFORMATION');
    expect(prompt).toContain('Our hours are 9-5');
  });

  test('handles multiple context chunks', () => {
    const chunks = ['chunk 1', 'chunk 2', 'chunk 3'];
    const prompt = buildSystemPrompt(chunks);
    chunks.forEach((chunk) => expect(prompt).toContain(chunk));
  });
});

describe('ragService - FALLBACK_RESPONSES', () => {
  test('has responses for all key intents', () => {
    const requiredIntents = ['greeting', 'hours', 'menu', 'reservation', 'delivery', 'contact', 'payment', 'default'];
    requiredIntents.forEach((intent) => {
      expect(FALLBACK_RESPONSES[intent]).toBeDefined();
      expect(typeof FALLBACK_RESPONSES[intent]).toBe('string');
      expect(FALLBACK_RESPONSES[intent].length).toBeGreaterThan(10);
    });
  });
});
