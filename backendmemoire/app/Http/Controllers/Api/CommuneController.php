<?php

namespace App\Http\Controllers\Api;

use App\Models\Commune;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * Contrôleur CRUD pour les communes.
 */
class CommuneController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Commune::with('departement.region');

        if ($request->has('search')) {
            $query->search($request->search);
        }
        if ($request->has('departement_id')) {
            $query->byDepartement($request->departement_id);
        }

        $communes = $query->withCount('services')
            ->orderBy('nom')
            ->paginate(min((int) $request->get('per_page', 15), 100));

        return $this->paginatedResponse($communes);
    }

    public function all(Request $request): JsonResponse
    {
        $query = Commune::with('departement.region')->orderBy('nom');
        if ($request->has('departement_id')) {
            $query->byDepartement($request->departement_id);
        }
        if ($request->has('region_id')) {
            $query->whereHas('departement', fn($q) => $q->where('region_id', $request->region_id));
        }
        return $this->successResponse($query->get());
    }

    public function show(Commune $commune): JsonResponse
    {
        $commune->load(['departement.region', 'services']);
        return $this->successResponse($commune);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'required|string|max:255',
            'code' => 'nullable|string|max:10|unique:communes,code',
            'departement_id' => 'required|exists:departements,id',
        ], [
            'nom.required' => 'Le nom de la commune est obligatoire.',
            'departement_id.exists' => 'Le département sélectionné n\'existe pas.',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $commune = Commune::create($request->only('nom', 'code', 'departement_id'));

        return $this->successResponse($commune->load('departement'), 'Commune créée avec succès.', 201);
    }

    public function update(Request $request, Commune $commune): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'sometimes|string|max:255',
            'code' => 'nullable|string|max:10|unique:communes,code,' . $commune->id,
            'departement_id' => 'sometimes|exists:departements,id',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $commune->update($request->only('nom', 'code', 'departement_id'));

        return $this->successResponse($commune->load('departement'), 'Commune mise à jour avec succès.');
    }

    public function destroy(Commune $commune): JsonResponse
    {
        if ($commune->services()->exists()) {
            return $this->errorResponse('Impossible de supprimer : cette commune contient des services.', 409);
        }

        $commune->delete();
        return $this->successResponse(null, 'Commune supprimée avec succès.');
    }
}
