<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;

class HealthController extends ApiController
{
    public function index(): JsonResponse
    {
        $hash = env('RAILWAY_GIT_COMMIT_SHA', 'unknown');
        return response()->json(['status' => 'ok', 'timestamp' => now()->toISOString(), 'build' => substr($hash, 0, 7)]);
    }
}
