<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\ScopeAccessService;
use App\Models\AuditLog;

/**
 * Middleware pour valider la compétence territoriale en création/modification.
 */
class CheckTerritorialAccess
{
    protected $scopeService;

    public function __construct(ScopeAccessService $scopeService)
    {
        $this->scopeService = $scopeService;
    }

    public function handle(Request $request, Closure $next): Response
    {
        try {
            $user = auth('api')->check() ? auth('api')->user() : null;
        } catch (\Throwable) {
            return $next($request);
        }
        if (!$user) return $next($request);

        // Si la requête modifie ou crée des données qui contiennent commune_id ou service_id
        if ($request->isMethod('POST') || $request->isMethod('PUT') || $request->isMethod('PATCH')) {
            
            // Vérification de la commune
            if ($request->has('commune_id')) {
                $communeId = (int) $request->input('commune_id');
                if (!$this->scopeService->canAccessCommune($user, $communeId, 'write')) {
                    $this->logViolation($request, 'Tentative d\'écriture hors périmètre (Commune: ' . $communeId . ')');
                    return response()->json([
                        'success' => false,
                        'message' => 'Accès territorial refusé : Vous ne pouvez pas enregistrer des données hors de votre zone territoriale.'
                    ], 403);
                }
            }

            // Vérification du service
            if ($request->has('service_id')) {
                $serviceId = (int) $request->input('service_id');
                if (!$this->scopeService->canAccessService($user, $serviceId, 'write')) {
                    $this->logViolation($request, 'Tentative d\'écriture hors périmètre (Service: ' . $serviceId . ')');
                    return response()->json([
                        'success' => false,
                        'message' => 'Accès territorial refusé : Vous ne pouvez pas enregistrer des données pour ce service.'
                    ], 403);
                }
            }

            // Vérification croisée service/commune
            if ($request->has('service_id') && $request->has('commune_id') && $request->input('commune_id')) {
                $serviceId = (int) $request->input('service_id');
                $communeId = (int) $request->input('commune_id');
                $serviceExists = \App\Models\Service::where('id', $serviceId)
                    ->where('commune_id', $communeId)
                    ->exists();
                if (!$serviceExists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Le service sélectionné n\'appartient pas à la commune indiquée.',
                    ], 422);
                }
            }
        }

        return $next($request);
    }

    protected function logViolation(Request $request, string $description): void
    {
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'territorial_violation',
            'model_type' => null,
            'model_id' => null,
            'new_values' => [
                'description' => $description,
                'path' => $request->path(),
                'method' => $request->method(),
                'payload' => $request->except(['password', 'password_confirmation'])
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}
