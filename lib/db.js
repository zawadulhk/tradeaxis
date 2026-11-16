import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const DOWNLOADS_DIR = path.join(__dirname, '..', 'assets', 'downloads');
const ALLOWED_DOC_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip']);

export function generateId() {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Reads and normalizes the self-sustaining local JSON data store (data/store.json).
 */
export function readStore() {
  const defaultStore = { inquiries: [], products: [], news: [], downloads: [] };
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      writeStore(defaultStore);
      return defaultStore;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    if (!raw.trim()) return defaultStore;
    const parsed = JSON.parse(raw);
    return {
      inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
      news: Array.isArray(parsed.news) ? parsed.news : [],
      downloads: Array.isArray(parsed.downloads) ? parsed.downloads : []
    };
  } catch (err) {
    console.warn('[DB] Could not read data/store.json:', err.message);
    return defaultStore;
  }
}

/**
 * Persists the entire store snapshot atomically to data/store.json.
 */
export function writeStore(data) {
  const normalized = {
    inquiries: Array.isArray(data?.inquiries) ? data.inquiries : [],
    products: Array.isArray(data?.products) ? data.products : [],
    news: Array.isArray(data?.news) ? data.news : [],
    downloads: Array.isArray(data?.downloads) ? data.downloads : []
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
    storage: 'Self-Sustaining Local Storage (data/store.json)',
    storageMode: 'Self-Sustaining Local Storage (data/store.json)',
    connected: true,
    engine: `Node.js (${process.version})`,
    supabaseConfigured: false,
    counts: {
      inquiries: store.inquiries.length,
      products: store.products.length,
      news: store.news.length,
      downloads: store.downloads.length
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

// --------------------------------------------------------------------------
// DOWNLOADS CENTER CMS
// --------------------------------------------------------------------------
export async function getDownloads() {
  const store = readStore();
  return store.downloads;
}

export async function saveDownload(doc) {
  const isExisting = Boolean(doc.id);
  const store = readStore();
  const existing = isExisting ? store.downloads.find(x => x.id === doc.id) : null;

  let fileUrl = existing?.file_url || doc.file_url || '';
  let fileName = existing?.file_name || doc.file_name || '';

  if (doc.file_data && doc.file_name) {
    const safeName = String(doc.file_name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(safeName).toLowerCase();
    if (!ALLOWED_DOC_EXTENSIONS.has(ext)) {
      throw new Error('Unsupported document file extension');
    }

    const base64Str = String(doc.file_data).replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Str, 'base64');
    if (buffer.length > 25 * 1024 * 1024) {
      throw new Error('File exceeds 25 MB upload limit');
    }

    if (!fs.existsSync(DOWNLOADS_DIR)) {
      fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    }

    const savedFileName = `${Date.now()}-${safeName}`;
    fs.writeFileSync(path.join(DOWNLOADS_DIR, savedFileName), buffer);
    fileUrl = `assets/downloads/${savedFileName}`;
    fileName = doc.file_name;
  }

  const item = {
    id: doc.id || generateId(),
    title: doc.title,
    category: doc.category || 'PDF • Documentation',
    description: doc.description || '',
    file_url: fileUrl,
    file_name: fileName,
    is_primary: Boolean(doc.is_primary),
    updated_at: new Date().toISOString()
  };

  if (existing) {
    const idx = store.downloads.findIndex(x => x.id === item.id);
    store.downloads[idx] = { ...existing, ...item };
    writeStore(store);
    return store.downloads[idx];
  }

  store.downloads.unshift(item);
  writeStore(store);
  return item;
}

export async function deleteDownload(id) {
  const store = readStore();
  const target = store.downloads.find(x => x.id === id);
  if (target?.file_url && target.file_url.startsWith('assets/downloads/')) {
    const diskPath = path.join(__dirname, '..', target.file_url);
    if (fs.existsSync(diskPath)) {
      try { fs.unlinkSync(diskPath); } catch (_) {}
    }
  }
  store.downloads = store.downloads.filter(x => x.id !== id);
  writeStore(store);
  return true;
}
