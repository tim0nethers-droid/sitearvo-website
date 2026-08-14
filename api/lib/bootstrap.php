<?php
declare(strict_types=1);

$localConfig = __DIR__ . '/../config.local.php';
$exampleConfig = __DIR__ . '/../config.example.php';
$config = file_exists($localConfig) ? require $localConfig : require $exampleConfig;

function config(string $section, ?string $key = null, mixed $default = null): mixed {
    global $config;
    $value = $config[$section] ?? $default;
    return $key === null ? $value : ($value[$key] ?? $default);
}

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $database = config('database');
    if (str_contains((string)$database['dsn'], 'YOUR_DATABASE')) {
        throw new RuntimeException('The SiteArvo database is not configured.');
    }
    $pdo = new PDO($database['dsn'], $database['username'], $database['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function json_response(mixed $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['data' => $data], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $status = 400, ?array $errors = null): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['message' => $message, 'errors' => $errors], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function request_body(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) json_error('Invalid JSON request.', 400);
    return $data;
}

function slugify(string $value): string {
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    return trim($value, '-');
}

function as_bool(mixed $value): int { return filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 1 : 0; }
function nullable_decimal(mixed $value): ?float { return $value === '' || $value === null ? null : round((float)$value, 2); }
function client_ip(): string { return substr($_SERVER['REMOTE_ADDR'] ?? 'unknown', 0, 45); }

$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_name((string)config('app', 'session_name', 'sitearvo_admin'));
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict']);
if (session_status() !== PHP_SESSION_ACTIVE) session_start();

function admin_payload(array $admin): array {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(24));
    return ['id' => (int)$admin['id'], 'name' => $admin['name'], 'email' => $admin['email'], 'csrf' => $_SESSION['csrf']];
}

function require_admin(bool $mutation = false): array {
    if (empty($_SESSION['admin_id'])) json_error('Authentication required.', 401);
    if ($mutation) {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!$token || !hash_equals($_SESSION['csrf'] ?? '', $token)) json_error('Security token expired. Sign in again.', 419);
    }
    $statement = db()->prepare('SELECT id, name, email FROM admins WHERE id = ? AND is_active = 1');
    $statement->execute([$_SESSION['admin_id']]);
    $admin = $statement->fetch();
    if (!$admin) { session_destroy(); json_error('Authentication required.', 401); }
    return $admin;
}

function settings_map(): array {
    $rows = db()->query('SELECT setting_key, setting_value FROM settings')->fetchAll();
    $settings = [];
    foreach ($rows as $row) $settings[$row['setting_key']] = $row['setting_value'];
    return $settings;
}

