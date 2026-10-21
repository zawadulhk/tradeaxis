import { verifyAdmin, CORS_HEADERS } from '../lib/auth.js';
import { getDbStatus } from '../lib/db.js';

export default async function handler(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Handle POST (login submission) or GET (handshake)
  if (req.method === 'POST') {
    let body = {};
    try {
      if (typeof req.body === 'object' && req.body !== null) {
        body = req.body;
      } else if (typeof req.body === 'string') {
        body = JSON.parse(req.body);
      } else {
        // Collect stream if needed
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const str = Buffer.concat(chunks).toString();
        body = str ? JSON.parse(str) : {};
      }
    } catch (e) {
      body = {};
    }

    const masterPassword = (process.env.ADMIN_PASSWORD || 'Adminwasif123!').trim();
    const candidate = (body.password || req.headers['x-admin-password'] || '').trim();

    if (candidate && candidate === masterPassword) {
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({
        success: true,
        authenticated: true,
        message: 'Authentication successful',
        status: getDbStatus()
      }));
      return;
    }

    res.writeHead(401, CORS_HEADERS);
    res.end(JSON.stringify({
      success: false,
      authenticated: false,
      error: 'Invalid administrative password'
    }));
    return;
  }

  if (req.method === 'GET') {
    if (verifyAdmin(req)) {
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({
        authenticated: true,
        status: getDbStatus()
      }));
      return;
    }

    res.writeHead(401, CORS_HEADERS);
    res.end(JSON.stringify({
      authenticated: false,
      error: 'Unauthorized'
    }));
    return;
  }

  res.writeHead(405, CORS_HEADERS);
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
}
