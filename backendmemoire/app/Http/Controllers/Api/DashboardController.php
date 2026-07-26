<?php

namespace App\Http\Controllers\Api;

use App\Models\Infraction;
use App\Models\Accident;
use App\Models\Personnel;
use App\Models\ImmigrationClandestine;
use App\Models\ServiceRemunere;
use App\Models\AmendePieceSaisie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Enums\ScopeType;
use OpenApi\Annotations as OA;

/**
 * Contrôleur pour le tableau de bord et les statistiques.
 * Fournit les KPIs et données agrégées pour les graphiques.
 */
class DashboardController extends ApiController
{
    /**
     * Applique les filtres geo (region_id, departement_id, commune_id, service_id)
     * et temporels (annee, mois) sur une query Eloquent de type Infraction.
     */
    private function applyInfractionFilters($query, Request $request)
    {
        $annee  = $request->get('annee');
        $mois   = $request->get('mois');
        $region = $request->get('region_id');
        $dept   = $request->get('departement_id');
        $commune= $request->get('commune_id');
        $svc    = $request->get('service_id');

        if ($annee)   $query->byAnnee($annee);
        if ($mois)    $query->whereMonth('date', (int)$mois);
        if ($svc)     $query->byService($svc);
        if ($commune) $query->byCommune($commune);
        if ($dept) {
            $query->whereHas('commune', fn($q) => $q->where('departement_id', $dept));
        }
        if ($region) {
            $query->whereHas('commune.departement', fn($q) => $q->where('region_id', $region));
        }
        return $query;
    }

    /**
     * Applique les filtres geo et temporels sur une query Accident.
     */
    private function applyAccidentFilters($query, Request $request)
    {
        $annee  = $request->get('annee');
        $mois   = $request->get('mois');
        $region = $request->get('region_id');
        $dept   = $request->get('departement_id');
        $commune= $request->get('commune_id');
        $svc    = $request->get('service_id');

        if ($annee)   $query->whereYear('date', $annee);
        if ($mois)    $query->whereMonth('date', (int)$mois);
        if ($svc)     $query->byService($svc);
        if ($commune) $query->byCommune($commune);
        if ($dept) {
            $query->whereHas('commune', fn($q) => $q->where('departement_id', $dept));
        }
        if ($region) {
            $query->whereHas('commune.departement', fn($q) => $q->where('region_id', $region));
        }
        return $query;
    }

    /**
     * Applique les filtres geo et temporels sur une query générique (Immigration, Amendes…).
     */
    private function applyGenericFilters($query, Request $request, bool $hasService = true)
    {
        $annee  = $request->get('annee');
        $mois   = $request->get('mois');
        $svc    = $request->get('service_id');

        if ($annee) $query->whereYear('date', $annee);
        if ($mois)  $query->whereMonth('date', (int)$mois);
        if ($svc && $hasService) $query->where('service_id', $svc);
        return $query;
    }

    /**
     * @OA\Get(
     *     path="/api/dashboard/stats",
     *     tags={"Dashboard"},
     *     summary="KPIs globaux du tableau de bord",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="annee",         in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="mois",          in="query", required=false, @OA\Schema(type="integer", minimum=1, maximum=12)),
     *     @OA\Parameter(name="region_id",     in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="departement_id",in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="commune_id",    in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="service_id",    in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Statistiques retournées")
     * )
     */
    public function stats(Request $request): JsonResponse
    {
        $infractions = $this->applyInfractionFilters(Infraction::visibleByUser(), $request);
        $accidents   = $this->applyAccidentFilters(Accident::visibleByUser(), $request);
        $immigration = $this->applyGenericFilters(ImmigrationClandestine::visibleByUser(), $request);
        $servRem     = $this->applyGenericFilters(ServiceRemunere::visibleByUser(), $request, false);
        $amendes     = $this->applyGenericFilters(AmendePieceSaisie::visibleByUser(), $request);

        $infractionStats = (clone $infractions)
            ->select('issue', DB::raw('COUNT(*) as total'))
            ->groupBy('issue')
            ->get()
            ->keyBy('issue');

        $accidentStats = (clone $accidents)
            ->select('type', DB::raw('COUNT(*) as total'))
            ->groupBy('type')
            ->get()
            ->keyBy('type');

        $amendeStats = (clone $amendes)
            ->select('type', DB::raw('SUM(montant) as total'))
            ->groupBy('type')
            ->get()
            ->keyBy('type');

        $data = [
            'total_infractions'        => $infractionStats->sum('total'),
            'infractions_constatees'   => $infractionStats->get('Constatée')?->total ?? 0,
            'infractions_deferees'     => $infractionStats->get('Déférée')?->total ?? 0,
            'total_accidents'          => $accidentStats->sum('total'),
            'accidents_mortels'        => $accidentStats->get('mortel')?->total ?? 0,
            'accidents_corporels'      => $accidentStats->get('corporel')?->total ?? 0,
            'accidents_materiels'      => $accidentStats->get('matériel')?->total ?? 0,
            'total_personnel'          => Personnel::visibleByUser()->byStatut('Actif')->count(),
            'total_immigration'        => (clone $immigration)->sum('nombre_interpellation'),
            'total_services_remuneres' => (clone $servRem)->sum('montant'),
            'total_amendes'            => $amendeStats->get('Amende')?->total ?? 0,
        ];

        return $this->successResponse($data, 'Statistiques globales.');
    }

