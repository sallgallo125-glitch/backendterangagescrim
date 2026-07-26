<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;
use OpenApi\Annotations as OA;

/**
 * @OA\Info(
 *     title="Teranga GESCRIM API",
 *     version="1.0.0",
 *     description="API REST pour le système de Gestion de la Criminalité et de la Délinquance — Direction de la Sécurité Publique (DSP) du Sénégal.",
 *     @OA\Contact(email="admin@gescrim.sn", name="NAMASTECH"),
 *     @OA\License(name="Propriétaire", url="https://gescrim.sn")
 * )
 *
 * @OA\Server(url=L5_SWAGGER_CONST_HOST, description="Serveur de développement")
 *
 * @OA\SecurityScheme(
 *     securityScheme="bearerAuth",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     description="Token JWT obtenu via POST /api/auth/login"
 * )
 *
 * @OA\Tag(name="Authentification", description="Connexion, déconnexion et gestion du token JWT")
 * @OA\Tag(name="Régions", description="Gestion des régions administratives")
 * @OA\Tag(name="Départements", description="Gestion des départements")
 * @OA\Tag(name="Communes", description="Gestion des communes")
 * @OA\Tag(name="Services DSP", description="Services de la DSP")
 * @OA\Tag(name="Personnel", description="Personnel de la DSP")
 * @OA\Tag(name="Types Infractions", description="Catégories et types d'infractions")
 * @OA\Tag(name="Infractions", description="Saisie et gestion des infractions")
 * @OA\Tag(name="Accidents", description="Accidents de la circulation")
 * @OA\Tag(name="Victimes", description="Victimes et impliqués")
 * @OA\Tag(name="Services Rémunérés", description="Services rémunérés")
 * @OA\Tag(name="Amendes & Pièces Saisies", description="Amendes et pièces")
 * @OA\Tag(name="Immigration Clandestine", description="Immigration clandestine")
 * @OA\Tag(name="Dashboard", description="Statistiques et KPIs")
 * @OA\Tag(name="Export", description="Export et Import")
 * @OA\Tag(name="Synchronisation", description="Synchronisation offline")
 * @OA\Tag(name="Audit", description="Journal d'audit")
 *
 * @OA\Schema(
 *     schema="SuccessResponse",
 *     type="object",
 *     @OA\Property(property="success", type="boolean", example=true),
 *     @OA\Property(property="message", type="string", example="Opération réussie"),
 *     @OA\Property(property="data", type="object", nullable=true)
 * )
 *
 * @OA\Schema(
 *     schema="ErrorResponse",
 *     type="object",
 *     @OA\Property(property="success", type="boolean", example=false),
 *     @OA\Property(property="message", type="string", example="Erreur rencontrée"),
 *     @OA\Property(property="errors", type="object", nullable=true)
 * )
 *
 * @OA\Schema(
 *     schema="Infraction",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="type_infraction_id", type="integer", example=1),
 *     @OA\Property(property="service_id", type="integer", example=1),
 *     @OA\Property(property="annee", type="integer", example=2026),
 *     @OA\Property(property="date", type="string", format="date", example="2026-05-17"),
 *     @OA\Property(property="lieu", type="string", example="Sandaga, Dakar"),
 *     @OA\Property(property="commune_id", type="integer", example=1),
 *     @OA\Property(property="issue", type="string", example="Constatée"),
 *     @OA\Property(property="latitude", type="number", format="float", example=14.6928),
 *     @OA\Property(property="longitude", type="number", format="float", example=-17.4467),
 *     @OA\Property(property="description", type="string", example="Usage de téléphone au volant constaté lors d'un contrôle."),
 *     @OA\Property(property="sync_status", type="string", example="synced")
 * )
 *
 * @OA\Schema(
 *     schema="Accident",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="type", type="string", example="corporel"),
 *     @OA\Property(property="date", type="string", format="date", example="2026-05-17"),
 *     @OA\Property(property="lieu", type="string", example="Vdn, Dakar"),
 *     @OA\Property(property="commune_id", type="integer", example=1),
 *     @OA\Property(property="service_id", type="integer", example=1),
 *     @OA\Property(property="moyen", type="string", example="Scooter vs Voiture"),
 *     @OA\Property(property="cause_probable", type="string", example="Non respect de la priorité"),
 *     @OA\Property(property="latitude", type="number", format="float", example=14.7228),
 *     @OA\Property(property="longitude", type="number", format="float", example=-17.4567),
 *     @OA\Property(property="description", type="string", example="Accident corporel léger.")
 * )
 *
 * @OA\Schema(
 *     schema="ImmigrationClandestine",
 *     type="object",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="nombre_interpellation", type="integer", example=45),
 *     @OA\Property(property="date", type="string", format="date", example="2026-05-17"),
 *     @OA\Property(property="service_id", type="integer", example=1),
 *     @OA\Property(property="nombre_hommes", type="integer", example=30),
 *     @OA\Property(property="nombre_femmes", type="integer", example=10),
 *     @OA\Property(property="nombre_enfants", type="integer", example=5),
 *     @OA\Property(property="nombre_maries", type="integer", example=15),
 *     @OA\Property(property="nombre_celibataires", type="integer", example=30),
 *     @OA\Property(property="nombre_senegalais", type="integer", example=35),
 *     @OA\Property(property="nombre_etrangers", type="integer", example=10),
 *     @OA\Property(property="zone_depart", type="string", example="Mbour"),
 *     @OA\Property(property="zone_depart_lat", type="number", format="float", example=14.4128),
 *     @OA\Property(property="zone_depart_lng", type="number", format="float", example=-16.9667),
 *     @OA\Property(property="zone_arrivee_prevue", type="string", example="Iles Canaries"),
 *     @OA\Property(property="zone_arrivee_lat", type="number", format="float", example=28.2916),
 *     @OA\Property(property="zone_arrivee_lng", type="number", format="float", example=-16.6291)
 * )
 *
 * Contrôleur de base pour l'API.
 * Fournit des méthodes utilitaires pour formater les réponses JSON standardisées.
 */
class ApiController extends BaseController
{
    /**
     * Retourner une réponse de succès
     */
    protected function successResponse($data = null, string $message = 'Opération réussie', int $code = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $code);
    }

    /**
     * Retourner une réponse d'erreur
     */
    protected function errorResponse(string $message = 'Erreur', int $code = 400, $errors = null): JsonResponse
    {
        $response = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $code);
    }

    /**
     * Retourner une réponse paginée
     */
    protected function paginatedResponse($paginator, string $message = 'Données récupérées'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ]);
    }
}
