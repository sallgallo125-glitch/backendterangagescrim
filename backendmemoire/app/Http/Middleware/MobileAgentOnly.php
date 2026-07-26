<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MobileAgentOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->header('X-Mobile-Client') !== 'flutter') {
            return $next($request);
        }

        try {
            $user = auth('api')->check() ? auth('api')->user() : null;
        } catch (\Throwable) {
            return $next($request);
        }

        if ($user && !$user->hasRole(['agent', 'gestionnaire', 'administrateur'])) {
            AuditLog::create([
                'user_id'    => $user->id,
                'action'     => 'mobile_access_denied',
                'model_type' => User::class,
                'model_id'   => $user->id,
                'new_values' => ['role' => $user->getRoleNames()->first(), 'reason' => 'mobile_agent_only'],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Accès mobile réservé aux agents terrain.',
                'code'    => 'MOBILE_AGENT_ONLY',
            ], 403);
        }

        return $next($request);
    }
}
