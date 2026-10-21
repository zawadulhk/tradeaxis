import { getDbStatus, hasSupabase } from '../lib/db.js';
import { CORS_HEADERS } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const baseStatus = getDbStatus();
  let supabaseDiagnostic = null;

  if (hasSupabase()) {
    try {
      const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
      const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
      const headers = {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      };

      // Test 1: Inquiries table
      const inqRes = await fetch(`${url}/rest/v1/inquiries?select=*&limit=1`, { headers });
      const inqText = await inqRes.text();

      // Test 2: Products table
      const prodRes = await fetch(`${url}/rest/v1/products?select=*&limit=1`, { headers });
      const prodText = await prodRes.text();

      supabaseDiagnostic = {
        connected: true,
        inquiriesTest: {
          statusCode: inqRes.status,
          ok: inqRes.ok,
          body: inqText.slice(0, 300)
        },
        productsTest: {
          statusCode: prodRes.status,
          ok: prodRes.ok,
          body: prodText.slice(0, 300)
        }
      };
    } catch (err) {
      supabaseDiagnostic = {
        connected: false,
        error: err.message
      };
    }
  }

  res.writeHead(200, CORS_HEADERS);
  res.end(JSON.stringify({
    ok: true,
    service: 'TradeAxis API Gateway',
    timestamp: new Date().toISOString(),
    ...baseStatus,
    supabaseDiagnostic
  }, null, 2));
}
