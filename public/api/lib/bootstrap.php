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

function sqlite_database_path(): string {
    return __DIR__ . '/../data/sitearvo.sqlite';
}

function default_admin_credentials(): array {
    return [
        'email' => strtolower(trim((string)(getenv('SITEARVO_ADMIN_EMAIL') ?: 'info@sitearvo.site'))),
        'password' => (string)(getenv('SITEARVO_ADMIN_PASSWORD') ?: 'SiteArvo@2026!'),
        'name' => trim((string)(getenv('SITEARVO_ADMIN_NAME') ?: 'SiteArvo Admin')),
    ];
}

function is_sqlite_dsn(string $dsn): bool {
    return str_starts_with($dsn, 'sqlite:');
}

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $database = config('database');
    $dsn = (string)($database['dsn'] ?? '');
    if ($dsn === '' || str_contains($dsn, 'YOUR_DATABASE')) {
        $dsn = 'sqlite:' . sqlite_database_path();
    }
    $pdo = new PDO($dsn, is_sqlite_dsn($dsn) ? null : ($database['username'] ?? null), is_sqlite_dsn($dsn) ? null : ($database['password'] ?? null), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    if (is_sqlite_dsn($dsn)) {
        $pdo->exec('PRAGMA foreign_keys = ON');
        initialize_sqlite_database($pdo);
        ensure_default_admin_account($pdo);
    }
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

function initialize_sqlite_database(PDO $pdo): void {
    static $initialized = false;
    if ($initialized) return;
    $schemaPath = __DIR__ . '/../schema.sqlite.sql';
    if (file_exists($schemaPath)) {
        $pdo->exec(file_get_contents($schemaPath));
    }
    try {
        $count = (int)$pdo->query('SELECT COUNT(*) FROM categories')->fetchColumn();
    } catch (Throwable) {
        $count = 0;
    }
    if ($count === 0) seed_sqlite_database($pdo);
    $initialized = true;
}

function ensure_default_admin_account(PDO $pdo): void {
    $credentials = default_admin_credentials();
    $adminHash = password_hash($credentials['password'], PASSWORD_DEFAULT);
    $statement = $pdo->prepare('INSERT INTO admins (name, email, password_hash, is_active) VALUES (?, ?, ?, 1) ON CONFLICT(email) DO UPDATE SET name = excluded.name, password_hash = excluded.password_hash, is_active = 1, updated_at = CURRENT_TIMESTAMP');
    $statement->execute([$credentials['name'], $credentials['email'], $adminHash]);
}

function seed_sqlite_database(PDO $pdo): void {
    $seedPath = __DIR__ . '/../data/seed.json';
    $seed = json_decode((string)file_get_contents($seedPath), true, flags: JSON_THROW_ON_ERROR);
    $credentials = default_admin_credentials();

    $setting = $pdo->prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP');
    foreach (($seed['settings'] ?? []) as $key => $value) {
        $setting->execute([(string)$key, is_bool($value) ? ($value ? '1' : '0') : (string)$value]);
    }

    $categories = [];
    $categoryLookup = $pdo->prepare('SELECT id FROM categories WHERE slug = ?');
    $categoryUpsert = $pdo->prepare('INSERT INTO categories (name, slug, icon, short_description, description, display_order, is_featured, is_active, seo_title, seo_description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, icon = excluded.icon, short_description = excluded.short_description, description = excluded.description, display_order = excluded.display_order, is_featured = excluded.is_featured, is_active = excluded.is_active, seo_title = excluded.seo_title, seo_description = excluded.seo_description, updated_at = CURRENT_TIMESTAMP');
    foreach (($seed['categories'] ?? []) as $category) {
        $categoryUpsert->execute([
            $category['name'] ?? '',
            $category['slug'] ?? '',
            $category['icon'] ?? 'code',
            $category['short_description'] ?? null,
            $category['description'] ?? null,
            (int)($category['display_order'] ?? 0),
            (int)($category['is_featured'] ?? 0),
            (int)($category['is_active'] ?? 1),
            $category['seo_title'] ?? null,
            $category['seo_description'] ?? null,
        ]);
        $categoryLookup->execute([(string)($category['slug'] ?? '')]);
        $categories[(string)($category['slug'] ?? '')] = (int)$categoryLookup->fetchColumn();
    }

    $serviceLookup = $pdo->prepare('SELECT id FROM services WHERE slug = ?');
    $serviceUpsert = $pdo->prepare('INSERT INTO services (category_id, name, slug, service_type, icon, short_description, description, price_type, base_price, sale_price, pages_included, delivery_time, revisions, image, is_featured, is_active, display_order, cta_text, seo_title, seo_description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO UPDATE SET category_id = excluded.category_id, name = excluded.name, service_type = excluded.service_type, icon = excluded.icon, short_description = excluded.short_description, description = excluded.description, price_type = excluded.price_type, base_price = excluded.base_price, sale_price = excluded.sale_price, pages_included = excluded.pages_included, delivery_time = excluded.delivery_time, revisions = excluded.revisions, image = excluded.image, is_featured = excluded.is_featured, is_active = excluded.is_active, display_order = excluded.display_order, cta_text = excluded.cta_text, seo_title = excluded.seo_title, seo_description = excluded.seo_description, updated_at = CURRENT_TIMESTAMP');
    $featureDelete = $pdo->prepare('DELETE FROM service_features WHERE service_id = ?');
    $featureInsert = $pdo->prepare('INSERT INTO service_features (service_id, name, display_order) VALUES (?, ?, ?)');
    $serviceAddonDelete = $pdo->prepare('DELETE FROM service_addons WHERE service_id = ?');
    $serviceAddonInsert = $pdo->prepare('INSERT OR IGNORE INTO service_addons (service_id, addon_id) VALUES (?, ?)');
    foreach (($seed['categories'] ?? []) as $category) {
        $categoryId = $categories[(string)($category['slug'] ?? '')] ?? null;
        if (!$categoryId) continue;
        foreach (($category['services'] ?? []) as $service) {
            $serviceType = ($service['price_type'] ?? 'custom_quote') === 'fixed' ? 'fixed_package' : ($service['price_type'] ?? 'custom_quote');
            $serviceUpsert->execute([
                $categoryId,
                $service['name'] ?? '',
                $service['slug'] ?? '',
                $serviceType,
                $service['icon'] ?? 'code',
                $service['short_description'] ?? null,
                $service['description'] ?? null,
                $service['price_type'] ?? 'custom_quote',
                $service['base_price'] ?? null,
                $service['sale_price'] ?? null,
                $service['pages_included'] ?? null,
                $service['delivery_time'] ?? null,
                $service['revisions'] ?? null,
                $service['image'] ?? null,
                (int)($service['is_featured'] ?? 0),
                (int)($service['is_active'] ?? 1),
                (int)($service['display_order'] ?? 0),
                $service['cta_text'] ?? 'View Service',
                $service['seo_title'] ?? null,
                $service['seo_description'] ?? null,
            ]);
            $serviceLookup->execute([(string)($service['slug'] ?? '')]);
            $serviceId = (int)$serviceLookup->fetchColumn();
            if (!$serviceId) continue;
            $featureDelete->execute([$serviceId]);
            $serviceAddonDelete->execute([$serviceId]);
            foreach (array_values(array_filter($service['features'] ?? [], fn($feature) => trim((string)$feature) !== '')) as $index => $feature) {
                $featureInsert->execute([$serviceId, trim((string)$feature), $index + 1]);
            }
            foreach (array_unique(array_map('intval', $service['addon_ids'] ?? [])) as $addonId) {
                if ($addonId > 0) $serviceAddonInsert->execute([$serviceId, $addonId]);
            }
        }
    }

    foreach (($seed['packages'] ?? []) as $package) {
        $categorySlug = (string)($package['category_slug'] ?? '');
        $categoryId = $categories[$categorySlug] ?? null;
        if (!$categoryId) continue;
        $serviceType = ($package['price_type'] ?? 'fixed') === 'fixed' ? 'fixed_package' : ($package['price_type'] ?? 'fixed');
        $serviceUpsert->execute([
            $categoryId,
            $package['name'] ?? '',
            $package['slug'] ?? '',
            $serviceType,
            $package['icon'] ?? 'code',
            $package['short_description'] ?? null,
            $package['description'] ?? null,
            $package['price_type'] ?? 'fixed',
            $package['base_price'] ?? null,
            $package['sale_price'] ?? null,
            $package['pages_included'] ?? null,
            $package['delivery_time'] ?? null,
            $package['revisions'] ?? null,
            $package['image'] ?? null,
            (int)($package['is_featured'] ?? 0),
            (int)($package['is_active'] ?? 1),
            (int)($package['display_order'] ?? 0),
            $package['cta_text'] ?? 'View Package',
            $package['seo_title'] ?? null,
            $package['seo_description'] ?? null,
        ]);
        $serviceLookup->execute([(string)($package['slug'] ?? '')]);
        $serviceId = (int)$serviceLookup->fetchColumn();
        if (!$serviceId) continue;
        $featureDelete->execute([$serviceId]);
        $serviceAddonDelete->execute([$serviceId]);
        foreach (array_values(array_filter($package['features'] ?? [], fn($feature) => trim((string)$feature) !== '')) as $index => $feature) {
            $featureInsert->execute([$serviceId, trim((string)$feature), $index + 1]);
        }
        foreach (array_unique(array_map('intval', $package['addon_ids'] ?? [])) as $addonId) {
            if ($addonId > 0) $serviceAddonInsert->execute([$serviceId, $addonId]);
        }
    }

    $addonLookup = $pdo->prepare('SELECT id FROM addons WHERE name = ?');
    $addonUpsert = $pdo->prepare('INSERT INTO addons (name, description, price, pricing_type, pricing_unit, is_active) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(name) DO UPDATE SET description = excluded.description, price = excluded.price, pricing_type = excluded.pricing_type, pricing_unit = excluded.pricing_unit, is_active = excluded.is_active, updated_at = CURRENT_TIMESTAMP');
    $addonCategoryInsert = $pdo->prepare('INSERT OR IGNORE INTO addon_categories (addon_id, category_id) VALUES (?, ?)');
    foreach (($seed['addons'] ?? []) as $addon) {
        $addonUpsert->execute([
            $addon['name'] ?? '',
            $addon['description'] ?? null,
            $addon['price'] ?? null,
            $addon['pricing_type'] ?? 'fixed',
            $addon['pricing_unit'] ?? null,
            (int)($addon['is_active'] ?? 1),
        ]);
        $addonLookup->execute([(string)($addon['name'] ?? '')]);
        $addonId = (int)$addonLookup->fetchColumn();
        if (!$addonId) continue;
        foreach (($addon['category_slugs'] ?? []) as $slug) {
            $categoryId = $categories[(string)$slug] ?? null;
            if (!$categoryId) continue;
            $addonCategoryInsert->execute([$addonId, $categoryId]);
            foreach ($seed['categories'] ?? [] as $category) {
                if (($category['slug'] ?? '') !== $slug) continue;
                foreach (($category['services'] ?? []) as $service) {
                    $serviceLookup->execute([(string)($service['slug'] ?? '')]);
                    $serviceId = (int)$serviceLookup->fetchColumn();
                    if ($serviceId) $serviceAddonInsert->execute([$serviceId, $addonId]);
                }
            }
        }
    }

    ensure_default_admin_account($pdo);
}
