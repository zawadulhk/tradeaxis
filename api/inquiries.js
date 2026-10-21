import { verifyAdmin, CORS_HEADERS } from '../lib/auth.js';
import { getInquiries, createInquiry, updateInquiry, deleteInquiry } from '../lib/db.js';

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

  // 1. PUBLIC LEAD SUBMISSION (POST)
  if (req.method === 'POST') {
    try {
      const data = await parseBody(req);
      if (!data.full_name && !data.email && !data.phone && !data.message) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'Inquiry details cannot be blank' }));
        return;
      }

      const item = await createInquiry(data);
      res.writeHead(201, CORS_HEADERS);
      res.end(JSON.stringify({ success: true, inquiry: item }));
      return;
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: 'Failed to process inquiry', details: err.message }));
      return;
    }
  }

  // 2. ADMIN AUTH GUARD FOR READ/UPDATE/DELETE
  if (!verifyAdmin(req)) {
    res.writeHead(401, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'Unauthorized: Admin access required' }));
    return;
  }

  // GET: Fetch all inquiries
  if (req.method === 'GET') {
    try {
      const list = await getInquiries();
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ inquiries: list }));
      return;
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: 'Failed to retrieve inquiries' }));
      return;
    }
  }

  // PATCH: Update inquiry status or notes
  if (req.method === 'PATCH') {
    try {
      const { id, ...updates } = await parseBody(req);
      if (!id) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'Missing inquiry ID' }));
        return;
      }
      const updated = await updateInquiry(id, updates);
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ success: true, inquiry: updated }));
      return;
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: 'Failed to update inquiry' }));
      return;
    }
  }

  // DELETE: Delete inquiry
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
        res.end(JSON.stringify({ error: 'Missing inquiry ID' }));
        return;
      }
      await deleteInquiry(id);
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ success: true, deletedId: id }));
      return;
    } catch (err) {
      res.writeHead(500, CORS_HEADERS);
      res.end(JSON.stringify({ error: 'Failed to delete inquiry' }));
      return;
    }
  }

  res.writeHead(405, CORS_HEADERS);
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
}
