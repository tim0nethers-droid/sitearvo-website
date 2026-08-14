<?php
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/catalog.php';

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: same-origin');

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = preg_replace('#^/api#', '', $path) ?: '/';
$path = '/' . trim($path, '/');

try {
    if ($method === 'GET' && $path === '/health') json_response(['status' => 'ok', 'database' => db()->query('SELECT 1')->fetchColumn() == 1]);
    if ($method === 'GET' && $path === '/catalog') json_response(public_catalog());
    if ($method === 'GET' && $path === '/categories') json_response(public_catalog()['categories']);
    if ($method === 'GET' && preg_match('#^/categories/([a-z0-9-]+)$#', $path, $matches)) {
        $catalog = public_catalog();
        foreach ($catalog['categories'] as $category) if ($category['slug'] === $matches[1]) json_response($category);
        json_error('Category not found.', 404);
    }
    if ($method === 'GET' && $path === '/services') {
        $catalog = public_catalog();
        json_response(array_merge(...array_map(fn($category) => $category['services'], $catalog['categories'])));
    }
    if ($method === 'GET' && preg_match('#^/services/([a-z0-9-]+)/addons$#', $path, $matches)) {
        $service = public_service($matches[1]);
        if (!$service) json_error('Service not found.', 404);
        json_response($service['addons']);
    }
    if ($method === 'GET' && preg_match('#^/services/([a-z0-9-]+)$#', $path, $matches)) {
        $service = public_service($matches[1]);
        if (!$service) json_error('Service not found.', 404);
        json_response($service);
    }
    if ($method === 'POST' && $path === '/orders') create_order();
    if ($method === 'POST' && $path === '/chat/start') start_chat();
    if ($method === 'POST' && $path === '/analytics/pageview') track_pageview();
    if (preg_match('#^/chat/([a-f0-9]{64})$#', $path, $matches)) {
        if ($method === 'GET') visitor_chat($matches[1]);
    }
    if ($method === 'POST' && preg_match('#^/chat/([a-f0-9]{64})/messages$#', $path, $matches)) visitor_chat_message($matches[1]);
    if ($method === 'POST' && $path === '/auth/login') login_admin();
    if ($method === 'POST' && $path === '/auth/logout') logout_admin();
    if ($method === 'GET' && $path === '/auth/me') json_response(admin_payload(require_admin()));

    if (str_starts_with($path, '/admin')) {
        $mutation = !in_array($method, ['GET', 'HEAD'], true);
        require_admin($mutation);
        route_admin($method, $path);
    }
    json_error('API route not found.', 404);
} catch (PDOException $error) {
    error_log('SiteArvo database error: ' . $error->getMessage());
    json_error('A database operation failed. Check the server configuration and logs.', 500);
} catch (RuntimeException $error) {
    json_error($error->getMessage(), 503);
} catch (Throwable $error) {
    error_log('SiteArvo API error: ' . $error->getMessage());
    json_error('The server could not complete this request.', 500);
}

