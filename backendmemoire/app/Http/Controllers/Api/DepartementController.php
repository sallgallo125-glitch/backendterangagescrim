<?php

namespace App\Http\Controllers\Api;

use App\Models\Departement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * Contrôleur CRUD pour les départements.
 */
class DepartementController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Departement::with('region');

        if ($request->has('search')) {
            $query->search($request->search);
        }
        if ($request->has('region_id')) {
            $query->byRegion($request->region_id);
        }

        $departements = $query->withCount('communes')
            ->orderBy('nom')
            ->paginate(min((int) $request->get('per_page', 15), 100));

        return $this->paginatedResponse($departements);
    }

    public function all(Request $request): JsonResponse
    {
        $query = Departement::with('region')->orderBy('nom');
        if ($request->has('region_id')) {
            $query->byRegion($request->region_id);
        }
        return $this->successResponse($query->get());
    }

    public function show(Departement $departement): JsonResponse
    {
        $departement->load(['region', 'communes']);
        return $this->successResponse($departement);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'required|string|max:255',
            'code' => 'required|string|max:10|unique:departements,code',
            'region_id' => 'required|exists:regions,id',
        ], [
            'nom.required' => 'Le nom du département est obligatoire.',
            'code.unique' => 'Ce code existe déjà.',
            'region_id.exists' => 'La région sélectionnée n\'existe pas.',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $departement = Departement::create($request->only('nom', 'code', 'region_id'));

        return $this->successResponse($departement->load('region'), 'Département créé avec succès.', 201);
    }

    public function update(Request $request, Departement $departement): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:10|unique:departements,code,' . $departement->id,
            'region_id' => 'sometimes|exists:regions,id',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $departement->update($request->only('nom', 'code', 'region_id'));

        return $this->successResponse($departement->load('region'), 'Département mis à jour avec succès.');
    }

    public function destroy(Departement $departement): JsonResponse
    {
        if ($departement->communes()->exists()) {
            return $this->errorResponse('Impossible de supprimer : ce département contient des communes.', 409);
        }

        $departement->delete();
        return $this->successResponse(null, 'Département supprimé avec succès.');
    }
}
