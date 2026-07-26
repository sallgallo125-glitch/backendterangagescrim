<?php

namespace App\Http\Controllers\Api;

use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * Contrôleur CRUD pour les services de la DSP.
 */
class ServiceController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Service::with('commune.departement.region')->visibleByUser();

        if ($request->has('search')) {
            $query->search($request->search);
        }
        if ($request->has('type')) {
            $query->byType($request->type);
        }
        if ($request->has('commune_id')) {
            $query->byCommune($request->commune_id);
        }

        $services = $query->withCount('personnels')
            ->orderBy('nom')
            ->paginate(min((int) $request->get('per_page', 15), 100));

        return $this->paginatedResponse($services);
    }

    public function all(Request $request): JsonResponse
    {
        $query = Service::with('commune.departement.region')->visibleByUser()->orderBy('nom');
        if ($request->has('type')) {
            $query->byType($request->type);
        }
        if ($request->has('commune_id')) {
            $query->byCommune($request->commune_id);
        }
        return $this->successResponse($query->get());
    }

    public function show(Service $service): JsonResponse
    {
        $service->load(['commune.departement.region', 'personnels']);
        $service->loadCount(['personnels', 'infractions', 'accidents']);
        return $this->successResponse($service);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nom'               => 'required|string|max:255',
            'type'              => 'required|in:CC,CA,PP,CU,CS',
            'commune_id'        => 'required|exists:communes,id',
            'adresse'           => 'nullable|string|max:500',
            'telephone'         => 'nullable|string|max:20',
            'email'             => 'nullable|email|max:255',
            'latitude'          => 'nullable|numeric|between:-90,90',
            'longitude'         => 'nullable|numeric|between:-180,180',
            'gere_immigration'  => 'boolean',
        ], [
            'nom.required'      => 'Le nom du service est obligatoire.',
            'type.in'           => 'Le type doit être CC, CA, PP, CU ou CS.',
            'commune_id.exists' => 'La commune sélectionnée n\'existe pas.',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $service = Service::create($request->only('nom', 'type', 'commune_id', 'adresse', 'telephone', 'email', 'latitude', 'longitude', 'gere_immigration'));

        return $this->successResponse($service->load('commune'), 'Service créé avec succès.', 201);
    }

    public function update(Request $request, Service $service): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nom'               => 'sometimes|string|max:255',
            'type'              => 'sometimes|in:CC,CA,PP,CU,CS',
            'commune_id'        => 'sometimes|exists:communes,id',
            'adresse'           => 'nullable|string|max:500',
            'telephone'         => 'nullable|string|max:20',
            'email'             => 'nullable|email|max:255',
            'latitude'          => 'nullable|numeric|between:-90,90',
            'longitude'         => 'nullable|numeric|between:-180,180',
            'gere_immigration'  => 'boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $service->update($request->only('nom', 'type', 'commune_id', 'adresse', 'telephone', 'email', 'latitude', 'longitude', 'gere_immigration'));

        return $this->successResponse($service->load('commune'), 'Service mis à jour avec succès.');
    }

    public function destroy(Service $service): JsonResponse
    {
        if ($service->personnels()->exists()) {
            return $this->errorResponse('Impossible de supprimer : ce service contient du personnel.', 409);
        }

        $service->delete();
        return $this->successResponse(null, 'Service supprimé avec succès.');
    }
}
