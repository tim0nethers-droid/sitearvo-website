<?php
return [
    'database' => [
        'dsn' => 'sqlite:' . __DIR__ . '/data/sitearvo.sqlite',
        'username' => null,
        'password' => null,
    ],
    'app' => [
        'base_url' => 'https://sitearvo.site',
        'session_name' => 'sitearvo_admin',
        'upload_dir' => __DIR__ . '/../uploads/services',
        'max_upload_bytes' => 2097152,
    ],
];
