import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_SERVERLESS ? os.tmpdir() : path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// In-memory fallback
let memStore = null;

export function generateId() {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function hasSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith('http'));
}

function getSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  return {
    url,
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  };
}

export function getDbStatus() {
  return {
    supabaseConfigured: hasSupabase(),
    supabaseUrl: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/(\/\/.*?:).*?@/, '$1***@') : null,
    storageMode: hasSupabase() ? 'Supabase Cloud Database (PostgreSQL)' : 'Local Persistent JSON Store'
  };
}

// --------------------------------------------------------------------------
// Local Store Helpers
// --------------------------------------------------------------------------
function loadLocalStore() {
  if (memStore) return memStore;

  // Try loading from DATA_FILE
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      memStore = JSON.parse(raw);
      return memStore;
    }
  } catch (err) {
    console.warn('[DB] Could not read DATA_FILE:', err.message);
  }

  // Try seed from original repo data/store.json if in serverless
  const seedFile = path.join(__dirname, '..', 'data', 'store.json');
  try {
    if (fs.existsSync(seedFile)) {
      const raw = fs.readFileSync(seedFile, 'utf-8');
      memStore = JSON.parse(raw);
      return memStore;
    }
  } catch (err) {
    console.warn('[DB] Could not read seedFile:', err.message);
  }

  // Default empty store
  memStore = { inquiries: [], products: [], news: [] };
  return memStore;
}

function saveLocalStore(data) {
  memStore = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Expected on read-only serverless filesystem
    console.warn('[DB] Persistent file write failed; kept in memory:', err.message);
  }
}

// --------------------------------------------------------------------------
// INQUIRIES & LEADS CRM
// --------------------------------------------------------------------------
export async function getInquiries() {
  if (hasSupabase()) {
    try {
      const { url, headers } = getSupabaseConfig();
      const res = await fetch(`${url}/rest/v1/inquiries?select=*&order=created_at.desc`, { headers });
      if (res.ok) {
        return await res.json();
      }
      const errText = await res.text();
      console.error('[DB] Supabase getInquiries returned status:', res.status, errText);
      throw new Error(`Supabase getInquiries failed (${res.status}): ${errText}`);
    } catch (err) {
      console.error('[DB] Supabase getInquiries error:', err.message);
      throw err;
    }
  }

  const store = loadLocalStore();
  return store.inquiries || [];
}

export async function createInquiry(leadData) {
  const item = {
    id: leadData.id || generateId(),
    created_at: new Date().toISOString(),
    inquiry_type: leadData.inquiry_type || 'rfq',
    full_name: leadData.full_name || 'Anonymous Prospect',
    company_name: leadData.company_name || 'Unspecified Entity',
    email: leadData.email || '',
    phone: leadData.phone || '',
    product_requirement: leadData.product_requirement || null,
    volume_port: leadData.volume_port || null,
    subject: leadData.subject || null,
    message: leadData.message || '',
    status: 'new',
    admin_notes: '',
    updated_at: new Date().toISOString()
  };

  if (hasSupabase()) {
    try {
      const { url, headers } = getSupabaseConfig();
      const res = await fetch(`${url}/rest/v1/inquiries`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        const rows = await res.json();
        return rows[0] || item;
      }
      const errText = await res.text();
      console.error('[DB] Supabase createInquiry returned:', res.status, errText);
      throw new Error(`Supabase insert failed (${res.status}): ${errText}`);
    } catch (err) {
      console.error('[DB] Supabase createInquiry error:', err.message);
      throw err;
    }
  }

  const store = loadLocalStore();
  store.inquiries = store.inquiries || [];
  store.inquiries.unshift(item);
  saveLocalStore(store);
  return item;
}

export async function updateInquiry(id, updates) {
  const updatePayload = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  if (hasSupabase()) {
    try {
      const { url, headers } = getSupabaseConfig();
      const res = await fetch(`${url}/rest/v1/inquiries?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(updatePayload)
      });
      if (res.ok) {
        const rows = await res.json();
        return rows[0] || null;
      }
    } catch (err) {
      console.warn('[DB] Supabase updateInquiry error:', err.message);
    }
  }

  const store = loadLocalStore();
  store.inquiries = store.inquiries || [];
  const idx = store.inquiries.findIndex(x => x.id === id);
  if (idx !== -1) {
    store.inquiries[idx] = { ...store.inquiries[idx], ...updatePayload };
    saveLocalStore(store);
    return store.inquiries[idx];
  }
  return null;
}

export async function deleteInquiry(id) {
  if (hasSupabase()) {
    try {
      const { url, headers } = getSupabaseConfig();
      await fetch(`${url}/rest/v1/inquiries?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers
      });
    } catch (err) {
      console.warn('[DB] Supabase deleteInquiry error:', err.message);
    }
  }

  const store = loadLocalStore();
  store.inquiries = (store.inquiries || []).filter(x => x.id !== id);
  saveLocalStore(store);
  return true;
}

