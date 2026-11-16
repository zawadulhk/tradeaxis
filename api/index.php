<?php
/**
 * TradeAxis Global Ventures — Self-Sustaining PHP API Router for Shared Hosting
 * Works out-of-the-box on cPanel / Apache / LiteSpeed / GoDaddy / Hostinger / Namecheap.
 * Persists all data in ../data/store.json with exclusive file locking (no database required).
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, x-admin-password, X-Admin-Password, Authorization');

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

define('DEFAULT_ADMIN_PASSWORD', 'Adminwasif123!');
define('STORE_FILE', dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'store.json');
define('OFFICIAL_EMAIL', 'tradeaxisglobalventures@gmail.com');

/**
 * Load optional .env.local variables if running locally or uploaded with .env.local
 */
function getAdminPassword(): string {
    $envPw = getenv('ADMIN_PASSWORD');
    if (is_string($envPw) && trim($envPw) !== '') {
        return trim($envPw);
    }

    $envFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env.local';
    if (is_file($envFile) && is_readable($envFile)) {
        $lines = @file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (is_array($lines)) {
            foreach ($lines as $line) {
                $trimmed = trim($line);
                if ($trimmed === '' || $trimmed[0] === '#') {
                    continue;
                }
                $eqPos = strpos($trimmed, '=');
                if ($eqPos !== false) {
                    $key = trim(substr($trimmed, 0, $eqPos));
                    $val = trim(substr($trimmed, $eqPos + 1));
                    if ($key === 'ADMIN_PASSWORD' && $val !== '') {
                        return trim($val, " \t\n\r\0\x0B\"'");
                    }
                }
            }
        }
    }

    return DEFAULT_ADMIN_PASSWORD;
}

/**
 * Collect request headers safely across Apache, LiteSpeed, Nginx, and CGI/FastCGI.
 */
function getHeaderValue(string $targetName): string {
    $lowerTarget = strtolower($targetName);

    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strtolower((string)$k) === $lowerTarget) {
                return trim((string)$v);
            }
        }
    }

    $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $targetName));
    if (!empty($_SERVER[$serverKey])) {
        return trim((string)$_SERVER[$serverKey]);
    }
    $redirectKey = 'REDIRECT_' . $serverKey;
    if (!empty($_SERVER[$redirectKey])) {
        return trim((string)$_SERVER[$redirectKey]);
    }

    return '';
}

function getExpectedToken(string $adminPass): string {
    return hash('sha256', $adminPass . '_tradeaxis_salt');
}

function verifyAdmin(): bool {
    $adminPass = getAdminPassword();
    $expectedToken = getExpectedToken($adminPass);

    $pwHeader = getHeaderValue('x-admin-password');
    if ($pwHeader !== '' && (hash_equals($adminPass, $pwHeader) || hash_equals($expectedToken, $pwHeader))) {
        return true;
    }

    $authHeader = getHeaderValue('authorization');
    if ($authHeader !== '') {
        $bearer = trim((string)preg_replace('/^Bearer\s+/i', '', $authHeader));
        if ($bearer !== '' && (hash_equals($adminPass, $bearer) || hash_equals($expectedToken, $bearer))) {
            return true;
        }
    }

    return false;
}

