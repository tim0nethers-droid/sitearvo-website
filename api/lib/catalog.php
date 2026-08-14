<?php
declare(strict_types=1);

function service_features(int $serviceId): array {
    $statement = db()->prepare('SELECT id, name, display_order FROM service_features WHERE service_id = ? ORDER BY display_order, id');
    $statement->execute([$serviceId]);
    return $statement->fetchAll();
}

function service_addons(int $serviceId): array {
    $statement = db()->prepare('SELECT a.* FROM addons a INNER JOIN service_addons sa ON sa.addon_id = a.id WHERE sa.service_id = ? AND a.is_active = 1 ORDER BY a.name');
    $statement->execute([$serviceId]);
    return $statement->fetchAll();
}

function public_catalog(): array {
    $categories = db()->query('SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order, name')->fetchAll();
    $serviceStatement = db()->prepare('SELECT s.* FROM services s WHERE s.category_id = ? AND s.is_active = 1 ORDER BY s.display_order, s.name');
    foreach ($categories as &$category) {
        $serviceStatement->execute([$category['id']]);
        $services = $serviceStatement->fetchAll();
        foreach ($services as &$service) {
            $service['features'] = service_features((int)$service['id']);
            $service['addons'] = service_addons((int)$service['id']);
        }
        $category['services'] = $services;
    }
    return ['categories' => $categories, 'settings' => settings_map()];
}

function public_service(string $slug): ?array {
    $statement = db()->prepare('SELECT s.*, c.name AS category_name, c.slug AS category_slug FROM services s INNER JOIN categories c ON c.id = s.category_id WHERE s.slug = ? AND s.is_active = 1 AND c.is_active = 1');
    $statement->execute([$slug]);
    $service = $statement->fetch();
    if (!$service) return null;
    $service['features'] = service_features((int)$service['id']);
    $service['addons'] = service_addons((int)$service['id']);
    return $service;
}

function refresh_sitemap(): void {
    $base = rtrim((string)config('app', 'base_url', 'https://sitearvo.site'), '/');
    $urls = ['/', '/about', '/services', '/industries', '/portfolio', '/pricing', '/contact', '/privacy-policy', '/terms-and-conditions', '/website-development-company-india', '/small-business-website-design-india', '/react-development-company-india', '/guides/website-development-cost-india'];
    $portfolioSlugs = ['business-admin-dashboard', 'clinic-healthcare-website', 'corporate-business-website', 'creative-portfolio-website', 'digital-marketing-agency-website', 'ecommerce-store-concept', 'education-coaching-website', 'fintech-analytics-dashboard', 'food-delivery-platform', 'online-grocery-store', 'online-pharmacy-store', 'real-estate-property-platform', 'restaurant-food-website', 'saas-product-landing-page', 'taxi-booking-platform', 'travel-tour-website'];
    foreach ($portfolioSlugs as $slug) $urls[] = '/portfolio/' . $slug;
    foreach (db()->query('SELECT slug FROM categories WHERE is_active = 1 ORDER BY display_order')->fetchAll() as $row) $urls[] = '/services/category/' . $row['slug'];
    foreach (db()->query('SELECT slug FROM services WHERE is_active = 1 ORDER BY display_order')->fetchAll() as $row) $urls[] = '/services/' . $row['slug'];
    $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
    foreach (array_unique($urls) as $url) $xml .= '  <url><loc>' . htmlspecialchars($base . $url, ENT_XML1) . "</loc></url>\n";
    $xml .= "</urlset>\n";
    $target = dirname(__DIR__, 2) . '/sitemap.xml';
    if (is_writable(dirname($target))) @file_put_contents($target, $xml, LOCK_EX);
}
