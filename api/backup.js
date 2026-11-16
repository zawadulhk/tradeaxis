import { readStore, writeStore } from '../lib/db.js';
import { verifyAdmin, CORS_HEADERS } from '../lib/auth.js';

async function parseBody(req) {
  if (typeof req.body === 'object' && req.body !== null) return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const str = Buffer.concat(chunks).toString();
  try { return str ? JSON.parse(str) : {}; } catch (_) { return {}; }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (!verifyAdmin(req)) {
    res.writeHead(401, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'Unauthorized: Admin access required' }));
    return;
  }

  if (req.method === 'GET') {
    try {
      const store = readStore();
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify(store, null, 2));
      return;
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: 'Failed to export backup', details: err.message }));
      return;
    }
  }

  if (req.method === 'POST') {
    try {
      const data = await parseBody(req);
      if (
        !data ||
        !Array.isArray(data.inquiries) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.news)
      ) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({
          error: 'Invalid backup format: inquiries, products, and news arrays are required'
        }));
        return;
      }

      const restored = writeStore(data);
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({
        success: true,
        counts: {
          inquiries: restored.inquiries.length,
          products: restored.products.length,
          news: restored.news.length,
          downloads: restored.downloads.length
        }
      }));
      return;
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: 'Failed to restore backup', details: err.message }));
      return;
    }
  }

  res.writeHead(405, CORS_HEADERS);
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
}
