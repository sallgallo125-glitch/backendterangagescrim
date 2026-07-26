<?php

namespace App\Http\Controllers\Api;

use App\Models\CategorieInfraction;
use App\Models\TypeInfraction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * Contrôleur pour la gestion des catégories et types d'infractions.
 */
class TypeInfractionController extends ApiController
{
    // ========== Catégories d'infractions ==========

    public function categories(): JsonResponse
    {
        $categories = CategorieInfraction::withCount('typeInfractions')->orderBy('nom')->get();
        return $this->successResponse($categories);
    }

    public function storeCategorie(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'required|string|max:255|unique:categorie_infractions,nom',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $categorie = CategorieInfraction::create($request->only('nom', 'description'));
        return $this->successResponse($categorie, 'Catégorie créée avec succès.', 201);
    }

    public function updateCategorie(Request $request, CategorieInfraction $categorie): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'sometimes|string|max:255|unique:categorie_infractions,nom,' . $categorie->id,
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $categorie->update($request->only('nom', 'description'));
        return $this->successResponse($categorie, 'Catégorie mise à jour.');
    }

    public function destroyCategorie(CategorieInfraction $categorie): JsonResponse
    {
        if ($categorie->typeInfractions()->exists()) {
            return $this->errorResponse('Impossible de supprimer : cette catégorie contient des types.', 409);
        }
        $categorie->delete();
        return $this->successResponse(null, 'Catégorie supprimée.');
    }

    // ========== Types d'infractions ==========

    public function index(Request $request): JsonResponse
    {
        $query = TypeInfraction::with('categorieInfraction');

        if ($request->has('categorie_infraction_id')) {
            $query->where('categorie_infraction_id', $request->categorie_infraction_id);
        }

        $types = $query->orderBy('nom')->get();
        return $this->successResponse($types);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'required|string|max:255',
            'categorie_infraction_id' => 'required|exists:categorie_infractions,id',
            'description' => 'nullable|string',
        ], [
            'nom.required' => 'Le nom du type est obligatoire.',
            'categorie_infraction_id.required' => 'La catégorie est obligatoire.',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $type = TypeInfraction::create($request->only('nom', 'categorie_infraction_id', 'description'));
        return $this->successResponse($type->load('categorieInfraction'), 'Type d\'infraction créé.', 201);
    }

    public function update(Request $request, TypeInfraction $typeInfraction): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nom' => 'sometimes|string|max:255',
            'categorie_infraction_id' => 'sometimes|exists:categorie_infractions,id',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $typeInfraction->update($request->only('nom', 'categorie_infraction_id', 'description'));
        return $this->successResponse($typeInfraction->load('categorieInfraction'), 'Type mis à jour.');
    }

    public function destroy(TypeInfraction $typeInfraction): JsonResponse
    {
        if ($typeInfraction->infractions()->exists()) {
            return $this->errorResponse('Impossible de supprimer : ce type est utilisé par des infractions.', 409);
        }
        $typeInfraction->delete();
        return $this->successResponse(null, 'Type supprimé.');
    }
}