// --------------------------------------------------------------------------
// PRODUCTS CATALOG CMS
// --------------------------------------------------------------------------
export async function getProducts() {
  if (hasSupabase()) {
    try {
      const { url, headers } = getSupabaseConfig();
      const res = await fetch(`${url}/rest/v1/products?select=*&order=created_at.desc`, { headers });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return rows;
        }
      }
    } catch (err) {
      console.warn('[DB] Supabase getProducts error:', err.message);
    }
  }

  const store = loadLocalStore();
  return store.products || [];
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

  if (hasSupabase()) {
    try {
      const { url, headers } = getSupabaseConfig();
      const method = isExisting ? 'PATCH' : 'POST';
      const endpoint = isExisting 
        ? `${url}/rest/v1/products?id=eq.${encodeURIComponent(item.id)}`
        : `${url}/rest/v1/products`;

      const res = await fetch(endpoint, {
        method,
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        const rows = await res.json();
        return rows[0] || item;
      }
      const errText = await res.text();
      console.error('[DB] Supabase saveProduct returned:', res.status, errText);
      throw new Error(`Supabase saveProduct failed (${res.status}): ${errText}`);
    } catch (err) {
      console.error('[DB] Supabase saveProduct error:', err.message);
      throw err;
    }
  }

  const store = loadLocalStore();
  store.products = store.products || [];
  if (isExisting) {
    const idx = store.products.findIndex(x => x.id === item.id);
    if (idx !== -1) {
      store.products[idx] = { ...store.products[idx], ...item };
      saveLocalStore(store);
      return store.products[idx];
    }
  }
  store.products.unshift(item);
  saveLocalStore(store);
  return item;
}

export async function deleteProduct(id) {
  if (hasSupabase()) {
    try {
      const { url, headers } = getSupabaseConfig();
      const res = await fetch(`${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[DB] Supabase deleteProduct returned:', res.status, errText);
        throw new Error(`Supabase deleteProduct failed (${res.status}): ${errText}`);
      }
      return true;
    } catch (err) {
      console.error('[DB] Supabase deleteProduct error:', err.message);
      throw err;
    }
  }

  const store = loadLocalStore();
  store.products = (store.products || []).filter(x => x.id !== id);
  saveLocalStore(store);
  return true;
}

// --------------------------------------------------------------------------
// NEWS & MARKET BULLETINS CMS
// --------------------------------------------------------------------------
export async function getNews() {
  if (hasSupabase()) {
    try {
      const { url, headers } = getSupabaseConfig();
      const res = await fetch(`${url}/rest/v1/news_articles?select=*&order=publish_date.desc`, { headers });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[DB] Supabase getNews error:', err.message);
    }
  }

  const store = loadLocalStore();
  return store.news || [];
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

  if (hasSupabase()) {
    try {
      const { url, headers } = getSupabaseConfig();
      const method = isExisting ? 'PATCH' : 'POST';
      const endpoint = isExisting 
        ? `${url}/rest/v1/news_articles?id=eq.${encodeURIComponent(item.id)}`
        : `${url}/rest/v1/news_articles`;

      const res = await fetch(endpoint, {
        method,
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        const rows = await res.json();
        return rows[0] || item;
      }
    } catch (err) {
      console.warn('[DB] Supabase saveNews error:', err.message);
    }
  }

  const store = loadLocalStore();
  store.news = store.news || [];
  if (isExisting) {
    const idx = store.news.findIndex(x => x.id === item.id);
    if (idx !== -1) {
      store.news[idx] = { ...store.news[idx], ...item };
      saveLocalStore(store);
      return store.news[idx];
    }
  }
  store.news.unshift(item);
  saveLocalStore(store);
  return item;
}

export async function deleteNews(id) {
  if (hasSupabase()) {
    try {
      const { url, headers } = getSupabaseConfig();
      await fetch(`${url}/rest/v1/news_articles?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers
      });
    } catch (err) {
      console.warn('[DB] Supabase deleteNews error:', err.message);
    }
  }

  const store = loadLocalStore();
  store.news = (store.news || []).filter(x => x.id !== id);
  saveLocalStore(store);
  return true;
}
