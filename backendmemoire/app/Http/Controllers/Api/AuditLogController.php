<?php

namespace App\Http\Controllers\Api;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Contrôleur pour la consultation des logs d'audit.
 */
class AuditLogController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $me          = auth()->user();
        $currentRole = $me->getRoleNames()->first() ?? '';

        $query = AuditLog::with('user');

        // Restreindre les logs selon le rôle
        if ($currentRole === 'gestionnaire') {
            // Gestionnaire : voit uniquement les logs des agents de sa région
            $visibleUserIds = User::whereHas('roles', fn($q) => $q->where('name', 'agent'))
                ->whereHas('service', function ($sq) use ($me) {
                    $sq->whereHas('commune.departement', fn($dq) => $dq->where('region_id', $me->read_scope_id));
                })->pluck('id');
            $query->whereIn('user_id', $visibleUserIds);
        } elseif ($currentRole === 'agent') {
            // Agent : voit uniquement ses propres logs
            $query->where('user_id', $me->id);
        }
        // Administrateur : voit tous les logs sans restriction

        if ($request->has('user_id')) $query->byUser($request->user_id);
        if ($request->has('action')) $query->byAction($request->action);
        if ($request->has('model_type')) $query->byModel($request->model_type);
        if ($request->has('date_from') && $request->has('date_to')) {
            $query->byDateRange($request->date_from, $request->date_to);
        }

        return $this->paginatedResponse(
            $query->orderByDesc('created_at')->paginate(min((int) $request->get('per_page', 50), 100))
        );
    }

    public function show(AuditLog $auditLog): JsonResponse
    {
        $me          = auth()->user();
        $currentRole = $me->getRoleNames()->first() ?? '';

        if ($currentRole === 'gestionnaire') {
            // Gestionnaire : uniquement les logs des agents de sa région
            $visibleUserIds = User::whereHas('roles', fn($q) => $q->where('name', 'agent'))
                ->whereHas('service', function ($sq) use ($me) {
                    $sq->whereHas('commune.departement', fn($dq) => $dq->where('region_id', $me->read_scope_id));
                })->pluck('id');
            if ($auditLog->user_id === null || !$visibleUserIds->contains($auditLog->user_id)) {
                return $this->errorResponse('Accès refusé.', 403);
            }
        } elseif ($currentRole === 'agent') {
            // Agent : uniquement ses propres logs
            if ($auditLog->user_id !== $me->id) {
                return $this->errorResponse('Accès refusé.', 403);
            }
        }
        // Administrateur : accès sans restriction

        $auditLog->load('user');
        return $this->successResponse($auditLog);
    }
}
