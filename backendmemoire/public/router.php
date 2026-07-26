<?php

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Serve existing static files directly
if ($uri !== '/' && file_exists(__DIR__ . $uri)) {
    return false;
}

// Everything else goes through Laravel
require __DIR__ . '/index.php';
