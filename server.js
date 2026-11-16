import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local if present
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  try {
    const envLines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of envLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch (e) {
    console.warn('[Server] Could not parse .env.local:', e.message);
  }
}

// Fallback admin password if not defined
if (!process.env.ADMIN_PASSWORD) {
  process.env.ADMIN_PASSWORD = 'Adminwasif123!';
}

// Import self-sustaining API handlers
import authHandler from './api/auth.js';
import inquiriesHandler from './api/inquiries.js';
import productsHandler from './api/products.js';
import newsHandler from './api/news.js';
import downloadsHandler from './api/downloads.js';
import statusHandler from './api/status.js';
import backupHandler from './api/backup.js';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = parsedUrl.pathname;

  if (!res.status) {
    res.status = function (code) {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    res.json = function (obj) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(obj));
    };
  }

  // 1. ROUTE API CALLS
  if (pathname === '/api/auth' || pathname === '/api/auth.js') {
    return authHandler(req, res);
  }
  if (pathname === '/api/inquiries' || pathname === '/api/inquiries.js') {
    return inquiriesHandler(req, res);
  }
  if (pathname === '/api/products' || pathname === '/api/products.js') {
    return productsHandler(req, res);
  }
  if (pathname === '/api/news' || pathname === '/api/news.js') {
    return newsHandler(req, res);
  }
  if (pathname === '/api/downloads' || pathname === '/api/downloads.js') {
    return downloadsHandler(req, res);
  }
  if (pathname === '/api/status' || pathname === '/api/status.js') {
    return statusHandler(req, res);
  }
  if (pathname === '/api/backup' || pathname === '/api/backup.js') {
    return backupHandler(req, res);
  }

  // Block direct HTTP access to internal data files or server config (matching Apache .htaccess)
  const lowerPath = pathname.toLowerCase();
  if (
    lowerPath.startsWith('/data/') ||
    lowerPath.startsWith('/lib/') ||
    lowerPath === '/.env' ||
    lowerPath === '/.env.local' ||
    lowerPath === '/server.js' ||
    lowerPath === '/package.json'
  ) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // 2. SERVE STATIC FILES
  let filePath = path.join(__dirname, decodeURIComponent(pathname));

  // If path is a directory (e.g. /admin or /)
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    // Redirect /admin -> /admin/ so relative admin.css / admin.js resolve properly
    if (!pathname.endsWith('/')) {
      res.writeHead(301, { Location: pathname + '/' + parsedUrl.search });
      res.end();
      return;
    }
    filePath = path.join(filePath, 'index.html');
  } else if (!fs.existsSync(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
      filePath = path.join(filePath, 'index.html');
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`TradeAxis Self-Sustaining Server: http://localhost:${PORT}`);
  console.log(`Admin Portal: http://localhost:${PORT}/admin/`);
  console.log(`Storage: Local JSON Store (data/store.json)`);
  console.log(`======================================================\n`);
});
