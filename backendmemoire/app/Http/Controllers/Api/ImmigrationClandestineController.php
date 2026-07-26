<?php

namespace App\Http\Controllers\Api;

use App\Models\ImmigrationClandestine;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Annotations as OA;

/**
 * @OA\Tag(name="Immigration Clandestine")
 */
class ImmigrationClandestineController extends ApiController
{
    /**
     * @OA\Get(
     *     path="/api/immigrations-clandestines",
     *     tags={"Immigration Clandestine"},
     *     summary="Liste des interpellations pour immigration clandestine",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="service_id", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="date_from", in="query", required=false, @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="date_to", in="query", required=false, @OA\Schema(type="string", format="date")),
     *     @OA\Response(response=200, description="Liste paginee")
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $query = ImmigrationClandestine::with(['service', 'user'])->visibleByUser();
        if ($request->has('service_id')) $query->byService($request->service_id);
        if ($request->has('date_from') && $request->has('date_to')) $query->byDateRange($request->date_from, $request->date_to);

        return $this->paginatedResponse($query->orderByDesc('date')->paginate(min((int) $request->get('per_page', 15), 100)));
    }

    /**
     * @OA\Get(
     *     path="/api/immigrations-clandestines/{id}",
     *     tags={"Immigration Clandestine"},
     *     summary="Détail d'une interpellation",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Détail")
     * )
     */
    public function show(ImmigrationClandestine $immigrationClandestine): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canRead(auth()->user(), $immigrationClandestine)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        return $this->successResponse($immigrationClandestine->load(['service', 'user']));
    }

    /**
     * @OA\Post(
     *     path="/api/immigrations-clandestines",
     *     tags={"Immigration Clandestine"},
     *     summary="Enregistrer une interpellation",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(ref="#/components/schemas/ImmigrationClandestine")
     *     ),
     *     @OA\Response(response=201, description="Enregistré", @OA\JsonContent(ref="#/components/schemas/SuccessResponse")),
     *     @OA\Response(response=422, description="Validation", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nombre_interpellation' => 'required|integer|min:0',
            'date' => 'required|date',
            'heure' => 'nullable|date_format:H:i',
            'service_id' => 'required|exists:services,id',
            'nombre_hommes' => 'nullable|integer|min:0',
            'nombre_femmes' => 'nullable|integer|min:0',
            'nombre_enfants' => 'nullable|integer|min:0',
            'nombre_maries' => 'nullable|integer|min:0',
            'nombre_celibataires' => 'nullable|integer|min:0',
            'nombre_senegalais' => 'nullable|integer|min:0',
            'nombre_etrangers' => 'nullable|integer|min:0',
            'zone_depart' => 'nullable|string|max:255',
            'zone_depart_lat' => 'nullable|numeric|between:12,17',
            'zone_depart_lng' => 'nullable|numeric|between:-18,-11',
            'zone_arrivee_prevue' => 'nullable|string|max:255',
            'zone_arrivee_lat' => 'nullable|numeric|between:12,17',
            'zone_arrivee_lng' => 'nullable|numeric|between:-18,-11',
        ]);
        if ($validator->fails()) return $this->errorResponse('Erreur de validation', 422, $validator->errors());

        $service = Service::find($request->service_id);
        if (!$service->gere_immigration) {
            return $this->errorResponse(
                'Ce service n\'est pas habilité à gérer les immigrations clandestines.',
                403
            );
        }

        $data = $validator->validated();
        $data['user_id'] = auth()->id();
        $immigration = ImmigrationClandestine::create($data);
        return $this->successResponse($immigration->load('service'), 'Enregistré avec succès.', 201);
    }

    public function update(Request $request, ImmigrationClandestine $immigrationClandestine): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canWrite(auth()->user(), $immigrationClandestine)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        $secondsSinceCreation = $immigrationClandestine->created_at->diffInSeconds(now());
        if ($secondsSinceCreation > 60 && !auth()->user()->hasRole('administrateur')) {
            return $this->errorResponse('Modification interdite : le délai réglementaire de 1 minute est dépassé.', 403);
        }
        $validator = Validator::make($request->all(), [
            'nombre_interpellation' => 'sometimes|integer|min:0',
            'date' => 'sometimes|date',
            'heure' => 'nullable|date_format:H:i',
            'service_id' => 'sometimes|exists:services,id',
            'nombre_hommes' => 'nullable|integer|min:0',
            'nombre_femmes' => 'nullable|integer|min:0',
            'nombre_enfants' => 'nullable|integer|min:0',
            'nombre_maries' => 'nullable|integer|min:0',
            'nombre_celibataires' => 'nullable|integer|min:0',
            'nombre_senegalais' => 'nullable|integer|min:0',
            'nombre_etrangers' => 'nullable|integer|min:0',
            'zone_depart' => 'nullable|string|max:255',
            'zone_depart_lat' => 'nullable|numeric|between:12,17',
            'zone_depart_lng' => 'nullable|numeric|between:-18,-11',
            'zone_arrivee_prevue' => 'nullable|string|max:255',
            'zone_arrivee_lat' => 'nullable|numeric|between:12,17',
            'zone_arrivee_lng' => 'nullable|numeric|between:-18,-11',
        ]);
        if ($validator->fails()) return $this->errorResponse('Erreur de validation', 422, $validator->errors());

        $immigrationClandestine->update($validator->validated());
        return $this->successResponse($immigrationClandestine->load('service'), 'Mis à jour.');
    }

    public function destroy(ImmigrationClandestine $immigrationClandestine): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canWrite(auth()->user(), $immigrationClandestine)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        $immigrationClandestine->delete();
        return $this->successResponse(null, 'Supprimé.');
    }
}
