/**
 * Document Processor Tests
 */

const { chunkText, cleanText } = require('../server/embeddings/documentProcessor');

describe('documentProcessor - cleanText', () => {
  test('removes excessive whitespace', () => {
    const result = cleanText('Hello    World   \n\n\n  Foo');
    expect(result).not.toMatch(/\s{3,}/);
  });

  test('trims leading/trailing whitespace', () => {
    const result = cleanText('   hello world   ');
    expect(result).toBe('hello world');
  });

  test('handles empty string', () => {
    expect(cleanText('')).toBe('');
  });
});

describe('documentProcessor - chunkText', () => {
  const sampleText = 'word '.repeat(600).trim(); // 600 words

  test('produces multiple chunks for long text', () => {
    const chunks = chunkText(sampleText, 500, 50);
    expect(chunks.length).toBeGreaterThan(1);
  });

  test('each chunk is within size limit', () => {
    const chunks = chunkText(sampleText, 500, 50);
    chunks.forEach((chunk) => {
      expect(chunk.split(' ').length).toBeLessThanOrEqual(550); // allow slight overlap
    });
  });

  test('returns single chunk for short text', () => {
    const short = 'Hello world. This is a short text.';
    const chunks = chunkText(short, 500, 50);
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe(short);
  });

  test('handles empty string', () => {
    const chunks = chunkText('', 500, 50);
    expect(chunks).toEqual([]);
  });
});