function sendJson(int $statusCode, array $payload): void {
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requireAdmin(): void {
    if (!verifyAdmin()) {
        sendJson(401, ['error' => 'Unauthorized: Admin access required']);
    }
}

function readJsonBody(): array {
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function generateUuid(): string {
    try {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    } catch (Throwable $e) {
        return uniqid('ta-', true);
    }
}

function readStore(): array {
    $default = ['inquiries' => [], 'products' => [], 'news' => [], 'downloads' => []];
    $dir = dirname(STORE_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }

    if (!is_file(STORE_FILE)) {
        writeStore($default);
        return $default;
    }

    $fp = @fopen(STORE_FILE, 'r');
    if (!$fp) {
        return $default;
    }

    flock($fp, LOCK_SH);
    $raw = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    if (!is_string($raw) || trim($raw) === '') {
        return $default;
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return $default;
    }

    return [
        'inquiries' => is_array($data['inquiries'] ?? null) ? $data['inquiries'] : [],
        'products'  => is_array($data['products'] ?? null) ? $data['products'] : [],
        'news'      => is_array($data['news'] ?? null) ? $data['news'] : [],
        'downloads' => is_array($data['downloads'] ?? null) ? $data['downloads'] : [],
    ];
}

function writeStore(array $data): bool {
    $dir = dirname(STORE_FILE);
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
        return false;
    }

    $normalized = [
        'inquiries' => array_values(is_array($data['inquiries'] ?? null) ? $data['inquiries'] : []),
        'products'  => array_values(is_array($data['products'] ?? null) ? $data['products'] : []),
        'news'      => array_values(is_array($data['news'] ?? null) ? $data['news'] : []),
        'downloads' => array_values(is_array($data['downloads'] ?? null) ? $data['downloads'] : []),
    ];

    $json = json_encode($normalized, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return false;
    }

    return file_put_contents(STORE_FILE, $json . "\n", LOCK_EX) !== false;
}

function getStorageStatusPayload(array $store): array {
    return [
        'ok' => true,
        'service' => 'TradeAxis API Gateway',
        'storage' => 'Self-Sustaining Local Storage (data/store.json)',
        'storageMode' => 'Self-Sustaining Local Storage (data/store.json)',
        'connected' => true,
        'engine' => 'PHP Shared Hosting (' . PHP_VERSION . ')',
        'supabaseConfigured' => false,
        'counts' => [
            'inquiries' => count($store['inquiries']),
            'products'  => count($store['products']),
            'news'      => count($store['news']),
            'downloads' => count($store['downloads']),
        ],
        'timestamp' => gmdate('c'),
    ];
}

function resolveRoute(): string {
    if (!empty($_GET['_route'])) {
        return strtolower(trim((string)$_GET['_route'], "/ \t\n\r"));
    }
    $uriPath = (string)parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    if (preg_match('#/api/([a-zA-Z0-9_-]+)(?:\.php|\.js)?/?$#i', $uriPath, $m)) {
        return strtolower($m[1]);
    }
    return '';
}

$route = resolveRoute();
$store = readStore();

switch ($route) {
    // =========================================================================
    // 1. AUTHENTICATION (/api/auth)
    // =========================================================================
    case 'auth':
        $adminPass = getAdminPassword();
        if ($method === 'POST') {
            $body = readJsonBody();
            $candidate = trim((string)($body['password'] ?? getHeaderValue('x-admin-password')));
            if ($candidate !== '' && hash_equals($adminPass, $candidate)) {
                sendJson(200, [
                    'success'       => true,
                    'authenticated' => true,
                    'token'         => getExpectedToken($adminPass),
                    'message'       => 'Authentication successful',
                    'status'        => getStorageStatusPayload($store),
                ]);
            }
            sendJson(401, [
                'success'       => false,
                'authenticated' => false,
                'error'         => 'Invalid administrative password',
            ]);
        }

        if ($method === 'GET') {
            if (verifyAdmin()) {
                sendJson(200, [
                    'authenticated' => true,
                    'status'        => getStorageStatusPayload($store),
                ]);
            }
            sendJson(401, [
                'authenticated' => false,
                'error'         => 'Unauthorized',
            ]);
        }

        sendJson(405, ['error' => 'Method Not Allowed']);
        break;

    // =========================================================================
    // 2. SYSTEM & STORAGE STATUS (/api/status)
    // =========================================================================
    case 'status':
        requireAdmin();
        if ($method !== 'GET') {
            sendJson(405, ['error' => 'Method Not Allowed']);
        }
        sendJson(200, getStorageStatusPayload($store));
        break;

    // =========================================================================
    // 3. COMMERCIAL INQUIRIES CRM (/api/inquiries)
    // =========================================================================
    case 'inquiries':
        if ($method === 'POST') {
            $data = readJsonBody();
            $fullName = trim((string)($data['full_name'] ?? ''));
            $email    = trim((string)($data['email'] ?? ''));
            $phone    = trim((string)($data['phone'] ?? ''));
            $message  = trim((string)($data['message'] ?? ''));

            if ($fullName === '' && $email === '' && $phone === '' && $message === '') {
                sendJson(400, ['error' => 'Inquiry details cannot be blank']);
            }

            $now = gmdate('Y-m-d\TH:i:s\Z');
            $item = [
                'id'                  => !empty($data['id']) ? (string)$data['id'] : generateUuid(),
                'created_at'          => $now,
                'inquiry_type'        => (string)($data['inquiry_type'] ?? 'enquiry'),
                'full_name'           => $fullName !== '' ? $fullName : 'Anonymous Prospect',
                'company_name'        => trim((string)($data['company_name'] ?? '')) ?: 'Unspecified Entity',
                'email'               => $email,
                'phone'               => $phone,
                'country'             => $data['country'] ?? null,
                'division'            => $data['division'] ?? null,
                'product_requirement' => $data['product_requirement'] ?? null,
                'volume_port'         => $data['volume_port'] ?? null,
                'subject'             => $data['subject'] ?? null,
                'message'             => $message,
                'status'              => 'new',
                'admin_notes'         => '',
                'updated_at'          => $now,
            ];

            array_unshift($store['inquiries'], $item);
            if (!writeStore($store)) {
                sendJson(500, ['error' => 'Failed to save inquiry to storage']);
            }

            // Optional non-blocking email alert on shared hosting mail server
            if (function_exists('mail')) {
                $safeSubjectName = str_replace(["\r", "\n"], ' ', $item['full_name']);
                $mailSubject = '[TradeAxis Website] New Commercial Enquiry from ' . $safeSubjectName;
                $mailBody = "New Enquiry Submitted on TradeAxis Global Ventures:\n\n"
                    . "Name: {$item['full_name']}\n"
                    . "Company: {$item['company_name']}\n"
                    . "Email: {$item['email']}\n"
                    . "Phone: {$item['phone']}\n"
                    . "Product / Subject: " . ($item['product_requirement'] ?? $item['subject'] ?? 'General Enquiry') . "\n"
                    . "Volume / Port: " . ($item['volume_port'] ?? 'Not specified') . "\n\n"
                    . "Message:\n{$item['message']}\n\n"
                    . "Timestamp: {$now}\n";
                $safeHost = preg_replace('/[^a-zA-Z0-9.-]/', '', (string)($_SERVER['HTTP_HOST'] ?? 'localhost'));
                $safeHost = preg_replace('/:\d+$/', '', $safeHost);
                if ($safeHost === '' || strpos($safeHost, '.') === false) {
                    $safeHost = 'tradeaxisglobal.com';
                }
                $safeReply = filter_var(str_replace(["\r", "\n"], '', $email), FILTER_VALIDATE_EMAIL);
                $headers = "From: TradeAxis Website <noreply@{$safeHost}>\r\nContent-Type: text/plain; charset=UTF-8";
                if ($safeReply) {
                    $headers .= "\r\nReply-To: {$safeReply}";
                }
                @mail(OFFICIAL_EMAIL, $mailSubject, $mailBody, $headers);
            }

            sendJson(201, ['success' => true, 'inquiry' => $item]);
        }

        requireAdmin();

        if ($method === 'GET') {
            sendJson(200, ['inquiries' => $store['inquiries']]);
        }

        if ($method === 'PATCH' || $method === 'PUT') {
            $body = readJsonBody();
            $id = (string)($body['id'] ?? '');
            if ($id === '') {
                sendJson(400, ['error' => 'Missing inquiry ID']);
            }

            $updatedItem = null;
            foreach ($store['inquiries'] as $idx => $existing) {
                if ((string)($existing['id'] ?? '') === $id) {
                    if (array_key_exists('status', $body)) {
                        $existing['status'] = (string)$body['status'];
                    }
                    if (array_key_exists('admin_notes', $body)) {
                        $existing['admin_notes'] = (string)$body['admin_notes'];
                    }
                    $existing['updated_at'] = gmdate('Y-m-d\TH:i:s\Z');
                    $store['inquiries'][$idx] = $existing;
                    $updatedItem = $existing;
                    break;
                }
            }

            if ($updatedItem === null) {
                sendJson(404, ['error' => 'Inquiry not found']);
            }

            if (!writeStore($store)) {
                sendJson(500, ['error' => 'Failed to persist inquiry update']);
            }

            sendJson(200, ['success' => true, 'inquiry' => $updatedItem]);
        }

        if ($method === 'DELETE') {
            $body = readJsonBody();
            $id = (string)($_GET['id'] ?? ($body['id'] ?? ''));
            if ($id === '') {
                sendJson(400, ['error' => 'Missing inquiry ID']);
            }

            $store['inquiries'] = array_values(array_filter(
                $store['inquiries'],
                static function ($x) use ($id) {
                    return (string)($x['id'] ?? '') !== $id;
                }
            ));

            if (!writeStore($store)) {
                sendJson(500, ['error' => 'Failed to delete inquiry']);
            }

            sendJson(200, ['success' => true, 'deletedId' => $id]);
        }

        sendJson(405, ['error' => 'Method Not Allowed']);
        break;

    // =========================================================================
    // 4. PRODUCTS CATALOG & FEATURED CARDS CMS (/api/products)
    // =========================================================================
    case 'products':
        if ($method === 'GET') {
            $products = $store['products'];
            usort($products, static function ($a, $b) {
                $sa = isset($a['sort_order']) ? (int)$a['sort_order'] : PHP_INT_MAX;
                $sb = isset($b['sort_order']) ? (int)$b['sort_order'] : PHP_INT_MAX;
                return $sa <=> $sb;
            });
            sendJson(200, ['products' => $products]);
        }

        requireAdmin();

        if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
            $data = readJsonBody();
            $name = trim((string)($data['name'] ?? ''));
            if ($name === '') {
                sendJson(400, ['error' => 'Product name is required']);
            }

            $id = !empty($data['id']) ? (string)$data['id'] : generateUuid();
            $isExisting = !empty($data['id']);

            $item = [
                'id'          => $id,
                'name'        => $name,
                'category'    => (string)($data['category'] ?? 'jute'),
                'division'    => (string)($data['division'] ?? 'General Sourcing'),
                'badge'       => (string)($data['badge'] ?? ''),
                'description' => (string)($data['description'] ?? ''),
                'specs'       => (string)($data['specs'] ?? ''),
                'is_featured' => !empty($data['is_featured']),
            ];

            if (isset($data['sort_order'])) {
                $item['sort_order'] = (int)$data['sort_order'];
            }
            if (isset($data['origins'])) {
                $item['origins'] = $data['origins'];
            }
            if (isset($data['image_url'])) {
                $item['image_url'] = $data['image_url'];
            }

            $replaced = false;
            if ($isExisting) {
                foreach ($store['products'] as $idx => $existing) {
                    if ((string)($existing['id'] ?? '') === $id) {
                        $store['products'][$idx] = array_merge($existing, $item);
                        $item = $store['products'][$idx];
                        $replaced = true;
                        break;
                    }
                }
            }

            if (!$replaced) {
                array_unshift($store['products'], $item);
            }

            if (!writeStore($store)) {
                sendJson(500, ['error' => 'Failed to save product']);
            }

            sendJson(200, ['success' => true, 'product' => $item]);
        }

        if ($method === 'DELETE') {
            $body = readJsonBody();
            $id = (string)($_GET['id'] ?? ($body['id'] ?? ''));
            if ($id === '') {
                sendJson(400, ['error' => 'Missing product ID']);
            }

            $store['products'] = array_values(array_filter(
                $store['products'],
                static function ($x) use ($id) {
                    return (string)($x['id'] ?? '') !== $id;
                }
            ));

            if (!writeStore($store)) {
                sendJson(500, ['error' => 'Failed to delete product']);
            }

            sendJson(200, ['success' => true, 'deletedId' => $id]);
        }

        sendJson(405, ['error' => 'Method Not Allowed']);
        break;

    // =========================================================================
    // 5. NEWS & MARKET INSIGHTS CMS (/api/news)
    // =========================================================================
    case 'news':
        if ($method === 'GET') {
            sendJson(200, ['news' => $store['news']]);
        }

        requireAdmin();

        if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
            $data = readJsonBody();
            $title = trim((string)($data['title'] ?? ''));
            if ($title === '') {
                sendJson(400, ['error' => 'Article title is required']);
            }

            $id = !empty($data['id']) ? (string)$data['id'] : generateUuid();
            $isExisting = !empty($data['id']);

            $item = [
                'id'           => $id,
                'title'        => $title,
                'category'     => (string)($data['category'] ?? 'Market Intelligence'),
                'publish_date' => (string)($data['publish_date'] ?? gmdate('Y-m-d')),
                'read_time'    => (string)($data['read_time'] ?? '3 min read'),
                'excerpt'      => (string)($data['excerpt'] ?? ''),
                'content'      => (string)($data['content'] ?? ''),
                'published'    => !array_key_exists('published', $data) || $data['published'] !== false,
            ];

            $replaced = false;
            if ($isExisting) {
                foreach ($store['news'] as $idx => $existing) {
                    if ((string)($existing['id'] ?? '') === $id) {
                        $store['news'][$idx] = array_merge($existing, $item);
                        $item = $store['news'][$idx];
                        $replaced = true;
                        break;
                    }
                }
            }

            if (!$replaced) {
                array_unshift($store['news'], $item);
            }

            if (!writeStore($store)) {
                sendJson(500, ['error' => 'Failed to save news article']);
            }

            sendJson(200, ['success' => true, 'article' => $item]);
        }

        if ($method === 'DELETE') {
            $body = readJsonBody();
            $id = (string)($_GET['id'] ?? ($body['id'] ?? ''));
            if ($id === '') {
                sendJson(400, ['error' => 'Missing article ID']);
            }

            $store['news'] = array_values(array_filter(
                $store['news'],
                static function ($x) use ($id) {
                    return (string)($x['id'] ?? '') !== $id;
                }
            ));

            if (!writeStore($store)) {
                sendJson(500, ['error' => 'Failed to delete news article']);
            }

            sendJson(200, ['success' => true, 'deletedId' => $id]);
        }

        sendJson(405, ['error' => 'Method Not Allowed']);
        break;

    // =========================================================================
    // 6. DOWNLOADS CENTER CMS (/api/downloads)
    // =========================================================================
    case 'downloads':
        if ($method === 'GET') {
            sendJson(200, ['downloads' => $store['downloads']]);
        }

        requireAdmin();

        if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
            $data = readJsonBody();
            $title = trim((string)($data['title'] ?? ''));
            if ($title === '') {
                sendJson(400, ['error' => 'Document title is required']);
            }

            $id = !empty($data['id']) ? (string)$data['id'] : generateUuid();
            $isExisting = !empty($data['id']);
            $existingItem = null;
            if ($isExisting) {
                foreach ($store['downloads'] as $ex) {
                    if ((string)($ex['id'] ?? '') === $id) {
                        $existingItem = $ex;
                        break;
                    }
                }
            }

            $fileUrl  = (string)($existingItem['file_url'] ?? ($data['file_url'] ?? ''));
            $fileName = (string)($existingItem['file_name'] ?? ($data['file_name'] ?? ''));

            if (!empty($data['file_data']) && !empty($data['file_name'])) {
                $origName = (string)$data['file_name'];
                $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $origName);
                $ext = strtolower(pathinfo($safeName, PATHINFO_EXTENSION));
                $allowedExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip'];
                if (!in_array($ext, $allowedExts, true)) {
                    sendJson(400, ['error' => 'Unsupported document file extension']);
                }

                $base64Str = preg_replace('/^data:[^;]+;base64,/', '', (string)$data['file_data']);
                $decoded = base64_decode((string)$base64Str, true);
                if ($decoded === false) {
                    sendJson(400, ['error' => 'Invalid base64 file encoding']);
                }
                if (strlen($decoded) > 25 * 1024 * 1024) {
                    sendJson(400, ['error' => 'File exceeds 25 MB upload limit']);
                }

                $downloadsDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'downloads';
                if (!is_dir($downloadsDir) && !@mkdir($downloadsDir, 0755, true)) {
                    sendJson(500, ['error' => 'Failed to create assets/downloads directory']);
                }

                $savedFileName = time() . '-' . $safeName;
                $targetPath = $downloadsDir . DIRECTORY_SEPARATOR . $savedFileName;
                if (file_put_contents($targetPath, $decoded, LOCK_EX) === false) {
                    sendJson(500, ['error' => 'Failed to write uploaded document']);
                }

                $fileUrl  = 'assets/downloads/' . $savedFileName;
                $fileName = $origName;
            }

            $item = [
                'id'          => $id,
                'title'       => $title,
                'category'    => (string)($data['category'] ?? 'PDF • Documentation'),
                'description' => (string)($data['description'] ?? ''),
                'file_url'    => $fileUrl,
                'file_name'   => $fileName,
                'is_primary'  => !empty($data['is_primary']),
                'updated_at'  => gmdate('Y-m-d\TH:i:s\Z'),
            ];

            $replaced = false;
            if ($isExisting) {
                foreach ($store['downloads'] as $idx => $existing) {
                    if ((string)($existing['id'] ?? '') === $id) {
                        $store['downloads'][$idx] = array_merge($existing, $item);
                        $item = $store['downloads'][$idx];
                        $replaced = true;
                        break;
                    }
                }
            }

            if (!$replaced) {
                array_unshift($store['downloads'], $item);
            }

            if (!writeStore($store)) {
                sendJson(500, ['error' => 'Failed to save document metadata']);
            }

            sendJson(200, ['success' => true, 'download' => $item]);
        }

        if ($method === 'DELETE') {
            $body = readJsonBody();
            $id = (string)($_GET['id'] ?? ($body['id'] ?? ''));
            if ($id === '') {
                sendJson(400, ['error' => 'Missing document ID']);
            }

            foreach ($store['downloads'] as $existing) {
                if ((string)($existing['id'] ?? '') === $id) {
                    $relUrl = (string)($existing['file_url'] ?? '');
                    if (strpos($relUrl, 'assets/downloads/') === 0) {
                        $diskFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relUrl);
                        if (is_file($diskFile)) {
                            @unlink($diskFile);
                        }
                    }
                    break;
                }
            }

            $store['downloads'] = array_values(array_filter(
                $store['downloads'],
                static function ($x) use ($id) {
                    return (string)($x['id'] ?? '') !== $id;
                }
            ));

            if (!writeStore($store)) {
                sendJson(500, ['error' => 'Failed to delete document']);
            }

            sendJson(200, ['success' => true, 'deletedId' => $id]);
        }

        sendJson(405, ['error' => 'Method Not Allowed']);
        break;

    // =========================================================================
    // 7. FULL JSON BACKUP & RESTORE (/api/backup)
    // =========================================================================
    case 'backup':
        requireAdmin();

        if ($method === 'GET') {
            sendJson(200, $store);
        }

        if ($method === 'POST') {
            $data = readJsonBody();
            if (
                !isset($data['inquiries'], $data['products'], $data['news']) ||
                !is_array($data['inquiries']) ||
                !is_array($data['products']) ||
                !is_array($data['news'])
            ) {
                sendJson(400, ['error' => 'Invalid backup format: inquiries, products, and news arrays are required']);
            }

            if (!writeStore($data)) {
                sendJson(500, ['error' => 'Failed to restore backup file']);
            }

            sendJson(200, [
                'success' => true,
                'counts' => [
                    'inquiries' => count($data['inquiries']),
                    'products'  => count($data['products']),
                    'news'      => count($data['news']),
                    'downloads' => is_array($data['downloads'] ?? null) ? count($data['downloads']) : 0,
                ],
            ]);
        }

        sendJson(405, ['error' => 'Method Not Allowed']);
        break;

    default:
        sendJson(404, ['error' => 'API endpoint not found']);
}
