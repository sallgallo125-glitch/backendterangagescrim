<?php

namespace App\Http\Controllers\Api;

use App\Models\Victime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * Contrôleur CRUD pour les victimes et impliqués.
 */
class VictimeController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Victime::with(['infraction', 'accident'])->visibleByUser();

        if ($request->has('infraction_id')) {
            $query->where('infraction_id', $request->infraction_id);
        }
        if ($request->has('accident_id')) {
            $query->where('accident_id', $request->accident_id);
        }
        if ($request->filled('nationalite')) {
            $query->where('nationalite', $request->nationalite);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nom', 'ILIKE', "%{$search}%")
                  ->orWhere('prenom', 'ILIKE', "%{$search}%");
            });
        }
        if ($request->filled('sexe')) {
            $query->where('sexe', $request->sexe);
        }
        if ($request->filled('est_decede')) {
            $query->where('statut_deces', $request->est_decede === '1' || $request->est_decede === 'true');
        }
        if ($request->filled('type')) {
            if ($request->type === 'accident') {
                $query->whereNotNull('accident_id');
            } elseif ($request->type === 'infraction') {
                $query->whereNotNull('infraction_id');
            }
        }

        $victimes = $query->orderByDesc('created_at')
            ->paginate(min((int) $request->get('per_page', 15), 100));

        return $this->paginatedResponse($victimes);
    }

    public function show(Victime $victime): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canRead(auth()->user(), $victime)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        $victime->load(['infraction.typeInfraction', 'accident', 'media']);
        return $this->successResponse($victime);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'nullable|string|max:255',
            'prenom' => 'nullable|string|max:255',
            'no_cin_passeport' => 'nullable|string|max:50',
            'sexe' => 'nullable|in:M,F',
            'age' => 'nullable|integer|min:0|max:150',
            'nationalite' => 'nullable|in:Sénégalaise,Étrangère',
            'infraction_id' => 'nullable|exists:infractions,id',
            'accident_id' => 'nullable|exists:accidents,id',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        // Au moins un lien (infraction ou accident) doit être fourni
        if (!$request->infraction_id && !$request->accident_id) {
            return $this->errorResponse('La victime doit être liée à une infraction ou un accident.', 422);
        }

        if ($request->infraction_id) {
            $infraction = \App\Models\Infraction::find($request->infraction_id);
            if (!$infraction) {
                return $this->errorResponse('Infraction introuvable.', 404);
            }
            $scopeService = app(\App\Services\ScopeAccessService::class);
            if (!$scopeService->canRead(auth()->user(), $infraction)) {
                return $this->errorResponse('Accès territorial refusé.', 403);
            }
        }
        if ($request->accident_id) {
            $accident = \App\Models\Accident::find($request->accident_id);
            if (!$accident) {
                return $this->errorResponse('Accident introuvable.', 404);
            }
            $scopeService = app(\App\Services\ScopeAccessService::class);
            if (!$scopeService->canRead(auth()->user(), $accident)) {
                return $this->errorResponse('Accès territorial refusé.', 403);
            }
        }

        $victime = Victime::create($validator->validated());

        return $this->successResponse($victime, 'Victime enregistrée avec succès.', 201);
    }

    public function update(Request $request, Victime $victime): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canWrite(auth()->user(), $victime)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        $validator = Validator::make($request->all(), [
            'nom' => 'nullable|string|max:255',
            'prenom' => 'nullable|string|max:255',
            'no_cin_passeport' => 'nullable|string|max:50',
            'sexe' => 'nullable|in:M,F',
            'age' => 'nullable|integer|min:0|max:150',
            'nationalite' => 'nullable|in:Sénégalaise,Étrangère',
            'infraction_id' => 'nullable|exists:infractions,id',
            'accident_id' => 'nullable|exists:accidents,id',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        // Vérifier qu'après la mise à jour la victime reste liée à une entité
        $newInfractionId = $request->has('infraction_id') ? $request->infraction_id : $victime->infraction_id;
        $newAccidentId   = $request->has('accident_id')   ? $request->accident_id   : $victime->accident_id;
        if (!$newInfractionId && !$newAccidentId) {
            return $this->errorResponse('La victime doit rester liée à une infraction ou un accident.', 422);
        }

        $victime->update($validator->validated());

        return $this->successResponse($victime, 'Victime mise à jour avec succès.');
    }

    public function destroy(Victime $victime): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canWrite(auth()->user(), $victime)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        $victime->delete();
        return $this->successResponse(null, 'Victime supprimée avec succès.');
    }
}
