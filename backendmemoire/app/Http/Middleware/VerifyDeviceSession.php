<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use App\Models\User;
use App\Services\DeviceSessionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyDeviceSession
{
    public function __construct(private DeviceSessionService $deviceSession) {}

    public function handle(Request $request, Closure $next): Response
    {
        // Ne pas déclencher JWT sur les routes publiques (login, 2fa/verify)
        try {
            $user = auth('api')->check() ? auth('api')->user() : null;
        } catch (\Throwable) {
            return $next($request);
        }

        if (!$user) {
            return $next($request);
        }

        // Lire le device_id depuis le header ou le cookie
        $deviceId = $request->header('X-Device-Id')
            ?? $request->cookie('device_id');

        if (!$deviceId) {
            return response()->json([
                'success' => false,
                'message' => 'Identifiant d\'appareil manquant.',
                'code'    => 'MISSING_DEVICE_ID',
            ], 401);
        }

        $info = $this->deviceSession->verify($user, $request, $deviceId);

        // Appareil inconnu : forcer re-authentification
        if (!$info['known_device']) {
            AuditLog::create([
                'user_id'    => $user->id,
                'action'     => 'unknown_device_detected',
                'model_type' => User::class,
                'model_id'   => $user->id,
                'new_values' => [
                    'device_id'  => $deviceId,
                    'ip_address' => $request->ip(),
                ],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Appareil non reconnu. Veuillez vous reconnecter.',
                'code'    => 'UNKNOWN_DEVICE',
            ], 401);
        }

        // IP suspecte : avertir sans bloquer (peut être un mobile changeant de réseau)
        if (!$info['trusted']) {
            AuditLog::create([
                'user_id'    => $user->id,
                'action'     => 'suspicious_ip_change',
                'model_type' => User::class,
                'model_id'   => $user->id,
                'new_values' => [
                    'device_id'  => $deviceId,
                    'ip_address' => $request->ip(),
                ],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
            // Ne pas bloquer — juste logger
        }

        return $next($request);
    }
}
