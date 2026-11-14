import { getDbStatus } from '../lib/db.js';
import { verifyAdmin, CORS_HEADERS } from '../lib/auth.js';

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

  if (req.method !== 'GET') {
    res.writeHead(405, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const status = getDbStatus();

  res.writeHead(200, CORS_HEADERS);
  res.end(JSON.stringify({
    ok: true,
    service: 'TradeAxis API Gateway',
    timestamp: new Date().toISOString(),
    ...status
  }, null, 2));
}
