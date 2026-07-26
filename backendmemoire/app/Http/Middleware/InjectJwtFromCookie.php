<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class InjectJwtFromCookie
{
    public function handle(Request $request, Closure $next)
    {
        // Déjà un Bearer token dans le header — rien à faire
        if ($request->bearerToken()) {
            return $next($request);
        }

        $cookieToken = $request->cookie('jwt_token');

        if (!$cookieToken) {
            return $next($request);
        }

        // Vérifier silencieusement que le token est valide avant de l'injecter
        // Un cookie expiré ou invalide ne doit pas bloquer le login
        try {
            JWTAuth::setToken($cookieToken)->checkOrFail();
            $request->headers->set('Authorization', 'Bearer ' . $cookieToken);
        } catch (\Throwable) {
            // Token expiré ou invalide — on l'ignore simplement
        }

        return $next($request);
    }
}
