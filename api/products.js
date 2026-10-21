import { verifyAdmin, CORS_HEADERS } from '../lib/auth.js';
import { getProducts, saveProduct, deleteProduct } from '../lib/db.js';

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

  // GET: Public & Admin read
  if (req.method === 'GET') {
    try {
      const items = await getProducts();
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ products: items }));
      return;
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: 'Failed to retrieve products', details: err.message }));
      return;
    }
  }

  // Protected Admin endpoints for mutations
  if (!verifyAdmin(req)) {
    res.writeHead(401, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'Unauthorized: Admin access required' }));
    return;
  }

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const data = await parseBody(req);
      if (!data.name) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'Product name is required' }));
        return;
      }
      const saved = await saveProduct(data);
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ success: true, product: saved }));
      return;
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: 'Failed to save product', details: err.message }));
      return;
    }
  }

  if (req.method === 'DELETE') {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      let id = url.searchParams.get('id');
      if (!id) {
        const body = await parseBody(req);
        id = body.id;
      }
      if (!id) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'Missing product ID' }));
        return;
      }
      await deleteProduct(id);
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ success: true, deletedId: id }));
      return;
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: 'Failed to delete product', details: err.message }));
      return;
    }
  }

  res.writeHead(405, CORS_HEADERS);
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
}
