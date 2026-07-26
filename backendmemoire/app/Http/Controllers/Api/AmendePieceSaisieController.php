<?php

namespace App\Http\Controllers\Api;

use App\Models\AmendePieceSaisie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AmendePieceSaisieController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = AmendePieceSaisie::with(['service', 'user'])->visibleByUser();
        if ($request->has('type')) $query->byType($request->type);
        if ($request->has('service_id')) $query->byService($request->service_id);
        if ($request->has('date_from') && $request->has('date_to')) $query->byDateRange($request->date_from, $request->date_to);

        return $this->paginatedResponse($query->orderByDesc('date')->paginate(min((int) $request->get('per_page', 15), 100)));
    }

    public function show(AmendePieceSaisie $amendePieceSaisie): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canRead(auth()->user(), $amendePieceSaisie)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        return $this->successResponse($amendePieceSaisie->load(['service', 'user']));
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:Amende,Pièce saisie',
            'service_id' => 'required|exists:services,id',
            'commune_id' => 'nullable|exists:communes,id',
            'date' => 'required|date',
            'heure' => 'nullable|date_format:H:i',
            'montant' => 'required|numeric|min:0',
            'description' => 'nullable|string',
        ]);
        if ($validator->fails()) return $this->errorResponse('Erreur de validation', 422, $validator->errors());

        $data = $request->only(['type', 'service_id', 'commune_id', 'date', 'heure', 'lieu', 'montant', 'description', 'plaque_immatriculation', 'local_id', 'workflow_status']);
        $data['user_id'] = auth()->id();
        $amende = AmendePieceSaisie::create($data);
        return $this->successResponse($amende->load('service'), 'Enregistré avec succès.', 201);
    }

    public function update(Request $request, AmendePieceSaisie $amendePieceSaisie): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canWrite(auth()->user(), $amendePieceSaisie)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        $secondsSinceCreation = $amendePieceSaisie->created_at->diffInSeconds(now());
        if ($secondsSinceCreation > 60 && !auth()->user()->hasRole('administrateur')) {
            return $this->errorResponse('Modification interdite : le délai réglementaire de 1 minute est dépassé.', 403);
        }
        $validator = Validator::make($request->all(), [
            'type'        => 'sometimes|in:Amende,Pièce saisie',
            'service_id'  => 'sometimes|exists:services,id',
            'date'        => 'sometimes|date',
            'heure'       => 'nullable|date_format:H:i',
            'montant'     => 'sometimes|numeric|min:0',
            'description' => 'nullable|string',
        ]);
        if ($validator->fails()) return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        $amendePieceSaisie->update($request->only(['type', 'service_id', 'date', 'heure', 'lieu', 'montant', 'description', 'plaque_immatriculation', 'workflow_status']));
        return $this->successResponse($amendePieceSaisie->load('service'), 'Mis à jour.');
    }

    public function destroy(AmendePieceSaisie $amendePieceSaisie): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canWrite(auth()->user(), $amendePieceSaisie)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        $amendePieceSaisie->delete();
        return $this->successResponse(null, 'Supprimé.');
    }
}
