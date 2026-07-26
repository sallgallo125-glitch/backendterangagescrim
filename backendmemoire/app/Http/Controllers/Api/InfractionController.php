<?php

namespace App\Http\Controllers\Api;

use App\Models\Infraction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Annotations as OA;

/**
 * @OA\Tag(name="Infractions")
 */
class InfractionController extends ApiController
{
    /**
     * @OA\Get(
     *     path="/api/infractions",
     *     tags={"Infractions"},
     *     summary="Liste des infractions",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="annee", in="query", required=false, @OA\Schema(type="integer", example=2025)),
     *     @OA\Parameter(name="service_id", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="commune_id", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="issue", in="query", required=false, @OA\Schema(type="string", enum={"Constat\u00e9e","D\u00e9f\u00e9r\u00e9e"})),
     *     @OA\Parameter(name="type_infraction_id", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="date_from", in="query", required=false, @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="date_to", in="query", required=false, @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="sync_status", in="query", required=false, @OA\Schema(type="string", enum={"pending","synced"})),
     *     @OA\Parameter(name="search", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="per_page", in="query", required=false, @OA\Schema(type="integer", default=15)),
     *     @OA\Response(response=200, description="Liste paginee", @OA\JsonContent(ref="#/components/schemas/SuccessResponse")),
     *     @OA\Response(response=401, description="Non authentifié", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $query = Infraction::with(['typeInfraction.categorieInfraction', 'service', 'commune.departement.region', 'user'])->visibleByUser();

        // Filtres
        if ($request->has('search')) {
            $query->search($request->search);
        }
        if ($request->has('annee')) {
            $query->byAnnee($request->annee);
        }
        if ($request->filled('mois')) {
            $query->whereMonth('date', (int) $request->mois);
        }
        if ($request->has('service_id')) {
            $query->byService($request->service_id);
        }
        if ($request->has('commune_id')) {
            $query->byCommune($request->commune_id);
        }
        if ($request->filled('region_id')) {
            $query->whereHas('commune.departement', fn($q) => $q->where('region_id', (int) $request->region_id));
        }
        if ($request->filled('departement_id')) {
            $query->whereHas('commune', fn($q) => $q->where('departement_id', (int) $request->departement_id));
        }
        if ($request->has('issue')) {
            $query->byIssue($request->issue);
        }
        if ($request->has('type_infraction_id')) {
            $query->where('type_infraction_id', $request->type_infraction_id);
        }
        if ($request->has('date_from') && $request->has('date_to')) {
            $query->byDateRange($request->date_from, $request->date_to);
        }
        if ($request->has('sync_status')) {
            $query->where('sync_status', $request->sync_status);
        }

        $infractions = $query->withCount('victimes')
            ->orderByDesc('date')
            ->paginate(min((int) $request->get('per_page', 15), 100));

        return $this->paginatedResponse($infractions);
    }

    /**
     * @OA\Get(
     *     path="/api/infractions/{id}",
     *     tags={"Infractions"},
     *     summary="Détail d'une infraction",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Détail", @OA\JsonContent(ref="#/components/schemas/SuccessResponse")),
     *     @OA\Response(response=404, description="Introuvable", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function show(Infraction $infraction): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canRead(auth()->user(), $infraction)) {
            return $this->errorResponse('Accès territorial refusé pour cette ressource.', 403);
        }

        $infraction->load([
            'typeInfraction.categorieInfraction',
            'service.commune',
            'commune.departement.region',
            'user',
            'victimes',
            'media',
        ]);

        return $this->successResponse($infraction);
    }

    /**
     * @OA\Post(
     *     path="/api/infractions",
     *     tags={"Infractions"},
     *     summary="Enregistrer une infraction",
     *     description="Crée une nouvelle infraction. Le champ sync_status peut être 'pending' pour les saisies offline.",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"type_infraction_id","service_id","annee","date","lieu","commune_id","issue"},
     *             @OA\Property(property="type_infraction_id", type="integer", example=2),
     *             @OA\Property(property="service_id", type="integer", example=1),
     *             @OA\Property(property="annee", type="integer", example=2025),
     *             @OA\Property(property="date", type="string", format="date", example="2025-05-12"),
     *             @OA\Property(property="lieu", type="string", example="Marché Sandaga, Dakar"),
     *             @OA\Property(property="commune_id", type="integer", example=1),
     *             @OA\Property(property="issue", type="string", enum={"Constatée","Déférée"}, example="Constatée"),
     *             @OA\Property(property="latitude", type="number", example=14.6928),
     *             @OA\Property(property="longitude", type="number", example=-17.4467),
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="sync_status", type="string", enum={"pending","synced"}, example="synced")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Créée avec succès", @OA\JsonContent(ref="#/components/schemas/SuccessResponse")),
     *     @OA\Response(response=422, description="Erreur de validation", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'type_infraction_id' => 'required|exists:type_infractions,id',
            'service_id' => 'required|exists:services,id',
            'annee' => 'required|integer|min:2000|max:' . (date('Y') + 1),
            'date' => 'required|date',
            'heure' => 'nullable|date_format:H:i',
            'lieu' => 'required|string|max:500',
            'commune_id' => 'required|exists:communes,id',
            'issue' => 'required|in:Constatée,Déférée',
            'type_drogue' => 'nullable|string|max:255',
            'unite' => 'nullable|string|max:50',
            'quantite' => 'nullable|numeric|min:0',
            'latitude' => 'nullable|numeric|between:12,17',
            'longitude' => 'nullable|numeric|between:-18,-11',
            'description' => 'nullable|string',
            'sync_status' => 'nullable|in:pending,synced',
            'montant_amende' => 'nullable|numeric|min:0',
            'plaque_vehicule' => 'nullable|string|max:20',
        ], [
            'type_infraction_id.required' => 'Le type d\'infraction est obligatoire.',
            'service_id.required' => 'Le service est obligatoire.',
            'date.required' => 'La date est obligatoire.',
            'lieu.required' => 'Le lieu est obligatoire.',
            'commune_id.required' => 'La commune est obligatoire.',
            'issue.required' => 'L\'issue est obligatoire.',
            'latitude.between' => 'La latitude doit être comprise entre 12 et 17 (territoire sénégalais).',
            'longitude.between' => 'La longitude doit être comprise entre -18 et -11 (territoire sénégalais).',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $data = $request->only([
            'type_infraction_id', 'service_id', 'annee', 'date', 'heure',
            'lieu', 'commune_id', 'issue', 'type_drogue', 'unite',
            'quantite', 'latitude', 'longitude', 'description',
            'sync_status', 'montant_amende', 'plaque_vehicule',
        ]);
        $data['user_id'] = auth()->id();

        $infraction = Infraction::create($data);

        return $this->successResponse(
            $infraction->load(['typeInfraction', 'service', 'commune']),
            'Infraction enregistrée avec succès.',
            201
        );
    }

    /**
     * @OA\Put(
     *     path="/api/infractions/{id}",
     *     tags={"Infractions"},
     *     summary="Modifier une infraction",
     *     description="Règle métier : modification bloquée après 1 minute pour les agents.",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(ref="#/components/schemas/Infraction")),
     *     @OA\Response(response=200, description="Mise à jour réussie", @OA\JsonContent(ref="#/components/schemas/SuccessResponse")),
     *     @OA\Response(response=403, description="Délai dépassé", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function update(Request $request, Infraction $infraction): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canWrite(auth()->user(), $infraction)) {
            return $this->errorResponse('Accès territorial refusé. Vous ne pouvez pas modifier cette donnée.', 403);
        }

        // Règle métier : modification autorisée dans les 60 secondes (1 minute) suivant la création
        $secondsSinceCreation = $infraction->created_at->diffInSeconds(now());
        if ($secondsSinceCreation > 60 && !auth()->user()->hasRole('administrateur')) {
            return $this->errorResponse(
                'Modification interdite : le délai réglementaire de 1 minute est dépassé.',
                403
            );
        }

        $validator = Validator::make($request->all(), [
            'type_infraction_id' => 'sometimes|exists:type_infractions,id',
            'service_id' => 'sometimes|exists:services,id',
            'annee' => 'sometimes|integer|min:2000',
            'date' => 'sometimes|date',
            'heure' => 'nullable|date_format:H:i',
            'lieu' => 'sometimes|string|max:500',
            'commune_id' => 'sometimes|exists:communes,id',
            'issue' => 'sometimes|in:Constatée,Déférée',
            'type_drogue' => 'nullable|string|max:255',
            'unite' => 'nullable|string|max:50',
            'quantite' => 'nullable|numeric|min:0',
            'latitude' => 'nullable|numeric|between:12,17',
            'longitude' => 'nullable|numeric|between:-18,-11',
            'description' => 'nullable|string',
            'montant_amende' => 'nullable|numeric|min:0',
            'plaque_vehicule' => 'nullable|string|max:20',
        ], [
            'latitude.between' => 'La latitude doit être comprise entre 12 et 17 (territoire sénégalais).',
            'longitude.between' => 'La longitude doit être comprise entre -18 et -11 (territoire sénégalais).',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $infraction->update($request->only([
            'type_infraction_id', 'service_id', 'annee', 'date', 'heure',
            'lieu', 'commune_id', 'issue', 'type_drogue', 'unite',
            'quantite', 'latitude', 'longitude', 'description',
            'montant_amende', 'plaque_vehicule',
        ]));

        return $this->successResponse(
            $infraction->load(['typeInfraction', 'service', 'commune']),
            'Infraction mise à jour avec succès.'
        );
    }

    /**
     * @OA\Delete(
     *     path="/api/infractions/{id}",
     *     tags={"Infractions"},
     *     summary="Supprimer une infraction",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Supprimée", @OA\JsonContent(ref="#/components/schemas/SuccessResponse")),
     *     @OA\Response(response=404, description="Introuvable", @OA\JsonContent(ref="#/components/schemas/ErrorResponse"))
     * )
     */
    public function destroy(Infraction $infraction): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canWrite(auth()->user(), $infraction)) {
            return $this->errorResponse('Accès territorial refusé. Vous ne pouvez pas supprimer cette donnée.', 403);
        }

        $infraction->delete();
        return $this->successResponse(null, 'Infraction supprimée avec succès.');
    }
}
