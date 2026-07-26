<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DeviceSessionService
{
    /**
     * Register or update a device session for a user.
     * Returns the device_id used.
     */
    public function register(User $user, Request $request, ?string $deviceId = null): string
    {
        $deviceId  = $deviceId ?: $this->generateDeviceId($request);
        $ip        = $request->ip() ?? '0.0.0.0';
        $userAgent = $request->userAgent() ?? '';

        // upsert is atomic in PostgreSQL (INSERT ... ON CONFLICT DO UPDATE)
        DB::table('device_sessions')->upsert(
            [
                'user_id'      => $user->id,
                'device_id'    => $deviceId,
                'user_agent'   => $userAgent,
                'ip_address'   => $ip,
                'last_seen_at' => now(),
                'is_active'    => true,
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
            ['user_id', 'device_id'],
            ['user_agent', 'ip_address', 'last_seen_at', 'is_active', 'updated_at']
        );

        return $deviceId;
    }

    /**
     * Verify that the device + IP combination is not suspicious.
     *
     * Returns:
     *   trusted       => bool — device is known and IP matches last known IP
     *   known_device  => bool — device was seen before (but maybe different IP)
     *   device_id     => string
     */
    public function verify(User $user, Request $request, ?string $deviceId): array
    {
        $ip = $request->ip() ?? '0.0.0.0';

        if (!$deviceId) {
            return ['trusted' => false, 'known_device' => false, 'device_id' => ''];
        }

        $session = DB::table('device_sessions')
            ->where('user_id', $user->id)
            ->where('device_id', $deviceId)
            ->where('is_active', true)
            ->first();

        if (!$session) {
            return ['trusted' => false, 'known_device' => false, 'device_id' => $deviceId];
        }

        $sameIp = $session->ip_address === $ip;

        // Update last-seen and IP regardless
        DB::table('device_sessions')
            ->where('id', $session->id)
            ->update(['last_seen_at' => now(), 'ip_address' => $ip, 'updated_at' => now()]);

        return [
            'trusted'      => $sameIp,
            'known_device' => true,
            'device_id'    => $deviceId,
        ];
    }

    /**
     * Revoke only the current device session on logout.
     */
    public function revokeCurrent(User $user, string $deviceId): void
    {
        DB::table('device_sessions')
            ->where('user_id', $user->id)
            ->where('device_id', $deviceId)
            ->update(['is_active' => false, 'updated_at' => now()]);
    }

    /**
     * Revoke all device sessions for a user (security reset / account compromise).
     */
    public function revokeAll(User $user): void
    {
        DB::table('device_sessions')
            ->where('user_id', $user->id)
            ->update(['is_active' => false, 'updated_at' => now()]);
    }

    /**
     * Derive a stable device fingerprint from request headers.
     * Not cryptographically strong, but sufficient for soft device tracking.
     */
    public function generateDeviceId(Request $request): string
    {
        $components = implode('|', [
            $request->userAgent() ?? '',
            $request->header('Accept-Language') ?? '',
            $request->header('Accept-Encoding') ?? '',
        ]);

        return hash('sha256', $components);
    }
}
