/**
 * Knowledge Base Seeder Script
 * Seeds ChromaDB with restaurant data from the knowledge-base/ folder
 * Run: node scripts/seedKnowledgeBase.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const fs = require('fs');
const { connectDB } = require('../config/database');
const vectorDBService = require('../services/vectorDBService');
const documentProcessor = require('../embeddings/documentProcessor');
const logger = require('../config/logger');

const KNOWLEDGE_BASE_DIR = path.join(__dirname, '../../knowledge-base');

/**
 * Convert FAQs JSON to text chunks
 */
const processFAQs = (faqs) => {
  return faqs.map((faq) => {
    const tags = faq.tags ? `Tags: ${faq.tags.join(', ')}` : '';
    return `Question: ${faq.question}\nAnswer: ${faq.answer}\nCategory: ${faq.category}\n${tags}`.trim();
  });
};

/**
 * Convert menu JSON to text chunks
 */
const processMenu = (menuData) => {
  const chunks = [];
  const restaurant = menuData.restaurant;
  const currency = menuData.currency || 'USD';

  for (const category of menuData.categories) {
    for (const item of category.items) {
      const dietary = item.dietary ? `Dietary: ${item.dietary.join(', ')}` : '';
      const allergens = item.allergens ? `Allergens: ${item.allergens.join(', ')}` : '';
      const description = item.description || '';
      const availability = item.availability ? `Available: ${item.availability}` : '';
      const popular = item.popular ? '(Popular item)' : '';

      const chunk = [
        `${restaurant} Menu - ${category.name}`,
        `Item: ${item.name} ${popular}`,
        `Price: ${currency} ${item.price}`,
        description,
        dietary,
        allergens,
        availability,
      ]
        .filter(Boolean)
        .join('\n');

      chunks.push(chunk);
    }
  }
  return chunks;
};

/**
 * Convert policies JSON to text chunks
 */
const processPolicies = (policiesData) => {
  const chunks = [];
  const restaurant = policiesData.restaurant;

  for (const [key, policy] of Object.entries(policiesData.policies)) {
    const policyText = Object.entries(policy)
      .filter(([k]) => k !== 'title')
      .map(([k, v]) => {
        if (typeof v === 'string') return `${k}: ${v}`;
        if (Array.isArray(v)) return `${k}: ${v.join(', ')}`;
        if (typeof v === 'object') return `${k}: ${JSON.stringify(v)}`;
        return `${k}: ${v}`;
      })
      .join('\n');

    chunks.push(`${restaurant} - ${policy.title || key}\n${policyText}`);
  }
  return chunks;
};

/**
 * Main seed function
 */
const seed = async () => {
  console.log('\n🌱 Starting knowledge base seeding...\n');

  try {
    await connectDB();
    console.log('✅ MongoDB connected');

    let allChunks = [];

    // ── Process FAQs ──────────────────────────────────────────────────────────
    const faqPath = path.join(KNOWLEDGE_BASE_DIR, 'restaurant-faqs.json');
    if (fs.existsSync(faqPath)) {
      const faqs = JSON.parse(fs.readFileSync(faqPath, 'utf8'));
      const chunks = processFAQs(faqs);
      allChunks = allChunks.concat(chunks);
      console.log(`📋 Processed ${chunks.length} FAQ entries`);
    } else {
      console.warn('⚠️  restaurant-faqs.json not found, skipping');
    }

    // ── Process Menu ──────────────────────────────────────────────────────────
    const menuPath = path.join(KNOWLEDGE_BASE_DIR, 'menu.json');
    if (fs.existsSync(menuPath)) {
      const menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
      const chunks = processMenu(menu);
      allChunks = allChunks.concat(chunks);
      console.log(`🍽️  Processed ${chunks.length} menu items`);
    }

    // ── Process Policies ──────────────────────────────────────────────────────
    const policiesPath = path.join(KNOWLEDGE_BASE_DIR, 'policies.json');
    if (fs.existsSync(policiesPath)) {
      const policies = JSON.parse(fs.readFileSync(policiesPath, 'utf8'));
      const chunks = processPolicies(policies);
      allChunks = allChunks.concat(chunks);
      console.log(`📜 Processed ${chunks.length} policy sections`);
    }

    // ── Process any additional txt/csv files ──────────────────────────────────
    const extraFiles = fs.readdirSync(KNOWLEDGE_BASE_DIR).filter(
      (f) => f.endsWith('.txt') || f.endsWith('.csv')
    );
    for (const file of extraFiles) {
      const filePath = path.join(KNOWLEDGE_BASE_DIR, file);
      const ext = path.extname(file).replace('.', '');
      const chunks = await documentProcessor.processFile(filePath, ext === 'csv' ? 'text/csv' : 'text/plain');
      allChunks = allChunks.concat(chunks);
      console.log(`📄 Processed ${chunks.length} chunks from ${file}`);
    }

    if (allChunks.length === 0) {
      console.error('❌ No chunks generated. Check your knowledge-base directory.');
      process.exit(1);
    }

    console.log(`\n🔢 Total chunks to index: ${allChunks.length}`);
    console.log('🔄 Deleting existing collection and re-indexing...\n');

    await vectorDBService.deleteAndReindex(allChunks, {
      source: 'seed-script',
      seededAt: new Date().toISOString(),
    });

    console.log(`\n✅ Successfully seeded ${allChunks.length} chunks into ChromaDB!`);
    console.log('🚀 Your chatbot knowledge base is ready.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

seed();
