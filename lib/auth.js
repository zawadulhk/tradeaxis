/**
 * TradeAxis Global Ventures - Server Authentication Guard
 * Validates administrative requests against ADMIN_PASSWORD.
 */

const DEFAULT_ADMIN_PASSWORD = 'Adminwasif123!';

/**
 * Checks if the request is authorized with the correct admin credentials.
 * Supports Node.js IncomingMessage (req.headers) and Web Standard Request (req.headers.get).
 *
 * @param {import('http').IncomingMessage | Request} req
 * @returns {boolean}
 */
export function verifyAdmin(req) {
  const masterPassword = (process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD).trim();

  let candidate = null;

  if (req && typeof req.headers?.get === 'function') {
    // Web Standard Request (Fetch API / Edge)
    candidate = req.headers.get('x-admin-password');
    if (!candidate) {
      const authHeader = req.headers.get('authorization') || '';
      candidate = authHeader.replace(/^Bearer\s+/i, '').trim();
    }
  } else if (req && req.headers) {
    // Node.js IncomingMessage
    candidate = req.headers['x-admin-password'] || req.headers['X-Admin-Password'];
    if (!candidate && req.headers['authorization']) {
      candidate = req.headers['authorization'].replace(/^Bearer\s+/i, '').trim();
    }
  }

  return Boolean(candidate && candidate.trim() === masterPassword);
}

/**
 * Standardized CORS response headers for API routes.
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-password, Authorization',
  'Content-Type': 'application/json'
};
