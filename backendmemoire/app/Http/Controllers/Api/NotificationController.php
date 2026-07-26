<?php

namespace App\Http\Controllers\Api;

use App\Models\NotificationInterne;
use App\Models\User;
use App\Models\Region;
use App\Models\Departement;
use App\Models\Commune;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class NotificationController extends ApiController
{
    // ─── Lecture ─────────────────────────────────────────────────────────────

    /**
     * Lister les notifications de l'utilisateur connecté.
     */
    public function index(Request $request): JsonResponse
    {
        $query = NotificationInterne::where('user_id', auth()->id())
            ->with('sender:id,name');

        if ($request->has('is_read')) {
            $query->where('is_read', $request->boolean('is_read'));
        }
        if ($request->has('type')) {
            $query->byType($request->type);
        }

        $paginated = $query->orderByDesc('created_at')
            ->paginate(min((int) $request->get('per_page', 15), 100));

        $paginated->getCollection()->transform(fn($n) => $this->formatNotification($n));

        return $this->paginatedResponse($paginated);
    }

    /**
     * Nombre de notifications non lues de l'utilisateur connecté.
     */
    public function unreadCount(): JsonResponse
    {
        $count = NotificationInterne::where('user_id', auth()->id())->unread()->count();
        return $this->successResponse(['count' => $count]);
    }

    /**
     * Historique des notifications envoyées par l'admin connecté (20 dernières).
     */
    public function history(Request $request): JsonResponse
    {
        // Une entrée représentative par groupe d'envoi — pas de recipients_count
        // pour éviter l'énumération du nombre d'utilisateurs ciblés
        $rows = NotificationInterne::where('sender_id', auth()->id())
            ->select('id', 'sender_id', 'titre', 'message', 'type', 'canal', 'diffusion_type', 'target_id', 'created_at')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return $this->successResponse($rows);
    }

    // ─── Marquage ────────────────────────────────────────────────────────────

    /**
     * Marquer une notification comme lue.
     */
    public function markAsRead(NotificationInterne $notification): JsonResponse
    {
        if ($notification->user_id !== auth()->id()) {
            return $this->errorResponse('Non autorisé.', 403);
        }
        $notification->update(['is_read' => true]);
        return $this->successResponse(null, 'Notification marquée comme lue.');
    }

    /**
     * Marquer toutes les notifications comme lues.
     */
    public function markAllAsRead(): JsonResponse
    {
        NotificationInterne::where('user_id', auth()->id())->unread()->update(['is_read' => true]);
        return $this->successResponse(null, 'Toutes les notifications marquées comme lues.');
    }

    // ─── Envoi ───────────────────────────────────────────────────────────────

    /**
     * Envoyer une notification.
     *
     * Champs attendus :
     *   - title        (string, requis)
     *   - message      (string, requis)
     *   - type         (alert|info|warning|success|error, optionnel, défaut: info)
     *   - canal        (ecran|email|sms, optionnel, défaut: ecran)
     *   - diffusion    (global|role|region|departement|commune|service|user, requis)
     *   - target_id    (requis sauf pour global) :
     *                     diffusion=role        → nom du rôle  (ex: "agent")
     *                     diffusion=region      → id de région
     *                     diffusion=departement → id de département
     *                     diffusion=commune     → id de commune
     *                     diffusion=service     → id de service
     *                     diffusion=user        → id de l'utilisateur
     */
    public function send(Request $request): JsonResponse
    {
        $me          = auth()->user();
        $currentRole = $me->getRoleNames()->first() ?? '';

        $writeScope   = $me->write_scope_type?->value ?? 'national';
        $writeScopeId = $me->write_scope_id;

        // Diffusions autorisées par rôle
        $isNational = $me->read_scope_type?->value === 'national';
        $allowedDiffusions = match (true) {
            $currentRole === 'administrateur' => ['global', 'role', 'region', 'departement', 'commune', 'service', 'user', 'users'],
            $currentRole === 'gestionnaire'   => ['region', 'departement', 'commune', 'service', 'user', 'users'],
            default => [],
        };

        $validator = Validator::make($request->all(), [
            'title'        => 'required|string|max:255',
            'message'      => 'required|string',
            'type'         => 'nullable|in:alert,info,warning,success,error',
            'canal'        => 'nullable|in:ecran,email,sms',
            'diffusion'    => ['required', 'in:global,role,region,departement,commune,service,user,users'],
            'target_id'    => 'required_unless:diffusion,global,users',
            'target_ids'   => 'required_if:diffusion,users|array|min:1',
            'target_ids.*' => 'integer|exists:users,id',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $diffusion = $request->diffusion;
        $targetId  = $request->target_id;
        $targetIds = $request->target_ids ?? [];

        if (!in_array($diffusion, $allowedDiffusions, true)) {
            return $this->errorResponse('Vous ne pouvez pas envoyer une notification avec ce mode de diffusion.', 403);
        }

        // Gestionnaire : vérification territoriale (limité à sa région)
        if ($currentRole === 'gestionnaire') {
            $error = $this->checkTerritorialTarget($diffusion, $targetId, $targetIds, $writeScope, $writeScopeId, $me);
            if ($error) {
                return $this->errorResponse($error, 403);
            }
        }

        // Résoudre la liste des user_id destinataires
        $userIds = $diffusion === 'users'
            ? collect($targetIds)->unique()
            : $this->resolveRecipients($diffusion, $targetId);

        if ($userIds->isEmpty()) {
            return $this->errorResponse('Aucun destinataire trouvé pour cette cible.', 404);
        }

        $base = [
            'titre'          => $request->title,
            'message'        => $request->message,
            'type'           => $request->type ?? 'info',
            'canal'          => $request->canal ?? 'ecran',
            'is_read'        => false,
            'sender_id'      => auth()->id(),
            'diffusion_type' => $diffusion === 'users' ? 'user' : $diffusion,
            'target_id'      => $diffusion === 'users' ? implode(',', $targetIds) : $targetId,
        ];

        // Insertion groupée pour les performances
        $now   = now();
        $rows  = $userIds->map(fn($uid) => array_merge($base, [
            'user_id'    => $uid,
            'created_at' => $now,
            'updated_at' => $now,
        ]))->toArray();

        // Chunker par 500 pour éviter les requêtes trop longues
        collect($rows)->chunk(500)->each(fn($chunk) => NotificationInterne::insert($chunk->toArray()));

        $count = $userIds->count();

        return $this->successResponse(
            ['recipients_count' => $count],
            "Notification envoyée à {$count} utilisateur(s).",
            201
        );
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Retourne les IDs de région/département/commune/service accessibles par l'expéditeur selon son scope.
     * Utilisé par le frontend via GET /notifications/zone-data.
     */
    public function zoneData(): JsonResponse
    {
        $me          = auth()->user();
        $writeScope  = $me->write_scope_type?->value ?? 'national';
        $scopeId     = $me->write_scope_id;

        if ($writeScope === 'national') {
            return $this->successResponse([
                'scope'      => 'national',
                'regions'    => Region::select('id', 'nom')->orderBy('nom')->get(),
            ]);
        }

        if ($writeScope === 'region') {
            $region = Region::with([
                'departements:id,nom,region_id',
                'departements.communes:id,nom,departement_id',
                'departements.communes.services:id,nom,commune_id',
            ])->find($scopeId, ['id', 'nom']);

            return $this->successResponse([
                'scope'   => 'region',
                'region'  => $region,
            ]);
        }

        if ($writeScope === 'departement') {
            $dept = Departement::with([
                'communes:id,nom,departement_id',
                'communes.services:id,nom,commune_id',
            ])->find($scopeId, ['id', 'nom', 'region_id']);

            return $this->successResponse([
                'scope'       => 'departement',
                'departement' => $dept,
            ]);
        }

        if ($writeScope === 'commune') {
            $commune = Commune::with('services:id,nom,commune_id')
                ->find($scopeId, ['id', 'nom', 'departement_id']);

            return $this->successResponse([
                'scope'   => 'commune',
                'commune' => $commune,
            ]);
        }

        // service
        $service = Service::find($scopeId, ['id', 'nom', 'commune_id']);
        return $this->successResponse([
            'scope'   => 'service',
            'service' => $service,
        ]);
    }

    /**
     * Vérifie que la cible est dans le périmètre de write_scope de l'expéditeur.
     * Retourne un message d'erreur ou null si OK.
     */
    private function checkTerritorialTarget(
        string $diffusion, mixed $targetId, array $targetIds,
        string $writeScope, mixed $writeScopeId, $me
    ): ?string {
        switch ($writeScope) {
            case 'region':
                return match ($diffusion) {
                    'region' => ((int)$targetId !== (int)$writeScopeId)
                        ? 'Vous ne pouvez notifier que votre région.' : null,

                    'departement' => Departement::where('id', $targetId)
                        ->where('region_id', $writeScopeId)->exists()
                        ? null : 'Ce département n\'est pas dans votre région.',

                    'commune' => Commune::where('id', $targetId)
                        ->whereHas('departement', fn($q) => $q->where('region_id', $writeScopeId))->exists()
                        ? null : 'Cette commune n\'est pas dans votre région.',

                    'service' => Service::where('id', $targetId)
                        ->whereHas('commune.departement', fn($q) => $q->where('region_id', $writeScopeId))->exists()
                        ? null : 'Ce service n\'est pas dans votre région.',

                    'user' => User::where('id', $targetId)
                        ->where(fn($q) => $q
                            ->where(fn($q2) => $q2->where('read_scope_type', 'region')->where('read_scope_id', $writeScopeId))
                            ->orWhereHas('service', fn($q2) => $q2
                                ->whereHas('commune.departement', fn($q3) => $q3->where('region_id', $writeScopeId)))
                        )->exists()
                        ? null : 'Cet utilisateur n\'est pas dans votre région.',

                    'users' => (function () use ($targetIds, $writeScopeId) {
                        $serviceIds = Service::whereHas('commune.departement', fn($q) =>
                            $q->where('region_id', $writeScopeId))->pluck('id');
                        $valid = User::whereIn('id', $targetIds)
                            ->where(fn($q) => $q
                                ->where(fn($q2) => $q2->where('read_scope_type', 'region')->where('read_scope_id', $writeScopeId))
                                ->orWhereIn('service_id', $serviceIds)
                            )->pluck('id')->toArray();
                        return count(array_diff($targetIds, $valid)) === 0
                            ? null : 'Certains utilisateurs ne sont pas dans votre région.';
                    })(),

                    default => 'Mode de diffusion non autorisé pour votre périmètre.',
                };

            case 'departement':
                return match ($diffusion) {
                    'departement' => ((int)$targetId !== (int)$writeScopeId)
                        ? 'Vous ne pouvez notifier que votre département.' : null,

                    'commune' => Commune::where('id', $targetId)
                        ->where('departement_id', $writeScopeId)->exists()
                        ? null : 'Cette commune n\'est pas dans votre département.',

                    'service' => Service::where('id', $targetId)
                        ->whereHas('commune', fn($q) => $q->where('departement_id', $writeScopeId))->exists()
                        ? null : 'Ce service n\'est pas dans votre département.',

                    'user' => (function () use ($targetId, $writeScopeId) {
                        $serviceIds = Service::whereHas('commune', fn($q) =>
                            $q->where('departement_id', $writeScopeId))->pluck('id');
                        return User::where('id', $targetId)
                            ->where(fn($q) => $q
                                ->where(fn($q2) => $q2->where('read_scope_type', 'departement')->where('read_scope_id', $writeScopeId))
                                ->orWhereIn('service_id', $serviceIds)
                            )->exists()
                            ? null : 'Cet utilisateur n\'est pas dans votre département.';
                    })(),

                    'users' => (function () use ($targetIds, $writeScopeId) {
                        $serviceIds = Service::whereHas('commune', fn($q) =>
                            $q->where('departement_id', $writeScopeId))->pluck('id');
                        $valid = User::whereIn('id', $targetIds)
                            ->where(fn($q) => $q
                                ->where(fn($q2) => $q2->where('read_scope_type', 'departement')->where('read_scope_id', $writeScopeId))
                                ->orWhereIn('service_id', $serviceIds)
                            )->pluck('id')->toArray();
                        return count(array_diff($targetIds, $valid)) === 0
                            ? null : 'Certains utilisateurs ne sont pas dans votre département.';
                    })(),

                    default => 'Mode de diffusion non autorisé pour votre périmètre.',
                };

            case 'commune':
                return match ($diffusion) {
                    'commune' => ((int)$targetId !== (int)$writeScopeId)
                        ? 'Vous ne pouvez notifier que votre commune.' : null,

                    'service' => Service::where('id', $targetId)
                        ->where('commune_id', $writeScopeId)->exists()
                        ? null : 'Ce service n\'est pas dans votre commune.',

                    'user' => (function () use ($targetId, $writeScopeId) {
                        $serviceIds = Service::where('commune_id', $writeScopeId)->pluck('id');
                        return User::where('id', $targetId)
                            ->where(fn($q) => $q
                                ->where(fn($q2) => $q2->where('read_scope_type', 'commune')->where('read_scope_id', $writeScopeId))
                                ->orWhereIn('service_id', $serviceIds)
                            )->exists()
                            ? null : 'Cet utilisateur n\'est pas dans votre commune.';
                    })(),

                    'users' => (function () use ($targetIds, $writeScopeId) {
                        $serviceIds = Service::where('commune_id', $writeScopeId)->pluck('id');
                        $valid = User::whereIn('id', $targetIds)
                            ->where(fn($q) => $q
                                ->where(fn($q2) => $q2->where('read_scope_type', 'commune')->where('read_scope_id', $writeScopeId))
                                ->orWhereIn('service_id', $serviceIds)
                            )->pluck('id')->toArray();
                        return count(array_diff($targetIds, $valid)) === 0
                            ? null : 'Certains utilisateurs ne sont pas dans votre commune.';
                    })(),

                    default => 'Mode de diffusion non autorisé pour votre périmètre.',
                };
        }

        return null;
    }

    /**
     * Résout la liste des user_id actifs selon le mode de diffusion.
     */
    private function resolveRecipients(string $diffusion, mixed $targetId): \Illuminate\Support\Collection
    {
        $query = User::where('is_active', true);

        switch ($diffusion) {
            case 'global':
                // Tous les utilisateurs actifs
                break;

            case 'role':
                // Par rôle Spatie (ex: "agent", "admin")
                $query->whereHas('roles', fn($q) => $q->where('name', $targetId));
                break;

            case 'region':
                // Utilisateurs dont le read_scope_type=region et read_scope_id=targetId
                // + utilisateurs d'un service situé dans cette région
                $serviceIds = Service::whereHas('commune.departement', fn($q) =>
                    $q->where('region_id', $targetId)
                )->pluck('id');

                $query->where(function ($q) use ($targetId, $serviceIds) {
                    $q->where(function ($q2) use ($targetId) {
                        $q2->where('read_scope_type', 'region')
                           ->where('read_scope_id', $targetId);
                    })->orWhere(function ($q2) use ($targetId) {
                        $q2->where('read_scope_type', 'national');
                    })->orWhere(function ($q2) use ($serviceIds) {
                        $q2->whereIn('service_id', $serviceIds);
                    });
                });
                break;

            case 'departement':
                $serviceIds = Service::whereHas('commune', fn($q) =>
                    $q->where('departement_id', $targetId)
                )->pluck('id');

                $regionId = Departement::find($targetId)?->region_id;

                $query->where(function ($q) use ($targetId, $serviceIds, $regionId) {
                    $q->where(function ($q2) use ($targetId) {
                        $q2->where('read_scope_type', 'departement')
                           ->where('read_scope_id', $targetId);
                    })->orWhere(function ($q2) use ($regionId) {
                        $q2->where('read_scope_type', 'region')
                           ->where('read_scope_id', $regionId);
                    })->orWhere(fn($q2) => $q2->where('read_scope_type', 'national'))
                      ->orWhere(fn($q2) => $q2->whereIn('service_id', $serviceIds));
                });
                break;

            case 'commune':
                $serviceIds = Service::where('commune_id', $targetId)->pluck('id');
                $commune    = Commune::with('departement')->find($targetId);
                $deptId     = $commune?->departement_id;
                $regionId   = $commune?->departement?->region_id;

                $query->where(function ($q) use ($targetId, $serviceIds, $deptId, $regionId) {
                    $q->where(function ($q2) use ($targetId) {
                        $q2->where('read_scope_type', 'commune')
                           ->where('read_scope_id', $targetId);
                    })->orWhere(function ($q2) use ($deptId) {
                        $q2->where('read_scope_type', 'departement')
                           ->where('read_scope_id', $deptId);
                    })->orWhere(function ($q2) use ($regionId) {
                        $q2->where('read_scope_type', 'region')
                           ->where('read_scope_id', $regionId);
                    })->orWhere(fn($q2) => $q2->where('read_scope_type', 'national'))
                      ->orWhere(fn($q2) => $q2->whereIn('service_id', $serviceIds));
                });
                break;

            case 'service':
                $service  = Service::with('commune.departement')->find($targetId);
                $communeId = $service?->commune_id;
                $deptId    = $service?->commune?->departement_id;
                $regionId  = $service?->commune?->departement?->region_id;

                $query->where(function ($q) use ($targetId, $communeId, $deptId, $regionId) {
                    $q->where('service_id', $targetId)
                      ->orWhere(function ($q2) use ($communeId) {
                          $q2->where('read_scope_type', 'commune')
                             ->where('read_scope_id', $communeId);
                      })->orWhere(function ($q2) use ($deptId) {
                          $q2->where('read_scope_type', 'departement')
                             ->where('read_scope_id', $deptId);
                      })->orWhere(function ($q2) use ($regionId) {
                          $q2->where('read_scope_type', 'region')
                             ->where('read_scope_id', $regionId);
                      })->orWhere(fn($q2) => $q2->where('read_scope_type', 'national'));
                });
                break;

            case 'user':
                $query->where('id', $targetId);
                break;
        }

        return $query->pluck('id');
    }

    /**
     * Formate une notification pour la réponse API.
     */
    private function formatNotification(NotificationInterne $n): NotificationInterne
    {
        $n->title   = $n->titre;
        $n->read_at = $n->is_read ? ($n->updated_at?->toISOString()) : null;
        return $n;
    }
}