    /**
     * @OA\Get(
     *     path="/api/dashboard/infractions-par-region",
     *     tags={"Dashboard"},
     *     summary="Infractions par région",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="annee", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="mois",  in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Infractions groupées par région")
     * )
     */
    public function infractionsParRegion(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'annee'          => 'nullable|integer|min:2000|max:2100',
                'mois'           => 'nullable|integer|min:1|max:12',
                'region_id'      => 'nullable|integer|min:1',
                'departement_id' => 'nullable|integer|min:1',
                'commune_id'     => 'nullable|integer|min:1',
                'service_id'     => 'nullable|integer|min:1',
            ]);

            $annee  = $request->integer('annee') ?: null;
            $mois   = $request->integer('mois') ?: null;
            $user   = auth()->user();

            $query = DB::table('infractions')
                ->join('communes',    'infractions.commune_id',       '=', 'communes.id')
                ->join('departements','communes.departement_id',       '=', 'departements.id')
                ->join('regions',     'departements.region_id',        '=', 'regions.id');

            if ($annee) $query->where('infractions.annee', $annee);

            if ($mois) {
                $query->whereMonth('infractions.date', $mois);
            }

            // Filtres geo frontend
            if ($request->filled('region_id'))     $query->where('regions.id',       (int)$request->region_id);
            if ($request->filled('departement_id'))$query->where('departements.id',  (int)$request->departement_id);
            if ($request->filled('commune_id'))    $query->where('communes.id',       (int)$request->commune_id);
            if ($request->filled('service_id'))    $query->where('infractions.service_id', (int)$request->service_id);

            // Scope territorial — null = admin/gestionnaire sans scope → accès total
            if ($user->read_scope_type !== null && $user->read_scope_type !== ScopeType::NATIONAL) {
                match ($user->read_scope_type) {
                    ScopeType::REGION      => $query->where('regions.id',       $user->read_scope_id),
                    ScopeType::DEPARTEMENT => $query->where('departements.id',  $user->read_scope_id),
                    ScopeType::COMMUNE     => $query->where('communes.id',      $user->read_scope_id),
                    ScopeType::SERVICE     => $query->where('infractions.service_id', $user->read_scope_id),
                    default                => null,
                };
            }

            $data = $query
                ->select('regions.nom as region', DB::raw('COUNT(*) as total'))
                ->groupBy('regions.nom')
                ->orderByDesc('total')
                ->get();

            return $this->successResponse($data);
        } catch (\Throwable $e) {
            \Log::error('infractionsParRegion error: ' . $e->getMessage());
            return $this->successResponse([]);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/dashboard/accidents-par-type",
     *     tags={"Dashboard"},
     *     summary="Accidents groupés par type",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="annee", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="mois",  in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Accidents par type")
     * )
     */
    public function accidentsParType(Request $request): JsonResponse
    {
        try {
            $query = $this->applyAccidentFilters(Accident::visibleByUser(), $request);

            $data = $query
                ->select('accidents.type', DB::raw('COUNT(*) as total'))
                ->groupBy('accidents.type')
                ->get();

            return $this->successResponse($data);
        } catch (\Throwable $e) {
            \Log::error('accidentsParType error: ' . $e->getMessage());
            return $this->successResponse([]);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/dashboard/tendances-mensuelles",
     *     tags={"Dashboard"},
     *     summary="Tendances mensuelles infractions et accidents",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="annee", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="mois",  in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Données mensuelles pour graphiques")
     * )
     */
    public function tendancesMensuelles(Request $request): JsonResponse
    {
        try {
            $mois  = $request->get('mois');
            $annee = $request->get('annee');
            $svcId = $request->get('service_id');

            // Sous-requêtes d'IDs (évite de matérialiser des milliers d'IDs en mémoire)
            $infSubquery = $this->applyInfractionFilters(Infraction::visibleByUser(), $request)->select('infractions.id')->getQuery();
            $accSubquery = $this->applyAccidentFilters(Accident::visibleByUser(), $request)->select('accidents.id')->getQuery();

            $immBase = ImmigrationClandestine::visibleByUser();
            if ($annee) $immBase->whereYear('date', $annee);
            if ($mois)  $immBase->whereMonth('date', (int)$mois);
            if ($svcId) $immBase->where('service_id', $svcId);
            $immSubquery = $immBase->select('immigrations_clandestines.id')->getQuery();

            if ($mois) {
                $infractions = DB::table('infractions')->whereIn('id', $infSubquery)
                    ->selectRaw((int)$mois . ' as mois, COUNT(*) as total')->get();
                $accidents = DB::table('accidents')->whereIn('id', $accSubquery)
                    ->selectRaw((int)$mois . ' as mois, COUNT(*) as total')->get();
                $immigration = DB::table('immigrations_clandestines')->whereIn('id', $immSubquery)
                    ->selectRaw((int)$mois . ' as mois, COALESCE(SUM(nombre_interpellation), 0) as total')->get();
            } else {
                $infractions = DB::table('infractions')->whereIn('id', $infSubquery)
                    ->selectRaw('EXTRACT(MONTH FROM date)::int as mois, COUNT(*) as total')
                    ->groupByRaw('EXTRACT(MONTH FROM date)::int')
                    ->orderBy('mois')->get();

                $accidents = DB::table('accidents')->whereIn('id', $accSubquery)
                    ->selectRaw('EXTRACT(MONTH FROM date)::int as mois, COUNT(*) as total')
                    ->groupByRaw('EXTRACT(MONTH FROM date)::int')
                    ->orderBy('mois')->get();

                $immigration = DB::table('immigrations_clandestines')->whereIn('id', $immSubquery)
                    ->selectRaw('EXTRACT(MONTH FROM date)::int as mois, COALESCE(SUM(nombre_interpellation), 0) as total')
                    ->groupByRaw('EXTRACT(MONTH FROM date)::int')
                    ->orderBy('mois')->get();
            }

            return $this->successResponse([
                'infractions' => $infractions,
                'accidents'   => $accidents,
                'immigration' => $immigration,
            ]);
        } catch (\Throwable $e) {
            \Log::error('tendancesMensuelles error: ' . $e->getMessage() . ' | ' . $e->getFile() . ':' . $e->getLine());
            return $this->successResponse(['infractions' => [], 'accidents' => [], 'immigration' => []]);
        }
    }

    /**
     * Infractions par catégorie (PieChart "Formes de criminalité").
     */
    public function infractionsParType(Request $request): JsonResponse
    {
        try {
            $annee  = $request->get('annee');
            $mois   = $request->get('mois');
            $user   = auth()->user();

            $query = DB::table('infractions')
                ->join('type_infractions',     'infractions.type_infraction_id',          '=', 'type_infractions.id')
                ->join('categorie_infractions','type_infractions.categorie_infraction_id', '=', 'categorie_infractions.id');

            if ($annee) $query->where('infractions.annee', $annee);

            if ($mois) {
                $query->whereMonth('infractions.date', (int)$mois);
            }

            if ($request->filled('region_id') || $request->filled('departement_id') || $request->filled('commune_id')) {
                $query->join('communes',    'infractions.commune_id',  '=', 'communes.id')
                      ->join('departements','communes.departement_id', '=', 'departements.id');
                if ($request->filled('region_id'))      $query->join('regions', 'departements.region_id', '=', 'regions.id')->where('regions.id', (int)$request->region_id);
                if ($request->filled('departement_id')) $query->where('departements.id', (int)$request->departement_id);
                if ($request->filled('commune_id'))     $query->where('communes.id',     (int)$request->commune_id);
            }
            if ($request->filled('service_id')) {
                $query->where('infractions.service_id', (int)$request->service_id);
            }

            if ($user->read_scope_type !== null && $user->read_scope_type !== ScopeType::NATIONAL) {
                if ($user->read_scope_type === ScopeType::SERVICE) {
                    $query->where('infractions.service_id', $user->read_scope_id);
                } else {
                    $query->whereIn('infractions.id', Infraction::visibleByUser()->select('infractions.id')->getQuery());
                }
            }

            $data = $query
                ->select('categorie_infractions.nom as categorie', 'type_infractions.nom as type', DB::raw('COUNT(*) as total'))
                ->groupBy('categorie_infractions.nom', 'type_infractions.nom')
                ->orderByDesc('total')
                ->get();

            return $this->successResponse($data);
        } catch (\Throwable $e) {
            \Log::error('infractionsParType error: ' . $e->getMessage());
            return $this->successResponse([]);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/dashboard/saisies-par-heure",
     *     tags={"Dashboard"},
     *     summary="Distribution des saisies par heure de la journée",
     *     description="Retourne pour chaque heure (0-23) le nombre de saisies enregistrées via created_at et via le champ heure. Utile pour identifier les pics d'activité terrain.",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="annee",      in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="mois",       in="query", required=false, @OA\Schema(type="integer", minimum=1, maximum=12)),
     *     @OA\Parameter(name="region_id",  in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="service_id", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Distribution horaire retournée")
     * )
     */
    public function saisiesParHeure(Request $request): JsonResponse
    {
        try {
            $annee  = $request->get('annee');
            $mois   = $request->get('mois');
            $svcId  = $request->get('service_id');

            $buildHourQuery = function ($query, string $table) use ($annee, $mois, $svcId) {
                if ($annee) $query->whereYear('created_at', $annee);
                if ($mois)  $query->whereMonth('created_at', (int)$mois);
                if ($svcId) $query->where('service_id', $svcId);
                return $query->select(
                    DB::raw('EXTRACT(HOUR FROM created_at)::int as heure'),
                    DB::raw('COUNT(*) as total')
                )->groupBy(DB::raw('EXTRACT(HOUR FROM created_at)::int'))
                 ->orderBy('heure');
            };

            $infraHeureSaisie = $buildHourQuery(Infraction::visibleByUser(), 'infractions')->get()->keyBy('heure');
            $accHeureSaisie   = $buildHourQuery(Accident::visibleByUser(), 'accidents')->get()->keyBy('heure');

            $infraHeureEvenement = $this->applyInfractionFilters(Infraction::visibleByUser(), $request)
                ->whereNotNull('heure')
                ->select(DB::raw("EXTRACT(HOUR FROM heure::time)::int as heure"), DB::raw('COUNT(*) as total'))
                ->groupBy(DB::raw("EXTRACT(HOUR FROM heure::time)::int"))
                ->orderBy('heure')
                ->get()->keyBy('heure');

            $accHeureEvenement = $this->applyAccidentFilters(Accident::visibleByUser(), $request)
                ->whereNotNull('heure')
                ->select(DB::raw("EXTRACT(HOUR FROM heure::time)::int as heure"), DB::raw('COUNT(*) as total'))
                ->groupBy(DB::raw("EXTRACT(HOUR FROM heure::time)::int"))
                ->orderBy('heure')
                ->get()->keyBy('heure');

            $heures = [];
            for ($h = 0; $h < 24; $h++) {
                $heures[] = [
                    'heure'                      => $h,
                    'infractions_saisies'        => $infraHeureSaisie->get($h)?->total ?? 0,
                    'accidents_saisis'           => $accHeureSaisie->get($h)?->total ?? 0,
                    'infractions_evenement'      => $infraHeureEvenement->get($h)?->total ?? 0,
                    'accidents_evenement'        => $accHeureEvenement->get($h)?->total ?? 0,
                ];
            }

            return $this->successResponse($heures, 'Distribution horaire des saisies.');
        } catch (\Throwable $e) {
            \Log::error('saisiesParHeure error: ' . $e->getMessage());
            return $this->successResponse([]);
        }
    }

    /**
     * Personnel actif par service (BarChart "Effectifs par commissariat").
     */
    public function personnelParService(Request $request): JsonResponse
    {
        try {
            $user  = auth()->user();
            $svc   = $request->get('service_id');
            $region= $request->get('region_id');

            $query = DB::table('personnels')
                ->join('services', 'personnels.service_id', '=', 'services.id')
                ->where('personnels.statut', 'Actif');

            if ($svc)    $query->where('personnels.service_id', $svc);
            if ($region) {
                $query->join('communes',    'services.commune_id',    '=', 'communes.id')
                      ->join('departements','communes.departement_id','=', 'departements.id')
                      ->where('departements.region_id', $region);
            }

            if ($user->read_scope_type !== null && $user->read_scope_type !== ScopeType::NATIONAL) {
                $query->whereIn('personnels.id', Personnel::visibleByUser()->select('personnels.id')->getQuery());
            }

            $data = $query
                ->select('services.nom as service', 'services.type', DB::raw('COUNT(*) as total'))
                ->groupBy('services.nom', 'services.type')
                ->orderByDesc('total')
                ->get();

            return $this->successResponse($data);
        } catch (\Throwable $e) {
            \Log::error('personnelParService error: ' . $e->getMessage());
            return $this->successResponse([]);
        }
    }
}
