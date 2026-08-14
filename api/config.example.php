<?php
return [
    'database' => [
        'dsn' => 'mysql:host=localhost;dbname=YOUR_DATABASE;charset=utf8mb4',
        'username' => 'YOUR_DATABASE_USER',
        'password' => 'YOUR_DATABASE_PASSWORD',
    ],
    'app' => [
        'base_url' => 'https://sitearvo.site',
        'session_name' => 'sitearvo_admin',
        'upload_dir' => __DIR__ . '/../uploads/services',
        'max_upload_bytes' => 2097152,
    ],
];