function login_admin(): never {
    $body = request_body();
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $password = (string)($body['password'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') json_error('Enter a valid email and password.', 422);
    $ip = client_ip();
    $guard = db()->prepare("SELECT COUNT(*) FROM admin_login_attempts WHERE email = ? AND ip_address = ? AND was_successful = 0 AND attempted_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
    $guard->execute([$email, $ip]);
    if ((int)$guard->fetchColumn() >= 5) json_error('Too many failed attempts. Try again in 15 minutes.', 429);
    $statement = db()->prepare('SELECT * FROM admins WHERE email = ? AND is_active = 1');
    $statement->execute([$email]);
    $admin = $statement->fetch();
    $valid = $admin && password_verify($password, $admin['password_hash']);
    $attempt = db()->prepare('INSERT INTO admin_login_attempts (email, ip_address, was_successful) VALUES (?, ?, ?)');
    $attempt->execute([$email, $ip, $valid ? 1 : 0]);
    if (!$valid) json_error('Incorrect email or password.', 401);
    session_regenerate_id(true);
    $_SESSION['admin_id'] = (int)$admin['id'];
    $_SESSION['csrf'] = bin2hex(random_bytes(24));
    db()->prepare('UPDATE admins SET last_login_at = NOW() WHERE id = ?')->execute([$admin['id']]);
    json_response(admin_payload($admin));
}

function logout_admin(): never {
    if (!empty($_SESSION['admin_id'])) require_admin(true);
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', $params['secure'], $params['httponly']);
    }
    session_destroy();
    json_response(['logged_out' => true]);
}

function create_order(): never {
    $body = request_body();
    $errors = [];
    foreach (['full_name', 'phone', 'email', 'project_description', 'service_id'] as $field) if (trim((string)($body[$field] ?? '')) === '') $errors[$field] = 'Required';
    if (!filter_var($body['email'] ?? '', FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Invalid email';
    if ($errors) json_error('Please complete the required order details.', 422, $errors);
    $settings = settings_map();
    if (($settings['orders_enabled'] ?? '1') === '0') json_error('New online enquiries are temporarily disabled.', 409);

    $pdo = db();
    $serviceStatement = $pdo->prepare("SELECT s.*, c.is_active AS category_active FROM services s INNER JOIN categories c ON c.id = s.category_id WHERE s.id = ? AND s.is_active = 1 AND c.is_active = 1 AND s.price_type = 'fixed'");
    $serviceStatement->execute([(int)$body['service_id']]);
    $service = $serviceStatement->fetch();
    if (!$service || $service['base_price'] === null) json_error('This package is not available for fixed-price ordering.', 409);
    $basePrice = (float)($service['sale_price'] ?? $service['base_price']);
    $addonSelections = is_array($body['addons'] ?? null) ? $body['addons'] : [];
    $addons = [];
    $total = $basePrice;
    $addonStatement = $pdo->prepare('SELECT a.* FROM addons a INNER JOIN service_addons sa ON sa.addon_id = a.id WHERE a.id = ? AND sa.service_id = ? AND a.is_active = 1');
    foreach ($addonSelections as $selection) {
        $quantity = max(1, min(50, (int)($selection['quantity'] ?? 1)));
        $addonStatement->execute([(int)($selection['addon_id'] ?? 0), $service['id']]);
        $addon = $addonStatement->fetch();
        if (!$addon) json_error('One selected add-on is no longer available.', 409);
        if ($addon['pricing_type'] === 'custom_quote' || $addon['price'] === null) json_error("{$addon['name']} requires a custom quote and cannot be included in a fixed total.", 409);
        $line = round((float)$addon['price'] * $quantity, 2);
        $addon['quantity'] = $quantity;
        $addon['line_total'] = $line;
        $addons[] = $addon;
        $total += $line;
    }

    $pdo->beginTransaction();
    try {
        $orderStatement = $pdo->prepare('INSERT INTO orders (full_name, phone, email, company_name, country, business_type, project_description, preferred_contact, total_amount, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $orderStatement->execute([
            trim($body['full_name']), trim($body['phone']), strtolower(trim($body['email'])), trim((string)($body['company_name'] ?? '')) ?: null,
            trim((string)($body['country'] ?? 'India')), trim((string)($body['business_type'] ?? '')) ?: null, trim($body['project_description']),
            in_array($body['preferred_contact'] ?? '', ['whatsapp', 'phone', 'email'], true) ? $body['preferred_contact'] : 'whatsapp', round($total, 2), $settings['currency'] ?? 'INR',
        ]);
        $orderId = (int)$pdo->lastInsertId();
        $orderNumber = 'SAR-' . date('Y') . '-' . str_pad((string)$orderId, 5, '0', STR_PAD_LEFT);
        $pdo->prepare('UPDATE orders SET order_number = ? WHERE id = ?')->execute([$orderNumber, $orderId]);
        $itemStatement = $pdo->prepare('INSERT INTO order_items (order_id, service_id, service_name, service_slug, unit_price, quantity, line_total, service_snapshot) VALUES (?, ?, ?, ?, ?, 1, ?, ?)');
        $itemStatement->execute([$orderId, $service['id'], $service['name'], $service['slug'], $basePrice, $basePrice, json_encode($service, JSON_UNESCAPED_UNICODE)]);
        $itemId = (int)$pdo->lastInsertId();
        $orderAddon = $pdo->prepare('INSERT INTO order_addons (order_item_id, addon_id, addon_name, unit_price, quantity, line_total, addon_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?)');
        foreach ($addons as $addon) $orderAddon->execute([$itemId, $addon['id'], $addon['name'], $addon['price'], $addon['quantity'], $addon['line_total'], json_encode($addon, JSON_UNESCAPED_UNICODE)]);
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
    json_response(['order_id' => $orderNumber, 'service_name' => $service['name'], 'base_price' => $basePrice, 'addons' => array_map(fn($addon) => ['id' => (int)$addon['id'], 'name' => $addon['name'], 'quantity' => $addon['quantity'], 'unit_price' => (float)$addon['price'], 'line_total' => $addon['line_total']], $addons), 'total' => round($total, 2), 'currency' => $settings['currency'] ?? 'INR'], 201);
}

function route_admin(string $method, string $path): never {
    if ($method === 'GET' && $path === '/admin/dashboard') {
        ensure_chat_schema();
        ensure_analytics_schema();
        $pdo = db();
        $totalPageviews = (int)$pdo->query('SELECT COUNT(*) FROM page_views')->fetchColumn();
        $uniqueVisitors = (int)$pdo->query('SELECT COUNT(DISTINCT visitor_hash) FROM page_views')->fetchColumn();
        $todayPageviews = (int)$pdo->query('SELECT COUNT(*) FROM page_views WHERE DATE(created_at) = CURDATE()')->fetchColumn();
        $last7DaysTotal = (int)$pdo->query("SELECT COUNT(*) FROM page_views WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)")->fetchColumn();
        json_response([
            'active_categories' => (int)db()->query('SELECT COUNT(*) FROM categories WHERE is_active = 1')->fetchColumn(),
            'active_services' => (int)db()->query('SELECT COUNT(*) FROM services WHERE is_active = 1')->fetchColumn(),
            'packages' => (int)db()->query("SELECT COUNT(*) FROM services WHERE price_type = 'fixed'")->fetchColumn(),
            'new_orders' => (int)db()->query("SELECT COUNT(*) FROM orders WHERE status = 'New'")->fetchColumn(),
            'unread_chats' => (int)db()->query('SELECT COALESCE(SUM(unread_admin), 0) FROM chat_conversations')->fetchColumn(),
            'total_pageviews' => $totalPageviews,
            'unique_visitors' => $uniqueVisitors,
            'today_pageviews' => $todayPageviews,
            'last_7_days_total' => $last7DaysTotal,
        ]);
    }
    if ($method === 'GET' && $path === '/admin/categories') json_response(db()->query('SELECT * FROM categories ORDER BY display_order, name')->fetchAll());
    if ($method === 'POST' && $path === '/admin/categories') save_category(null);
    if (preg_match('#^/admin/categories/(\d+)$#', $path, $matches)) {
        if ($method === 'PUT') save_category((int)$matches[1]);
        if ($method === 'DELETE') { db()->prepare('UPDATE categories SET is_active = 0 WHERE id = ?')->execute([(int)$matches[1]]); refresh_sitemap(); json_response(['deactivated' => true]); }
    }
    if ($method === 'GET' && $path === '/admin/services') admin_services();
    if ($method === 'POST' && $path === '/admin/services') save_service(null);
    if (preg_match('#^/admin/services/(\d+)$#', $path, $matches)) {
        if ($method === 'PUT') save_service((int)$matches[1]);
        if ($method === 'DELETE') { db()->prepare('UPDATE services SET is_active = 0 WHERE id = ?')->execute([(int)$matches[1]]); refresh_sitemap(); json_response(['deactivated' => true]); }
    }
    if ($method === 'GET' && $path === '/admin/addons') admin_addons();
    if ($method === 'POST' && $path === '/admin/addons') save_addon(null);
    if (preg_match('#^/admin/addons/(\d+)$#', $path, $matches)) {
        if ($method === 'PUT') save_addon((int)$matches[1]);
        if ($method === 'DELETE') { db()->prepare('UPDATE addons SET is_active = 0 WHERE id = ?')->execute([(int)$matches[1]]); json_response(['deactivated' => true]); }
    }
    if ($method === 'GET' && $path === '/admin/orders') admin_orders();
    if ($method === 'PUT' && preg_match('#^/admin/orders/(\d+)$#', $path, $matches)) update_order_status((int)$matches[1]);
    if ($method === 'GET' && $path === '/admin/analytics') admin_analytics();
    if ($method === 'GET' && $path === '/admin/chats') admin_chats();
    if ($method === 'GET' && preg_match('#^/admin/chats/(\d+)$#', $path, $matches)) admin_chat((int)$matches[1]);
    if ($method === 'POST' && preg_match('#^/admin/chats/(\d+)/messages$#', $path, $matches)) admin_chat_message((int)$matches[1]);
    if ($method === 'PUT' && preg_match('#^/admin/chats/(\d+)/status$#', $path, $matches)) admin_chat_status((int)$matches[1]);
    if ($method === 'GET' && $path === '/admin/settings') json_response(settings_map());
    if ($method === 'PUT' && $path === '/admin/settings') save_settings();
    if ($method === 'GET' && $path === '/admin/export') json_response(['exported_at' => gmdate('c'), 'catalog' => public_catalog()]);
    if ($method === 'POST' && $path === '/admin/uploads') upload_image();
    json_error('Admin API route not found.', 404);
}

function ensure_analytics_schema(): void {
    static $ready = false;
    if ($ready) return;
    db()->exec("CREATE TABLE IF NOT EXISTS page_views (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      visitor_hash CHAR(64) NOT NULL,
      path VARCHAR(255) NOT NULL,
      title VARCHAR(255) NULL,
      referrer VARCHAR(255) NULL,
      user_agent VARCHAR(255) NULL,
      ip_hash CHAR(64) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_page_views_path (path, created_at),
      INDEX idx_page_views_visitor (visitor_hash, created_at),
      INDEX idx_page_views_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $ready = true;
}

function track_pageview(): never {
    ensure_analytics_schema();
    $body = request_body();
    $path = trim((string)($body['path'] ?? ''));
    if ($path === '' || $path[0] !== '/') json_error('Invalid analytics payload.', 422);
    $visitorId = trim((string)($body['visitor_id'] ?? ''));
    if ($visitorId === '' || mb_strlen($visitorId) > 120) json_error('Invalid analytics payload.', 422);
    $title = trim((string)($body['title'] ?? ''));
    $referrer = trim((string)($body['referrer'] ?? ''));
    $userAgent = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
    $visitorHash = hash('sha256', $visitorId);
    $ipHash = hash('sha256', client_ip());
    db()->prepare('INSERT INTO page_views (visitor_hash, path, title, referrer, user_agent, ip_hash) VALUES (?, ?, ?, ?, ?, ?)')->execute([
        $visitorHash,
        substr($path, 0, 255),
        $title !== '' ? substr($title, 0, 255) : null,
        $referrer !== '' ? substr($referrer, 0, 255) : null,
        $userAgent !== '' ? $userAgent : null,
        $ipHash,
    ]);
    json_response(['stored' => true], 201);
}

function admin_analytics(): never {
    ensure_analytics_schema();
    $pdo = db();
    $totalPageviews = (int)$pdo->query('SELECT COUNT(*) FROM page_views')->fetchColumn();
    $uniqueVisitors = (int)$pdo->query('SELECT COUNT(DISTINCT visitor_hash) FROM page_views')->fetchColumn();
    $todayPageviews = (int)$pdo->query('SELECT COUNT(*) FROM page_views WHERE DATE(created_at) = CURDATE()')->fetchColumn();
    $last7Days = $pdo->query("SELECT DATE(created_at) AS date, COUNT(*) AS pageviews, COUNT(DISTINCT visitor_hash) AS visitors FROM page_views WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(created_at) ORDER BY date ASC")->fetchAll();
    $topPages = $pdo->query("SELECT path, COUNT(*) AS pageviews, COUNT(DISTINCT visitor_hash) AS visitors FROM page_views GROUP BY path ORDER BY pageviews DESC, path ASC LIMIT 8")->fetchAll();
    $topReferrers = $pdo->query("SELECT COALESCE(NULLIF(referrer, ''), 'Direct / Unknown') AS referrer, COUNT(*) AS pageviews, COUNT(DISTINCT visitor_hash) AS visitors FROM page_views GROUP BY COALESCE(NULLIF(referrer, ''), 'Direct / Unknown') ORDER BY pageviews DESC, referrer ASC LIMIT 6")->fetchAll();
    $last7DaysTotal = array_sum(array_map(fn($row) => (int)$row['pageviews'], $last7Days));
    json_response([
        'total_pageviews' => $totalPageviews,
        'unique_visitors' => $uniqueVisitors,
        'today_pageviews' => $todayPageviews,
        'last_7_days_total' => $last7DaysTotal,
        'daily_views' => array_map(fn($row) => ['date' => $row['date'], 'pageviews' => (int)$row['pageviews'], 'visitors' => (int)$row['visitors']], $last7Days),
        'top_pages' => array_map(fn($row) => ['path' => $row['path'], 'pageviews' => (int)$row['pageviews'], 'visitors' => (int)$row['visitors']], $topPages),
        'top_referrers' => array_map(fn($row) => ['referrer' => $row['referrer'], 'pageviews' => (int)$row['pageviews'], 'visitors' => (int)$row['visitors']], $topReferrers),
    ]);
}

function ensure_chat_schema(): void {
    static $ready = false;
    if ($ready) return;
    db()->exec("CREATE TABLE IF NOT EXISTS chat_conversations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, public_id CHAR(24) NOT NULL UNIQUE,
      visitor_token_hash CHAR(64) NOT NULL UNIQUE, visitor_name VARCHAR(120) NOT NULL,
      visitor_email VARCHAR(190) NULL, visitor_ip VARCHAR(45) NULL,
      status ENUM('open','closed') NOT NULL DEFAULT 'open', unread_admin INT UNSIGNED NOT NULL DEFAULT 0,
      unread_visitor INT UNSIGNED NOT NULL DEFAULT 0, last_message_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_chat_inbox (status, last_message_at), INDEX idx_chat_ip (visitor_ip, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    db()->exec("CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, conversation_id BIGINT UNSIGNED NOT NULL,
      sender ENUM('visitor','admin','system') NOT NULL, message TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_chat_message_conversation FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
      INDEX idx_chat_messages (conversation_id, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $ready = true;
}

function clean_chat_message(mixed $value): string {
    $message = trim(preg_replace('/\s+/', ' ', strip_tags((string)$value)) ?? '');
    if ($message === '' || mb_strlen($message) > 1500) json_error('Enter a message between 1 and 1500 characters.', 422);
    return $message;
}

function chat_payload(array $conversation, bool $includeToken = false, ?string $token = null): array {
    $statement = db()->prepare('SELECT id, sender, message, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY id ASC LIMIT 300');
    $statement->execute([$conversation['id']]);
    $payload = [
        'id' => (int)$conversation['id'], 'public_id' => $conversation['public_id'],
        'visitor_name' => $conversation['visitor_name'], 'visitor_email' => $conversation['visitor_email'],
        'status' => $conversation['status'], 'unread_admin' => (int)$conversation['unread_admin'],
        'unread_visitor' => (int)$conversation['unread_visitor'], 'last_message_at' => $conversation['last_message_at'],
        'messages' => array_map(fn($row) => ['id' => (int)$row['id'], 'sender' => $row['sender'], 'message' => $row['message'], 'created_at' => $row['created_at']], $statement->fetchAll()),
    ];
    if ($includeToken) $payload['token'] = $token;
    return $payload;
}

function chat_by_token(string $token): array {
    ensure_chat_schema();
    $statement = db()->prepare('SELECT * FROM chat_conversations WHERE visitor_token_hash = ?');
    $statement->execute([hash('sha256', $token)]);
    $conversation = $statement->fetch();
    if (!$conversation) json_error('Chat session not found.', 404);
    return $conversation;
}

function start_chat(): never {
    ensure_chat_schema();
    $body = request_body();
    if (trim((string)($body['website'] ?? '')) !== '') json_error('Request rejected.', 422);
    $name = trim(strip_tags((string)($body['name'] ?? '')));
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $message = clean_chat_message($body['message'] ?? '');
    if (mb_strlen($name) < 2 || mb_strlen($name) > 120) json_error('Enter your name.', 422);
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) json_error('Enter a valid email address.', 422);
    $ip = client_ip();
    $rate = db()->prepare('SELECT COUNT(*) FROM chat_conversations WHERE visitor_ip = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)');
    $rate->execute([$ip]);
    if ((int)$rate->fetchColumn() >= 5) json_error('Too many chat sessions. Please try again later.', 429);
    $token = bin2hex(random_bytes(32));
    $publicId = strtoupper(substr(bin2hex(random_bytes(12)), 0, 12));
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $statement = $pdo->prepare('INSERT INTO chat_conversations (public_id, visitor_token_hash, visitor_name, visitor_email, visitor_ip, unread_admin) VALUES (?, ?, ?, ?, ?, 1)');
        $statement->execute([$publicId, hash('sha256', $token), $name, $email ?: null, $ip]);
        $id = (int)$pdo->lastInsertId();
        $pdo->prepare("INSERT INTO chat_messages (conversation_id, sender, message) VALUES (?, 'visitor', ?)")->execute([$id, $message]);
        $pdo->commit();
    } catch (Throwable $error) { $pdo->rollBack(); throw $error; }
    $conversation = $pdo->query('SELECT * FROM chat_conversations WHERE id = ' . $id)->fetch();
    json_response(chat_payload($conversation, true, $token), 201);
}

function visitor_chat(string $token): never {
    $conversation = chat_by_token($token);
    db()->prepare('UPDATE chat_conversations SET unread_visitor = 0 WHERE id = ?')->execute([$conversation['id']]);
    $conversation['unread_visitor'] = 0;
    json_response(chat_payload($conversation));
}

function visitor_chat_message(string $token): never {
    $conversation = chat_by_token($token);
    if ($conversation['status'] === 'closed') json_error('This conversation is closed. Start a new chat for more help.', 409);
    $message = clean_chat_message(request_body()['message'] ?? '');
    $rate = db()->prepare("SELECT COUNT(*) FROM chat_messages WHERE conversation_id = ? AND sender = 'visitor' AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)");
    $rate->execute([$conversation['id']]);
    if ((int)$rate->fetchColumn() >= 8) json_error('Please wait a moment before sending more messages.', 429);
    db()->prepare("INSERT INTO chat_messages (conversation_id, sender, message) VALUES (?, 'visitor', ?)")->execute([$conversation['id'], $message]);
    db()->prepare('UPDATE chat_conversations SET unread_admin = unread_admin + 1, last_message_at = NOW() WHERE id = ?')->execute([$conversation['id']]);
    json_response(['sent' => true], 201);
}

function admin_chats(): never {
    ensure_chat_schema();
    $rows = db()->query("SELECT c.*, (SELECT message FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message FROM chat_conversations c ORDER BY (c.status = 'open') DESC, c.last_message_at DESC LIMIT 200")->fetchAll();
    json_response(array_map(fn($row) => ['id' => (int)$row['id'], 'public_id' => $row['public_id'], 'visitor_name' => $row['visitor_name'], 'visitor_email' => $row['visitor_email'], 'status' => $row['status'], 'unread_admin' => (int)$row['unread_admin'], 'last_message' => $row['last_message'], 'last_message_at' => $row['last_message_at']], $rows));
}

function admin_chat(int $id): never {
    ensure_chat_schema();
    $statement = db()->prepare('SELECT * FROM chat_conversations WHERE id = ?');
    $statement->execute([$id]);
    $conversation = $statement->fetch();
    if (!$conversation) json_error('Conversation not found.', 404);
    db()->prepare('UPDATE chat_conversations SET unread_admin = 0 WHERE id = ?')->execute([$id]);
    $conversation['unread_admin'] = 0;
    json_response(chat_payload($conversation));
}

function admin_chat_message(int $id): never {
    ensure_chat_schema();
    $message = clean_chat_message(request_body()['message'] ?? '');
    $statement = db()->prepare('SELECT id FROM chat_conversations WHERE id = ?');
    $statement->execute([$id]);
    if (!$statement->fetch()) json_error('Conversation not found.', 404);
    db()->prepare("INSERT INTO chat_messages (conversation_id, sender, message) VALUES (?, 'admin', ?)")->execute([$id, $message]);
    db()->prepare("UPDATE chat_conversations SET status = 'open', unread_visitor = unread_visitor + 1, last_message_at = NOW() WHERE id = ?")->execute([$id]);
    json_response(['sent' => true], 201);
}

function admin_chat_status(int $id): never {
    ensure_chat_schema();
    $status = request_body()['status'] ?? '';
    if (!in_array($status, ['open', 'closed'], true)) json_error('Invalid chat status.', 422);
    db()->prepare('UPDATE chat_conversations SET status = ? WHERE id = ?')->execute([$status, $id]);
    json_response(['status' => $status]);
}

function valid_icon(string $icon): string {
    $allowed = ['app','atom','brain','briefcase','code','database','globe','megaphone','monitor','palette','search','settings','shopping-cart','smartphone','wrench'];
    return in_array($icon, $allowed, true) ? $icon : 'code';
}

function save_category(?int $id): never {
    $body = request_body();
    $name = trim((string)($body['name'] ?? ''));
    $slug = slugify((string)($body['slug'] ?? $name));
    if ($name === '' || $slug === '') json_error('Category name is required.', 422);
    $values = [$name, $slug, valid_icon((string)($body['icon'] ?? 'code')), trim((string)($body['short_description'] ?? '')), trim((string)($body['description'] ?? '')), (int)($body['display_order'] ?? 0), as_bool($body['is_featured'] ?? false), as_bool($body['is_active'] ?? true), trim((string)($body['seo_title'] ?? '')), trim((string)($body['seo_description'] ?? ''))];
    if ($id) {
        $values[] = $id;
        db()->prepare('UPDATE categories SET name=?, slug=?, icon=?, short_description=?, description=?, display_order=?, is_featured=?, is_active=?, seo_title=?, seo_description=? WHERE id=?')->execute($values);
    } else {
        db()->prepare('INSERT INTO categories (name, slug, icon, short_description, description, display_order, is_featured, is_active, seo_title, seo_description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute($values);
        $id = (int)db()->lastInsertId();
    }
    refresh_sitemap();
    json_response(['id' => $id, 'slug' => $slug]);
}

function admin_services(): never {
    $services = db()->query('SELECT s.*, c.name AS category_name FROM services s INNER JOIN categories c ON c.id = s.category_id ORDER BY c.display_order, s.display_order, s.name')->fetchAll();
    $addonIds = db()->prepare('SELECT addon_id FROM service_addons WHERE service_id = ?');
    foreach ($services as &$service) {
        $service['features'] = service_features((int)$service['id']);
        $addonIds->execute([$service['id']]);
        $service['addon_ids'] = array_map('intval', array_column($addonIds->fetchAll(), 'addon_id'));
    }
    json_response($services);
}

function save_service(?int $id): never {
    $body = request_body();
    $name = trim((string)($body['name'] ?? ''));
    $slug = slugify((string)($body['slug'] ?? $name));
    $categoryId = (int)($body['category_id'] ?? 0);
    $priceType = in_array($body['price_type'] ?? '', ['fixed','starting_from','custom_quote','addon'], true) ? $body['price_type'] : 'custom_quote';
    if ($name === '' || $slug === '' || !$categoryId) json_error('Category and service name are required.', 422);
    $serviceType = $priceType === 'fixed' ? 'fixed_package' : $priceType;
    $values = [$categoryId, $name, $slug, $serviceType, valid_icon((string)($body['icon'] ?? 'code')), trim((string)($body['short_description'] ?? '')), trim((string)($body['description'] ?? '')), $priceType, nullable_decimal($body['base_price'] ?? null), nullable_decimal($body['sale_price'] ?? null), ($body['pages_included'] ?? '') === '' ? null : (int)$body['pages_included'], trim((string)($body['delivery_time'] ?? '')), trim((string)($body['revisions'] ?? '')), trim((string)($body['image'] ?? '')), as_bool($body['is_featured'] ?? false), as_bool($body['is_active'] ?? true), (int)($body['display_order'] ?? 0), trim((string)($body['cta_text'] ?? 'View Service')), trim((string)($body['seo_title'] ?? '')), trim((string)($body['seo_description'] ?? ''))];
    $pdo = db();
    $pdo->beginTransaction();
    try {
        if ($id) {
            $values[] = $id;
            $pdo->prepare('UPDATE services SET category_id=?, name=?, slug=?, service_type=?, icon=?, short_description=?, description=?, price_type=?, base_price=?, sale_price=?, pages_included=?, delivery_time=?, revisions=?, image=?, is_featured=?, is_active=?, display_order=?, cta_text=?, seo_title=?, seo_description=? WHERE id=?')->execute($values);
        } else {
            $pdo->prepare('INSERT INTO services (category_id, name, slug, service_type, icon, short_description, description, price_type, base_price, sale_price, pages_included, delivery_time, revisions, image, is_featured, is_active, display_order, cta_text, seo_title, seo_description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute($values);
            $id = (int)$pdo->lastInsertId();
        }
        $pdo->prepare('DELETE FROM service_features WHERE service_id = ?')->execute([$id]);
        $featureStatement = $pdo->prepare('INSERT INTO service_features (service_id, name, display_order) VALUES (?, ?, ?)');
        foreach (array_values(array_filter($body['features'] ?? [], fn($feature) => trim((string)$feature) !== '')) as $index => $feature) $featureStatement->execute([$id, trim((string)$feature), $index + 1]);
        $pdo->prepare('DELETE FROM service_addons WHERE service_id = ?')->execute([$id]);
        $addonStatement = $pdo->prepare('INSERT INTO service_addons (service_id, addon_id) VALUES (?, ?)');
        foreach (array_unique(array_map('intval', $body['addon_ids'] ?? [])) as $addonId) if ($addonId > 0) $addonStatement->execute([$id, $addonId]);
        $pdo->commit();
    } catch (Throwable $error) { $pdo->rollBack(); throw $error; }
    refresh_sitemap();
    json_response(['id' => $id, 'slug' => $slug]);
}

function admin_addons(): never {
    $addons = db()->query('SELECT * FROM addons ORDER BY name')->fetchAll();
    $categories = db()->prepare('SELECT category_id FROM addon_categories WHERE addon_id = ?');
    foreach ($addons as &$addon) { $categories->execute([$addon['id']]); $addon['category_ids'] = array_map('intval', array_column($categories->fetchAll(), 'category_id')); }
    json_response($addons);
}

function save_addon(?int $id): never {
    $body = request_body();
    $name = trim((string)($body['name'] ?? ''));
    if ($name === '') json_error('Add-on name is required.', 422);
    $pricingType = in_array($body['pricing_type'] ?? '', ['fixed','per_page','per_item','per_month','custom_quote'], true) ? $body['pricing_type'] : 'fixed';
    $values = [$name, trim((string)($body['description'] ?? '')), nullable_decimal($body['price'] ?? null), $pricingType, trim((string)($body['pricing_unit'] ?? '')), as_bool($body['is_active'] ?? true)];
    $pdo = db(); $pdo->beginTransaction();
    try {
        if ($id) { $values[] = $id; $pdo->prepare('UPDATE addons SET name=?, description=?, price=?, pricing_type=?, pricing_unit=?, is_active=? WHERE id=?')->execute($values); }
        else { $pdo->prepare('INSERT INTO addons (name, description, price, pricing_type, pricing_unit, is_active) VALUES (?, ?, ?, ?, ?, ?)')->execute($values); $id = (int)$pdo->lastInsertId(); }
        $pdo->prepare('DELETE FROM addon_categories WHERE addon_id = ?')->execute([$id]);
        $statement = $pdo->prepare('INSERT INTO addon_categories (addon_id, category_id) VALUES (?, ?)');
        foreach (array_unique(array_map('intval', $body['category_ids'] ?? [])) as $categoryId) if ($categoryId > 0) $statement->execute([$id, $categoryId]);
        $pdo->commit();
    } catch (Throwable $error) { $pdo->rollBack(); throw $error; }
    json_response(['id' => $id]);
}

function admin_orders(): never {
    $orders = db()->query('SELECT o.*, oi.service_name FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id ORDER BY o.created_at DESC')->fetchAll();
    json_response($orders);
}

function update_order_status(int $id): never {
    $body = request_body();
    $allowed = ['New','Contacted','In Discussion','Confirmed','In Progress','Completed','Cancelled'];
    if (!in_array($body['status'] ?? '', $allowed, true)) json_error('Invalid order status.', 422);
    db()->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$body['status'], $id]);
    json_response(['updated' => true]);
}

function save_settings(): never {
    $body = request_body();
    $allowed = ['page_explanation', 'currency', 'orders_enabled'];
    $statement = db()->prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)');
    foreach ($allowed as $key) if (array_key_exists($key, $body)) $statement->execute([$key, is_bool($body[$key]) ? ($body[$key] ? '1' : '0') : trim((string)$body[$key])]);
    json_response(settings_map());
}

function upload_image(): never {
    if (empty($_FILES['image']) || !is_uploaded_file($_FILES['image']['tmp_name'])) json_error('Choose an image to upload.', 422);
    $file = $_FILES['image'];
    if ($file['size'] > (int)config('app', 'max_upload_bytes', 2097152)) json_error('Image must be 2 MB or smaller.', 422);
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if (!isset($allowed[$mime])) json_error('Only JPG, PNG and WebP images are allowed.', 422);
    $directory = (string)config('app', 'upload_dir');
    if (!is_dir($directory) && !mkdir($directory, 0755, true)) json_error('Upload directory is unavailable.', 500);
    $filename = bin2hex(random_bytes(16)) . '.' . $allowed[$mime];
    if (!move_uploaded_file($file['tmp_name'], $directory . '/' . $filename)) json_error('Image upload failed.', 500);
    json_response(['url' => '/uploads/services/' . $filename], 201);
}
