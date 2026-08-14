<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/lib/bootstrap.php';

$options = getopt('', ['email:', 'password:', 'name::']);
$email = strtolower(trim((string)($options['email'] ?? getenv('SITEARVO_ADMIN_EMAIL') ?: 'info@sitearvo.site')));
$password = (string)($options['password'] ?? getenv('SITEARVO_ADMIN_PASSWORD') ?: 'Sunil@#199000');
$name = trim((string)($options['name'] ?? getenv('SITEARVO_ADMIN_NAME') ?: 'SiteArvo Admin'));

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    fwrite(STDERR, "Usage: php api/bin/install.php --email=you@example.com --password='your-password' [--name='Admin']\n");
    exit(1);
}

$pdo = db();
$statement = $pdo->prepare('INSERT INTO admins (name, email, password_hash, is_active) VALUES (?, ?, ?, 1) ON CONFLICT(email) DO UPDATE SET name = excluded.name, password_hash = excluded.password_hash, is_active = 1, updated_at = CURRENT_TIMESTAMP');
$statement->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);

fwrite(STDOUT, "SiteArvo SQLite database is ready.\nAdmin: {$email}\n");
