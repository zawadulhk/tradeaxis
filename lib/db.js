import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const SEED_FILE = path.join(__dirname, '..', 'data', 'store.json');
const DATA_DIR = IS_SERVERLESS ? os.tmpdir() : path.join(__dirname, '..', 'data');
const DATA_FILE = IS_SERVERLESS
  ? path.join(DATA_DIR, 'tradeaxis-store.json')
  : path.join(DATA_DIR, 'store.json');

export function generateId() {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Reads and normalizes the self-sustaining local JSON data store.
 * Uses data/store.json directly on shared hosting / Node.js,
 * and falls back to writable /tmp/tradeaxis-store.json (seeded from data/store.json) on read-only serverless platforms like Vercel.
 */
export function readStore() {
  const defaultStore = { inquiries: [], products: [], news: [] };
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      if (IS_SERVERLESS && fs.existsSync(SEED_FILE)) {
        const seedRaw = fs.readFileSync(SEED_FILE, 'utf-8');
        const seedParsed = JSON.parse(seedRaw);
        return writeStore(seedParsed);
      }
      writeStore(defaultStore);
      return defaultStore;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    if (!raw.trim()) return defaultStore;
    const parsed = JSON.parse(raw);
    return {
      inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
      news: Array.isArray(parsed.news) ? parsed.news : []
    };
  } catch (err) {
    console.warn('[DB] Could not read store:', err.message);
    return defaultStore;
  }
}

/**
 * Persists the entire store snapshot atomically to DATA_FILE.
 */
export function writeStore(data) {
  const normalized = {
    inquiries: Array.isArray(data?.inquiries) ? data.inquiries : [],
    products: Array.isArray(data?.products) ? data.products : [],
    news: Array.isArray(data?.news) ? data.news : []
  };

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(normalized, null, 2) + '\n', 'utf-8');
  fs.renameSync(tmpFile, DATA_FILE);
  return normalized;
}

export function getDbStatus() {
  const store = readStore();
  return {
    storage: IS_SERVERLESS
      ? 'Vercel Ephemeral Fallback (/tmp/tradeaxis-store.json)'
      : 'Self-Sustaining Local Storage (data/store.json)',
    storageMode: IS_SERVERLESS
      ? 'Vercel Ephemeral Fallback (/tmp/tradeaxis-store.json)'
      : 'Self-Sustaining Local Storage (data/store.json)',
    connected: true,
    engine: `Node.js (${process.version})`,
    supabaseConfigured: false,
    counts: {
      inquiries: store.inquiries.length,
      products: store.products.length,
      news: store.news.length
    }
  };
}

// --------------------------------------------------------------------------
// INQUIRIES & LEADS CRM
// --------------------------------------------------------------------------
export async function getInquiries() {
  const store = readStore();
  return store.inquiries;
}

export async function createInquiry(leadData) {
  const now = new Date().toISOString();
  const item = {
    id: leadData.id || generateId(),
    created_at: now,
    inquiry_type: leadData.inquiry_type || 'enquiry',
    full_name: leadData.full_name || 'Anonymous Prospect',
    company_name: leadData.company_name || 'Unspecified Entity',
    email: leadData.email || '',
    phone: leadData.phone || '',
    country: leadData.country || null,
    division: leadData.division || null,
    product_requirement: leadData.product_requirement || null,
    volume_port: leadData.volume_port || null,
    subject: leadData.subject || null,
    message: leadData.message || '',
    status: 'new',
    admin_notes: '',
    updated_at: now
  };

  const store = readStore();
  store.inquiries.unshift(item);
  writeStore(store);
  return item;
}

export async function updateInquiry(id, updates) {
  const store = readStore();
  const idx = store.inquiries.findIndex(x => x.id === id);
  if (idx === -1) return null;

  store.inquiries[idx] = {
    ...store.inquiries[idx],
    ...updates,
    updated_at: new Date().toISOString()
  };
  writeStore(store);
  return store.inquiries[idx];
}

export async function deleteInquiry(id) {
  const store = readStore();
  store.inquiries = store.inquiries.filter(x => x.id !== id);
  writeStore(store);
  return true;
}

// --------------------------------------------------------------------------
// PRODUCTS CATALOG & FEATURED CARDS CMS
// --------------------------------------------------------------------------
export async function getProducts() {
  const store = readStore();
  return [...store.products].sort((a, b) => {
    const sa = typeof a.sort_order === 'number' ? a.sort_order : Number.MAX_SAFE_INTEGER;
    const sb = typeof b.sort_order === 'number' ? b.sort_order : Number.MAX_SAFE_INTEGER;
    return sa - sb;
  });
}

export async function saveProduct(product) {
  const isExisting = Boolean(product.id);
  const item = {
    id: product.id || generateId(),
    name: product.name,
    category: product.category || 'jute',
    division: product.division || 'General Sourcing',
    badge: product.badge || '',
    description: product.description || '',
    specs: product.specs || '',
    is_featured: Boolean(product.is_featured)
  };

  if (typeof product.sort_order === 'number') {
    item.sort_order = product.sort_order;
  }
  if (product.origins !== undefined) {
    item.origins = product.origins;
  }
  if (product.image_url !== undefined) {
    item.image_url = product.image_url;
  }

  const store = readStore();
  if (isExisting) {
    const idx = store.products.findIndex(x => x.id === item.id);
    if (idx !== -1) {
      store.products[idx] = { ...store.products[idx], ...item };
      writeStore(store);
      return store.products[idx];
    }
  }

  store.products.unshift(item);
  writeStore(store);
  return item;
}

export async function deleteProduct(id) {
  const store = readStore();
  store.products = store.products.filter(x => x.id !== id);
  writeStore(store);
  return true;
}

// --------------------------------------------------------------------------
// NEWS & MARKET BULLETINS CMS
// --------------------------------------------------------------------------
export async function getNews() {
  const store = readStore();
  return store.news;
}

export async function saveNews(article) {
  const isExisting = Boolean(article.id);
  const item = {
    id: article.id || generateId(),
    title: article.title,
    category: article.category || 'Market Intelligence',
    publish_date: article.publish_date || new Date().toISOString().split('T')[0],
    read_time: article.read_time || '3 min read',
    excerpt: article.excerpt || '',
    content: article.content || '',
    published: article.published !== false
  };

  const store = readStore();
  if (isExisting) {
    const idx = store.news.findIndex(x => x.id === item.id);
    if (idx !== -1) {
      store.news[idx] = { ...store.news[idx], ...item };
      writeStore(store);
      return store.news[idx];
    }
  }

  store.news.unshift(item);
  writeStore(store);
  return item;
}

export async function deleteNews(id) {
  const store = readStore();
  store.news = store.news.filter(x => x.id !== id);
  writeStore(store);
  return true;
}
