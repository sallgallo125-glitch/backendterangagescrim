<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(array_merge(
        [
            'http://localhost:5173', 'http://127.0.0.1:5173',
            'http://localhost:4040', 'http://127.0.0.1:4040',
            'http://localhost:3333', 'http://127.0.0.1:3333',
            'http://localhost:3000', 'http://127.0.0.1:3000',
        ],
        env('FRONTEND_URL') ? [env('FRONTEND_URL')] : []
    )),

    'allowed_origins_patterns' => [
        '#^https://.*\.railway\.app$#',
        '#^https://.*\.up\.railway\.app$#',
        '#^https://.*\.vercel\.app$#',
        // Flutter web dev (port dynamique assigné par flutter run -d chrome)
        '#^http://localhost(:[0-9]+)?$#',
        '#^http://127\.0\.0\.1(:[0-9]+)?$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['Content-Disposition', 'Content-Type', 'Content-Length'],

    'max_age' => 0,

    'supports_credentials' => true,

];
