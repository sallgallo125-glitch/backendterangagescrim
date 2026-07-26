<?php

namespace App\Http\Controllers\Api;

use App\Models\Region;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Annotations as OA;

/**
 * Contrôleur CRUD pour les régions administratives.
 */
class RegionController extends ApiController
{
    /**
     * @OA\Get(
     *     path="/api/regions",
     *     tags={"Régions"},
     *     summary="Liste des régions (paginée)",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="search", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="per_page", in="query", required=false, @OA\Schema(type="integer", default=15)),
     *     @OA\Response(response=200, description="Liste paginée des régions")
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $query = Region::query();

        if ($request->has('search')) {
            $query->search($request->search);
        }

        $regions = $query->withCount('departements')
            ->orderBy('nom')
            ->paginate(min((int) $request->get('per_page', 15), 100));

        return $this->paginatedResponse($regions);
    }

    /**
     * @OA\Get(
     *     path="/api/regions/all",
     *     tags={"Régions"},
     *     summary="Toutes les régions (sans pagination, pour listes déroulantes)",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Liste complète des régions")
     * )
     */
    public function all(): JsonResponse
    {
        $user = auth()->user();
        $query = Region::orderBy('nom');

        if ($user->read_scope_type === \App\Enums\ScopeType::REGION) {
            $query->where('id', $user->read_scope_id);
        }

        return $this->successResponse($query->get());
    }

    /**
     * @OA\Get(
     *     path="/api/regions/{id}",
     *     tags={"Régions"},
     *     summary="Détail d'une région avec ses départements",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Région avec départements et communes")
     * )
     */
    public function show(Region $region): JsonResponse
    {
        $region->load('departements.communes');
        return $this->successResponse($region);
    }

    /**
     * @OA\Post(
     *     path="/api/regions",
     *     tags={"Régions"},
     *     summary="Créer une région",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"nom","code"},
     *             @OA\Property(property="nom", type="string", example="Dakar"),
     *             @OA\Property(property="code", type="string", example="DK")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Créée avec succès", @OA\JsonContent(ref="#/components/schemas/SuccessResponse")),
     *     @OA\Response(response=422, description="Validation", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'required|string|max:255|unique:regions,nom',
            'code' => 'required|string|max:10|unique:regions,code',
        ], [
            'nom.required' => 'Le nom de la région est obligatoire.',
            'nom.unique' => 'Cette région existe déjà.',
            'code.required' => 'Le code est obligatoire.',
            'code.unique' => 'Ce code existe déjà.',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $region = Region::create($request->only('nom', 'code'));

        return $this->successResponse($region, 'Région créée avec succès.', 201);
    }

    /**
     * Mettre à jour une région
     */
    public function update(Request $request, Region $region): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'sometimes|string|max:255|unique:regions,nom,' . $region->id,
            'code' => 'sometimes|string|max:10|unique:regions,code,' . $region->id,
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $region->update($request->only('nom', 'code'));

        return $this->successResponse($region, 'Région mise à jour avec succès.');
    }

    /**
     * Supprimer une région
     */
    public function destroy(Region $region): JsonResponse
    {
        if ($region->departements()->exists()) {
            return $this->errorResponse('Impossible de supprimer : cette région contient des départements.', 409);
        }

        $region->delete();
        return $this->successResponse(null, 'Région supprimée avec succès.');
    }
}
