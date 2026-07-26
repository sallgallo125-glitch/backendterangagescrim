<?php

namespace App\Http\Controllers\Api;

use App\Models\ServiceRemunere;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ServiceRemunereController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = ServiceRemunere::with(['service', 'user'])->visibleByUser();
        if ($request->has('service_id')) $query->byService($request->service_id);
        if ($request->has('date_from') && $request->has('date_to')) $query->byDateRange($request->date_from, $request->date_to);

        return $this->paginatedResponse($query->orderByDesc('date')->paginate(min((int) $request->get('per_page', 15), 100)));
    }

    public function show(ServiceRemunere $serviceRemunere): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canRead(auth()->user(), $serviceRemunere)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        return $this->successResponse($serviceRemunere->load(['service', 'user']));
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'libelle' => 'required|string|max:255',
            'service_id' => 'required|exists:services,id',
            'commune_id' => 'nullable|exists:communes,id',
            'date' => 'required|date',
            'heure' => 'nullable|date_format:H:i',
            'montant' => 'required|numeric|min:0',
            'description' => 'nullable|string',
        ]);
        if ($validator->fails()) return $this->errorResponse('Erreur de validation', 422, $validator->errors());

        $data = $request->only(['libelle', 'service_id', 'commune_id', 'date', 'heure', 'montant', 'description', 'local_id', 'workflow_status']);
        $data['user_id'] = auth()->id();
        $sr = ServiceRemunere::create($data);
        return $this->successResponse($sr->load('service'), 'Service rémunéré enregistré.', 201);
    }

    public function update(Request $request, ServiceRemunere $serviceRemunere): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canWrite(auth()->user(), $serviceRemunere)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        $secondsSinceCreation = $serviceRemunere->created_at->diffInSeconds(now());
        if ($secondsSinceCreation > 60 && !auth()->user()->hasRole('administrateur')) {
            return $this->errorResponse('Modification interdite : le délai réglementaire de 1 minute est dépassé.', 403);
        }
        $validator = Validator::make($request->all(), [
            'libelle'     => 'sometimes|string|max:255',
            'service_id'  => 'sometimes|exists:services,id',
            'date'        => 'sometimes|date',
            'heure'       => 'nullable|date_format:H:i',
            'montant'     => 'sometimes|numeric|min:0',
            'description' => 'nullable|string',
        ]);
        if ($validator->fails()) return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        $serviceRemunere->update($request->only(['libelle', 'service_id', 'date', 'heure', 'montant', 'description', 'workflow_status']));
        return $this->successResponse($serviceRemunere->load('service'), 'Mis à jour.');
    }

    public function destroy(ServiceRemunere $serviceRemunere): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canWrite(auth()->user(), $serviceRemunere)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        $serviceRemunere->delete();
        return $this->successResponse(null, 'Supprimé.');
    }
}
