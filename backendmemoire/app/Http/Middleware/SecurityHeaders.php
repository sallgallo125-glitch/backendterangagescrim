<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $isProduction = app()->environment('production');

        // Empêche le navigateur de deviner le type MIME (sniffing)
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // Bloque le chargement dans des iframes (clickjacking)
        $response->headers->set('X-Frame-Options', 'DENY');

        // Active les protections XSS du navigateur (legacy, couvert par CSP mais utile pour IE/Edge anciens)
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        // Contrôle les informations envoyées dans le header Referer
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Force HTTPS pendant 1 an (uniquement en production — sinon bloque le dev local en HTTP)
        if ($isProduction) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        // CSP : l'API REST ne sert que du JSON — aucune ressource HTML/JS/CSS légitime.
        // Cette politique très restrictive protège contre toute injection dans les réponses API.
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'none'; frame-ancestors 'none'"
        );

        // Désactive les feature APIs non nécessaires pour une API REST
        $response->headers->set(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), payment=()'
        );

        return $response;
    }
}
