require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { OpenAI } = require('openai');

async function testConnection() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  const chatModel = process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const embeddingModel = process.env.EMBEDDING_MODEL || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

  console.log('--- OpenRouter/OpenAI Configuration Test ---');
  console.log('OPENAI_BASE_URL:', baseURL || '(using default OpenAI endpoint)');
  console.log('OPENAI_API_KEY:', apiKey ? `${apiKey.substring(0, 10)}...` : '(not set)');
  console.log('OPENAI_CHAT_MODEL:', chatModel);
  console.log('OPENAI_EMBEDDING_MODEL:', embeddingModel);

  if (!apiKey || apiKey.includes('placeholder')) {
    console.error('❌ Error: OPENAI_API_KEY is missing or is still the placeholder.');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey, baseURL });

  try {
    console.log('\n1. Testing Chat Completion...');
    const chatResponse = await client.chat.completions.create({
      model: chatModel,
      messages: [{ role: 'user', content: 'Hello! Respond with a brief "test successful".' }],
    });
    console.log('✅ Chat response received successfully!');
    console.log('Response content:', chatResponse.choices[0]?.message?.content);
  } catch (err) {
    console.error('❌ Chat Completion failed:', err.message);
  }

  try {
    console.log('\n2. Testing Embeddings Generation...');
    const embeddingResponse = await client.embeddings.create({
      model: embeddingModel,
      input: 'test text',
    });
    console.log('✅ Embeddings generated successfully!');
    console.log('Embedding dimensions:', embeddingResponse.data[0]?.embedding?.length);
  } catch (err) {
    console.error('❌ Embeddings Generation failed:', err.message);
  }
}

testConnection();
