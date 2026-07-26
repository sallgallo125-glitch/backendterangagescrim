<?php

namespace App\Http\Controllers\Api;

use App\Models\Personnel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Contrôleur CRUD pour le personnel de la DSP.
 */
class PersonnelController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Personnel::with('service.commune')->visibleByUser();

        if ($request->has('search')) {
            $query->search($request->search);
        }
        if ($request->has('statut')) {
            $query->byStatut($request->statut);
        }
        if ($request->has('service_id')) {
            $query->byService($request->service_id);
        }
        if ($request->has('grade')) {
            $query->byGrade($request->grade);
        }

        $personnels = $query->orderBy('nom')
            ->paginate(min((int) $request->get('per_page', 15), 100));

        return $this->paginatedResponse($personnels);
    }

    public function show(Personnel $personnel): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canRead(auth()->user(), $personnel)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        $personnel->load(['service.commune.departement.region', 'user', 'media']);
        return $this->successResponse($personnel);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'ccap' => 'required|string|max:50|unique:personnels,ccap',
            'prenom' => 'required|string|max:255',
            'nom' => 'required|string|max:255',
            'grade' => 'nullable|string|max:100',
            'telephone' => 'nullable|string|max:20',
            'anciennete' => 'nullable|integer|min:0',
            'date_entree_corps' => 'nullable|date',
            'sexe' => 'required|in:M,F',
            'situation_matrimoniale' => 'nullable|string|max:50',
            'date_naissance' => 'nullable|date|before:today',
            'lieu_naissance' => 'nullable|string|max:255',
            'service_id' => 'required|exists:services,id',
            'statut' => 'nullable|in:Actif,Inactif,Mission',
            'sanction' => 'nullable|string',
        ], [
            'ccap.required' => 'Le CCAP est obligatoire.',
            'ccap.unique' => 'Ce CCAP existe déjà.',
            'prenom.required' => 'Le prénom est obligatoire.',
            'nom.required' => 'Le nom est obligatoire.',
            'sexe.required' => 'Le sexe est obligatoire.',
            'service_id.required' => 'Le service est obligatoire.',
            'service_id.exists' => 'Le service sélectionné n\'existe pas.',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $personnel = DB::transaction(fn() => Personnel::create(array_merge(
            $request->only([
                'ccap', 'prenom', 'nom', 'grade', 'telephone', 'anciennete',
                'date_entree_corps', 'sexe', 'situation_matrimoniale',
                'date_naissance', 'lieu_naissance', 'service_id', 'statut', 'sanction',
            ]),
            ['user_id' => auth()->id()]
        )));

        return $this->successResponse($personnel->load('service'), 'Personnel créé avec succès.', 201);
    }

    public function update(Request $request, Personnel $personnel): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canWrite(auth()->user(), $personnel)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        $validator = Validator::make($request->all(), [
            'ccap' => 'sometimes|string|max:50|unique:personnels,ccap,' . $personnel->id,
            'prenom' => 'sometimes|string|max:255',
            'nom' => 'sometimes|string|max:255',
            'grade' => 'nullable|string|max:100',
            'telephone' => 'nullable|string|max:20',
            'anciennete' => 'nullable|integer|min:0',
            'date_entree_corps' => 'nullable|date',
            'sexe' => 'sometimes|in:M,F',
            'situation_matrimoniale' => 'nullable|string|max:50',
            'date_naissance' => 'nullable|date|before:today',
            'lieu_naissance' => 'nullable|string|max:255',
            'service_id' => 'sometimes|exists:services,id',
            'statut' => 'sometimes|in:Actif,Inactif,Mission',
            'sanction' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $personnel->update($request->only([
            'ccap', 'prenom', 'nom', 'grade', 'telephone', 'anciennete',
            'date_entree_corps', 'sexe', 'situation_matrimoniale',
            'date_naissance', 'lieu_naissance', 'service_id', 'statut', 'sanction',
        ]));

        return $this->successResponse($personnel->load('service'), 'Personnel mis à jour avec succès.');
    }

    public function destroy(Personnel $personnel): JsonResponse
    {
        $scopeService = app(\App\Services\ScopeAccessService::class);
        if (!$scopeService->canWrite(auth()->user(), $personnel)) {
            return $this->errorResponse('Accès territorial refusé.', 403);
        }
        $personnel->delete();
        return $this->successResponse(null, 'Personnel supprimé avec succès.');
    }
}
