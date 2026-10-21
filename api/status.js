import { getDbStatus } from '../lib/db.js';
import { CORS_HEADERS } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  res.writeHead(200, CORS_HEADERS);
  res.end(JSON.stringify({
    ok: true,
    service: 'TradeAxis API Gateway',
    timestamp: new Date().toISOString(),
    ...getDbStatus()
  }));
}
