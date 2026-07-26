<?php

namespace App\Http\Controllers\Api;

use App\Models\Accident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Annotations as OA;

/**
 * @OA\Tag(name="Accidents")
 */
class AccidentController extends ApiController
{
    /**
     * @OA\Get(
     *     path="/api/accidents",
     *     tags={"Accidents"},
     *     summary="Liste des accidents de la circulation",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="type", in="query", required=false, @OA\Schema(type="string", enum={"mat\u00e9riel","corporel","mortel"})),
     *     @OA\Parameter(name="service_id", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="commune_id", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="date_from", in="query", required=false, @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="date_to", in="query", required=false, @OA\Schema(type="string", format="date")),
     *     @OA\Response(response=200, description="Liste paginee", @OA\JsonContent(ref="#/components/schemas/SuccessResponse")),
     *     @OA\Response(response=401, description="Non authentifié")
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $query = Accident::with(['service', 'commune', 'user'])->visibleByUser();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('lieu', 'ILIKE', "%{$search}%")
                  ->orWhere('cause_probable', 'ILIKE', "%{$search}%")
                  ->orWhere('description', 'ILIKE', "%{$search}%");
            });
        }
        if ($request->has('type')) {
            $query->byType($request->type);
        }
        if ($request->has('service_id')) {
            $query->byService($request->service_id);
        }
        if ($request->has('commune_id')) {
            $query->byCommune($request->commune_id);
        }
        if ($request->filled('annee')) {
            $query->whereYear('date', (int) $request->annee);
        }
        if ($request->filled('mois')) {
            $query->whereMonth('date', (int) $request->mois);
        }
        if ($request->filled('region_id')) {
            $query->whereHas('commune.departement', fn($q) => $q->where('region_id', (int) $request->region_id));
        }
        if ($request->filled('departement_id')) {
            $query->whereHas('commune', fn($q) => $q->where('departement_id', (int) $request->departement_id));
        }
        if ($request->has('date_from') && $request->has('date_to')) {
            $query->byDateRange($request->date_from, $request->date_to);
        }

        $accidents = $query->withCount('victimes')
            ->orderByDesc('date')
            ->paginate(min((int) $request->get('per_page', 15), 100));

        return $this->paginatedResponse($accidents);
    }

    /**
     * @OA\Get(
     *     path="/api/accidents/{id}",
     *     tags={"Accidents"},
     *     summary="Détail d'un accident",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Détail"),
     *     @OA\Response(response=404, description="Introuvable")
     * )
     */
    public function show(Accident $accident): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canRead(auth()->user(), $accident)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        $accident->load(['service', 'commune.departement.region', 'user', 'victimes', 'media']);
        return $this->successResponse($accident);
    }

    /**
     * @OA\Post(
     *     path="/api/accidents",
     *     tags={"Accidents"},
     *     summary="Enregistrer un accident",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"type","date","lieu","commune_id","service_id"},
     *             @OA\Property(property="type", type="string", enum={"matériel","corporel","mortel"}, example="corporel"),
     *             @OA\Property(property="date", type="string", format="date", example="2025-05-12"),
     *             @OA\Property(property="lieu", type="string", example="Autoroute à péage, km 15"),
     *             @OA\Property(property="commune_id", type="integer", example=1),
     *             @OA\Property(property="service_id", type="integer", example=1),
     *             @OA\Property(property="moyen", type="string", example="Véhicule"),
     *             @OA\Property(property="cause_probable", type="string", example="Excès de vitesse"),
     *             @OA\Property(property="latitude", type="number", example=14.7228),
     *             @OA\Property(property="longitude", type="number", example=-17.4567)
     *         )
     *     ),
     *     @OA\Response(response=201, description="Créé", @OA\JsonContent(ref="#/components/schemas/SuccessResponse")),
     *     @OA\Response(response=422, description="Validation", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:matériel,corporel,mortel',
            'date' => 'required|date',
            'heure' => 'nullable|date_format:H:i',
            'lieu' => 'required|string|max:500',
            'commune_id' => 'required|exists:communes,id',
            'service_id' => 'required|exists:services,id',
            'moyen' => 'nullable|string|max:255',
            'cause_probable' => 'nullable|string',
            'latitude' => 'nullable|numeric|between:12,17',
            'longitude' => 'nullable|numeric|between:-18,-11',
            'description' => 'nullable|string',
            'sync_status' => 'nullable|in:pending,synced',
        ], [
            'type.required' => 'Le type d\'accident est obligatoire.',
            'type.in' => 'Le type doit être matériel, corporel ou mortel.',
            'date.required' => 'La date est obligatoire.',
            'lieu.required' => 'Le lieu est obligatoire.',
            'latitude.between' => 'La latitude doit être comprise entre 12 et 17 (territoire sénégalais).',
            'longitude.between' => 'La longitude doit être comprise entre -18 et -11 (territoire sénégalais).',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $data = $request->only([
            'type', 'date', 'heure', 'lieu', 'commune_id',
            'service_id', 'moyen', 'cause_probable',
            'latitude', 'longitude', 'description', 'sync_status',
        ]);
        $data['user_id'] = auth()->id();

        $accident = Accident::create($data);

        return $this->successResponse(
            $accident->load(['service', 'commune']),
            'Accident enregistré avec succès.',
            201
        );
    }

    /**
     * @OA\Put(
     *     path="/api/accidents/{id}",
     *     tags={"Accidents"},
     *     summary="Modifier un accident",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Mis à jour")
     * )
     */
    public function update(Request $request, Accident $accident): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canWrite(auth()->user(), $accident)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }

        $secondsSinceCreation = $accident->created_at->diffInSeconds(now());
        if ($secondsSinceCreation > 60 && !auth()->user()->hasRole('administrateur')) {
            return $this->errorResponse(
                'Modification interdite : le délai réglementaire de 1 minute est dépassé.',
                403
            );
        }

        $validator = Validator::make($request->all(), [
            'type' => 'sometimes|in:matériel,corporel,mortel',
            'date' => 'sometimes|date',
            'heure' => 'nullable|date_format:H:i',
            'lieu' => 'sometimes|string|max:500',
            'commune_id' => 'sometimes|exists:communes,id',
            'service_id' => 'sometimes|exists:services,id',
            'moyen' => 'nullable|string|max:255',
            'cause_probable' => 'nullable|string',
            'latitude' => 'nullable|numeric|between:12,17',
            'longitude' => 'nullable|numeric|between:-18,-11',
            'description' => 'nullable|string',
        ], [
            'latitude.between' => 'La latitude doit être comprise entre 12 et 17 (territoire sénégalais).',
            'longitude.between' => 'La longitude doit être comprise entre -18 et -11 (territoire sénégalais).',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $accident->update($request->only([
            'type', 'date', 'heure', 'lieu', 'commune_id',
            'service_id', 'moyen', 'cause_probable',
            'latitude', 'longitude', 'description',
        ]));

        return $this->successResponse(
            $accident->load(['service', 'commune']),
            'Accident mis à jour avec succès.'
        );
    }

    /**
     * @OA\Delete(
     *     path="/api/accidents/{id}",
     *     tags={"Accidents"},
     *     summary="Supprimer un accident",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Supprimé")
     * )
     */
    public function destroy(Accident $accident): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canWrite(auth()->user(), $accident)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        $accident->delete();
        return $this->successResponse(null, 'Accident supprimé avec succès.');
    }
}
