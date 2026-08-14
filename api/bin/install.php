<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/lib/bootstrap.php';

$options = getopt('', ['email:', 'password:', 'name::']);
$email = strtolower(trim((string)($options['email'] ?? '')));
$password = (string)($options['password'] ?? '');
$name = trim((string)($options['name'] ?? 'SiteArvo Admin'));
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 12) {
    fwrite(STDERR, "Usage: php api/bin/install.php --email=you@example.com --password='at-least-12-characters' [--name='Admin']\n");
    exit(1);
}

$pdo = db();
$schema = file_get_contents(dirname(__DIR__) . '/schema.sql');
$pdo->exec($schema);
$seed = json_decode(file_get_contents(dirname(__DIR__) . '/data/seed.json'), true, flags: JSON_THROW_ON_ERROR);

$setting = $pdo->prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)');
foreach ($seed['settings'] as $key => $value) $setting->execute([$key, $value]);

$categoryStatement = $pdo->prepare('INSERT INTO categories (name, slug, icon, short_description, description, display_order, is_featured, is_active, seo_title, seo_description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), short_description=VALUES(short_description), description=VALUES(description), seo_title=VALUES(seo_title), seo_description=VALUES(seo_description)');
$serviceStatement = $pdo->prepare('INSERT INTO services (category_id, name, slug, service_type, icon, short_description, description, price_type, base_price, sale_price, pages_included, delivery_time, revisions, is_featured, is_active, display_order, cta_text, seo_title, seo_description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE category_id=VALUES(category_id), name=VALUES(name), icon=VALUES(icon), short_description=VALUES(short_description), description=VALUES(description), seo_title=VALUES(seo_title), seo_description=VALUES(seo_description)');
$featureStatement = $pdo->prepare('INSERT INTO service_features (service_id, name, display_order) VALUES (?, ?, ?)');
$categoryIds = [];
$serviceIds = [];

foreach ($seed['categories'] as $category) {
    $categoryStatement->execute([$category['name'], $category['slug'], $category['icon'], $category['short_description'], $category['description'], $category['display_order'], (int)$category['is_featured'], (int)$category['is_active'], $category['seo_title'], $category['seo_description']]);
    $lookup = $pdo->prepare('SELECT id FROM categories WHERE slug = ?'); $lookup->execute([$category['slug']]); $categoryId = (int)$lookup->fetchColumn(); $categoryIds[$category['slug']] = $categoryId;
    foreach ($category['services'] as $service) seed_service($pdo, $serviceStatement, $featureStatement, $service, $categoryId, $serviceIds);
}
foreach ($seed['packages'] as $package) seed_service($pdo, $serviceStatement, $featureStatement, $package, $categoryIds[$package['category_slug']], $serviceIds);

$addonStatement = $pdo->prepare('INSERT INTO addons (name, description, price, pricing_type, pricing_unit, is_active) VALUES (?, ?, ?, ?, ?, ?)');
$addonCategory = $pdo->prepare('INSERT IGNORE INTO addon_categories (addon_id, category_id) VALUES (?, ?)');
$serviceAddon = $pdo->prepare('INSERT IGNORE INTO service_addons (service_id, addon_id) VALUES (?, ?)');
foreach ($seed['addons'] as $addon) {
    $lookup = $pdo->prepare('SELECT id FROM addons WHERE name = ?'); $lookup->execute([$addon['name']]); $addonId = (int)$lookup->fetchColumn();
    if (!$addonId) { $addonStatement->execute([$addon['name'], $addon['description'], $addon['price'], $addon['pricing_type'], $addon['pricing_unit'], (int)$addon['is_active']]); $addonId = (int)$pdo->lastInsertId(); }
    foreach ($addon['category_slugs'] as $slug) if (isset($categoryIds[$slug])) {
        $addonCategory->execute([$addonId, $categoryIds[$slug]]);
        $servicesForCategory = $pdo->prepare('SELECT id FROM services WHERE category_id = ?');
        $servicesForCategory->execute([$categoryIds[$slug]]);
        foreach ($servicesForCategory->fetchAll() as $serviceRow) $serviceAddon->execute([(int)$serviceRow['id'], $addonId]);
    }
}

$admin = $pdo->prepare('INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash), is_active=1');
$admin->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
fwrite(STDOUT, "SiteArvo database installed and seeded successfully.\nAdmin: {$email}\n");

function seed_service(PDO $pdo, PDOStatement $serviceStatement, PDOStatement $featureStatement, array $service, int $categoryId, array &$serviceIds): void {
    $type = $service['price_type'] === 'fixed' ? 'fixed_package' : $service['price_type'];
    $serviceStatement->execute([$categoryId, $service['name'], $service['slug'], $type, $service['icon'], $service['short_description'], $service['description'], $service['price_type'], $service['base_price'], $service['sale_price'], $service['pages_included'], $service['delivery_time'], $service['revisions'], (int)$service['is_featured'], (int)$service['is_active'], $service['display_order'], $service['cta_text'], $service['seo_title'], $service['seo_description']]);
    $lookup = $pdo->prepare('SELECT id FROM services WHERE slug = ?'); $lookup->execute([$service['slug']]); $serviceId = (int)$lookup->fetchColumn(); $serviceIds[$service['slug']] = $serviceId;
    $count = $pdo->prepare('SELECT COUNT(*) FROM service_features WHERE service_id = ?'); $count->execute([$serviceId]);
    if ((int)$count->fetchColumn() === 0) foreach ($service['features'] as $index => $feature) $featureStatement->execute([$serviceId, $feature, $index + 1]);
}
