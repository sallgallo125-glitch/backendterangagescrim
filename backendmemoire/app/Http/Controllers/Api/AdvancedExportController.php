<?php

namespace App\Http\Controllers\Api;

use App\Models\Accident;
use App\Models\Infraction;
use App\Models\ImmigrationClandestine;
use App\Models\AmendePieceSaisie;
use App\Models\Personnel;
use App\Models\Victime;
use App\Models\ServiceRemunere;
use App\Models\AuditLog;
use App\Services\Export\DateFilterService;
use App\Services\Export\PDFExportService;
use App\Services\Export\ExcelExportService;
use App\Services\Export\WordExportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdvancedExportController extends ApiController
{
    public function __construct(
        private DateFilterService  $dateFilter,
        private PDFExportService   $pdfService,
        private ExcelExportService $excelService,
        private WordExportService  $wordService,
    ) {}

    private function prepareExportEnvironment(): void
    {
        ini_set('memory_limit', '512M');
        set_time_limit(120);
        error_reporting(error_reporting() & ~E_DEPRECATED);
    }

    // POST /api/accidents/export
    public function accidents(Request $request)
    {
        $this->prepareExportEnvironment();
        $request->validate([
            'format'          => 'required|in:pdf,word,excel',
            'periodType'      => 'required|string',
            'month'           => 'nullable|integer|min:1|max:12',
            'year'            => 'nullable|integer|min:2000|max:2100',
            'start_date'      => 'nullable|date',
            'end_date'        => 'nullable|date|after_or_equal:start_date',
            'region_id'       => 'nullable|integer',
            'departement_id'  => 'nullable|integer',
            'commune_id'      => 'nullable|integer',
        ]);
        if (!$this->checkExportPermission($request->format)) {
            return $this->errorResponse('Permission insuffisante pour ce format d\'export.', 403);
        }

        [$from, $to] = $this->dateFilter->resolve($request->periodType, $request->all());
        $periodLabel  = $this->dateFilter->label($request->periodType, $request->all());

        $query = Accident::with(['service', 'commune.departement.region', 'victimes'])->visibleByUser();
        $this->applyDateRange($query, $from, $to);
        $this->applyGeoFilters($query, $request);
        $accidents = $query->orderBy('date')->orderBy('created_at')->get();

        $this->logExport('accidents', $request->format, $periodLabel, $accidents->count());

        return match ($request->format) {
            'pdf'   => $this->pdfService->generate('exports.advanced.accidents', [
                'records'        => $accidents,
                'titre'          => 'Rapport des Accidents de Circulation',
                'date_generation'=> now()->format('d/m/Y H:i'),
                'agent'          => Auth::user()?->name ?? 'Inconnu',
                'period_label'   => $periodLabel,
            ], 'accidents'),

            'excel' => $this->excelService->downloadAnaserAccidents(
                $accidents,
                $periodLabel,
                Auth::user()?->name ?? 'Inconnu'
            ),

            'word' => $this->wordService->downloadAccidents($accidents, $periodLabel, Auth::user()?->name ?? 'Inconnu'),
        };
    }

    // POST /api/infractions/export
    public function infractions(Request $request)
    {
        $this->prepareExportEnvironment();
        $request->validate([
            'format'         => 'required|in:pdf,word,excel',
            'periodType'     => 'required|string',
            'month'          => 'nullable|integer|min:1|max:12',
            'year'           => 'nullable|integer|min:2000|max:2100',
            'start_date'     => 'nullable|date',
            'end_date'       => 'nullable|date|after_or_equal:start_date',
            'region_id'      => 'nullable|integer',
            'departement_id' => 'nullable|integer',
            'commune_id'     => 'nullable|integer',
        ]);
        if (!$this->checkExportPermission($request->format)) {
            return $this->errorResponse('Permission insuffisante pour ce format d\'export.', 403);
        }

        [$from, $to] = $this->dateFilter->resolve($request->periodType, $request->all());
        $periodLabel  = $this->dateFilter->label($request->periodType, $request->all());

        $query = Infraction::with(['typeInfraction.categorieInfraction', 'service', 'commune.departement.region'])->visibleByUser();
        $this->applyDateRange($query, $from, $to);
        $this->applyGeoFilters($query, $request);
        $infractions = $query->orderBy('date')->orderBy('created_at')->get();

        $this->logExport('infractions', $request->format, $periodLabel, $infractions->count());

        return match ($request->format) {
            'pdf'   => $this->pdfService->generate('exports.advanced.infractions', [
                'records'        => $infractions,
                'titre'          => 'Rapport des Infractions',
                'date_generation'=> now()->format('d/m/Y H:i'),
                'agent'          => Auth::user()?->name ?? 'Inconnu',
                'period_label'   => $periodLabel,
            ], 'infractions'),

            'excel' => $this->excelService->downloadAnaserInfractions(
                $infractions,
                $periodLabel,
                Auth::user()?->name ?? 'Inconnu'
            ),

            'word' => $this->wordService->downloadInfractions($infractions, $periodLabel, Auth::user()?->name ?? 'Inconnu'),
        };
    }

    // POST /api/immigrations/export
    public function immigrations(Request $request)
    {
        $this->prepareExportEnvironment();
        $request->validate([
            'format'         => 'required|in:pdf,word,excel',
            'periodType'     => 'required|string',
            'month'          => 'nullable|integer|min:1|max:12',
            'year'           => 'nullable|integer|min:2000|max:2100',
            'start_date'     => 'nullable|date',
            'end_date'       => 'nullable|date|after_or_equal:start_date',
            'region_id'      => 'nullable|integer',
            'departement_id' => 'nullable|integer',
            'commune_id'     => 'nullable|integer',
        ]);
        if (!$this->checkExportPermission($request->format)) {
            return $this->errorResponse('Permission insuffisante pour ce format d\'export.', 403);
        }

        [$from, $to] = $this->dateFilter->resolve($request->periodType, $request->all());
        $periodLabel  = $this->dateFilter->label($request->periodType, $request->all());

        $query = ImmigrationClandestine::with(['service'])->visibleByUser();
        $this->applyDateRange($query, $from, $to);
        $this->applyGeoFiltersViaService($query, $request);
        $records = $query->orderBy('date')->orderBy('created_at')->get();

        $this->logExport('immigrations', $request->format, $periodLabel, $records->count());

        return match ($request->format) {
            'pdf'   => $this->pdfService->generate('exports.advanced.immigrations', [
                'records'        => $records,
                'titre'          => 'Rapport des Immigrations Clandestines',
                'date_generation'=> now()->format('d/m/Y H:i'),
                'agent'          => Auth::user()?->name ?? 'Inconnu',
                'period_label'   => $periodLabel,
            ], 'immigrations'),

            'excel' => $this->excelService->downloadAnaserImmigrations(
                $records,
                $periodLabel,
                Auth::user()?->name ?? 'Inconnu'
            ),

            'word' => $this->wordService->downloadImmigrations($records, $periodLabel, Auth::user()?->name ?? 'Inconnu'),
        };
    }

    public function amendes(Request $request)
    {
        $this->prepareExportEnvironment();
        $request->validate([
            'format'         => 'required|in:pdf,word,excel',
            'periodType'     => 'required|string',
            'month'          => 'nullable|integer|min:1|max:12',
            'year'           => 'nullable|integer|min:2000|max:2100',
            'start_date'     => 'nullable|date',
            'end_date'       => 'nullable|date|after_or_equal:start_date',
            'region_id'      => 'nullable|integer',
            'departement_id' => 'nullable|integer',
            'commune_id'     => 'nullable|integer',
        ]);
        if (!$this->checkExportPermission($request->format)) {
            return $this->errorResponse('Permission insuffisante pour ce format d\'export.', 403);
        }

        [$from, $to] = $this->dateFilter->resolve($request->periodType, $request->all());
        $periodLabel  = $this->dateFilter->label($request->periodType, $request->all());

        $query = AmendePieceSaisie::with(['service', 'commune.departement.region'])->visibleByUser();
        $this->applyDateRange($query, $from, $to);
        $this->applyGeoFilters($query, $request);
        $records = $query->orderBy('date')->orderBy('created_at')->get();

        $this->logExport('amendes', $request->format, $periodLabel, $records->count());

        return match ($request->format) {
            'pdf'   => $this->pdfService->generate('exports.advanced.amendes', [
                'records'        => $records,
                'titre'          => 'Rapport des Amendes & Pièces Saisies',
                'date_generation'=> now()->format('d/m/Y H:i'),
                'agent'          => Auth::user()?->name ?? 'Inconnu',
                'period_label'   => $periodLabel,
            ], 'amendes'),

            'excel' => $this->excelService->downloadAnaserAmendes(
                $records,
                $periodLabel,
                Auth::user()?->name ?? 'Inconnu'
            ),

            'word' => $this->wordService->downloadAmendes($records, $periodLabel, Auth::user()?->name ?? 'Inconnu'),
        };
    }

    // POST /api/personnels/export
    public function personnels(Request $request)
    {
        $this->prepareExportEnvironment();
        $request->validate([
            'format'         => 'required|in:pdf,word,excel',
            'periodType'     => 'required|string',
            'month'          => 'nullable|integer|min:1|max:12',
            'year'           => 'nullable|integer|min:2000|max:2100',
            'start_date'     => 'nullable|date',
            'end_date'       => 'nullable|date|after_or_equal:start_date',
            'region_id'      => 'nullable|integer',
            'departement_id' => 'nullable|integer',
            'commune_id'     => 'nullable|integer',
        ]);
        if (!$this->checkExportPermission($request->format)) {
            return $this->errorResponse('Permission insuffisante pour ce format d\'export.', 403);
        }

        [$from, $to] = $this->dateFilter->resolve($request->periodType, $request->all());
        $periodLabel  = $this->dateFilter->label($request->periodType, $request->all());

        $query = Personnel::with(['service.commune.departement.region'])->visibleByUser();
        if ($from) $query->where('date_entree_corps', '>=', $from);
        if ($to)   $query->where('date_entree_corps', '<=', $to);
        $this->applyGeoFiltersViaService($query, $request);
        $records = $query->orderBy('nom')->get();

        $this->logExport('personnels', $request->format, $periodLabel, $records->count());

        return match ($request->format) {
            'pdf'   => $this->pdfService->generate('exports.advanced.personnels', [
                'records'        => $records,
                'titre'          => 'Rapport du Personnel DSP',
                'date_generation'=> now()->format('d/m/Y H:i'),
                'agent'          => Auth::user()?->name ?? 'Inconnu',
                'period_label'   => $periodLabel,
            ], 'personnels'),

            'excel' => $this->excelService->downloadAnaserPersonnel(
                $records,
                $periodLabel,
                Auth::user()?->name ?? 'Inconnu'
            ),

            'word' => $this->wordService->downloadPersonnels($records, $periodLabel, Auth::user()?->name ?? 'Inconnu'),
        };
    }

    // POST /api/victimes/export
    public function victimes(Request $request)
    {
        $this->prepareExportEnvironment();
        $request->validate([
            'format'         => 'required|in:pdf,word,excel',
            'periodType'     => 'required|string',
            'month'          => 'nullable|integer|min:1|max:12',
            'year'           => 'nullable|integer|min:2000|max:2100',
            'start_date'     => 'nullable|date',
            'end_date'       => 'nullable|date|after_or_equal:start_date',
            'region_id'      => 'nullable|integer',
            'departement_id' => 'nullable|integer',
            'commune_id'     => 'nullable|integer',
        ]);
        if (!$this->checkExportPermission($request->format)) {
            return $this->errorResponse('Permission insuffisante pour ce format d\'export.', 403);
        }

        [$from, $to] = $this->dateFilter->resolve($request->periodType, $request->all());
        $periodLabel  = $this->dateFilter->label($request->periodType, $request->all());

        $query = Victime::with([
            'accident.commune.departement.region',
            'infraction.commune.departement.region',
        ])->visibleByUser();
        if ($from || $to) {
            $query->where(function ($q) use ($from, $to) {
                $q->whereHas('accident', function ($aq) use ($from, $to) {
                    if ($from) $aq->where('date', '>=', $from);
                    if ($to)   $aq->where('date', '<=', $to);
                })->orWhereHas('infraction', function ($iq) use ($from, $to) {
                    if ($from) $iq->where('date', '>=', $from);
                    if ($to)   $iq->where('date', '<=', $to);
                });
            });
        }
        if ($request->region_id || $request->departement_id || $request->commune_id) {
            $query->where(function ($q) use ($request) {
                $q->whereHas('accident', fn($aq) => $this->applyGeoFilters($aq, $request))
                  ->orWhereHas('infraction', fn($iq) => $this->applyGeoFilters($iq, $request));
            });
        }
        $records = $query->orderBy('created_at')->get();

        $this->logExport('victimes', $request->format, $periodLabel, $records->count());

        return match ($request->format) {
            'pdf'   => $this->pdfService->generate('exports.advanced.victimes', [
                'records'        => $records,
                'titre'          => 'Rapport des Victimes et Impliqués',
                'date_generation'=> now()->format('d/m/Y H:i'),
                'agent'          => Auth::user()?->name ?? 'Inconnu',
                'period_label'   => $periodLabel,
            ], 'victimes'),

            'excel' => $this->excelService->downloadAnaserVictimes(
                $records,
                $periodLabel,
                Auth::user()?->name ?? 'Inconnu'
            ),

            'word' => $this->wordService->downloadVictimes($records, $periodLabel, Auth::user()?->name ?? 'Inconnu'),
        };
    }

    // POST /api/services-remuneres/export
    public function servicesRemuneres(Request $request)
    {
        $this->prepareExportEnvironment();
        $request->validate([
            'format'         => 'required|in:pdf,word,excel',
            'periodType'     => 'required|string',
            'month'          => 'nullable|integer|min:1|max:12',
            'year'           => 'nullable|integer|min:2000|max:2100',
            'start_date'     => 'nullable|date',
            'end_date'       => 'nullable|date|after_or_equal:start_date',
            'region_id'      => 'nullable|integer',
            'departement_id' => 'nullable|integer',
            'commune_id'     => 'nullable|integer',
        ]);
        if (!$this->checkExportPermission($request->format)) {
            return $this->errorResponse('Permission insuffisante pour ce format d\'export.', 403);
        }

        [$from, $to] = $this->dateFilter->resolve($request->periodType, $request->all());
        $periodLabel  = $this->dateFilter->label($request->periodType, $request->all());

        $query = ServiceRemunere::with(['service', 'commune.departement.region'])->visibleByUser();
        $this->applyDateRange($query, $from, $to);
        $this->applyGeoFilters($query, $request);
        $records = $query->orderBy('date')->orderBy('created_at')->get();

        $this->logExport('services_remuneres', $request->format, $periodLabel, $records->count());

        return match ($request->format) {
            'pdf'   => $this->pdfService->generate('exports.advanced.services_remuneres', [
                'records'        => $records,
                'titre'          => 'Rapport des Services Rémunérés',
                'date_generation'=> now()->format('d/m/Y H:i'),
                'agent'          => Auth::user()?->name ?? 'Inconnu',
                'period_label'   => $periodLabel,
            ], 'services_remuneres'),

            'excel' => $this->excelService->downloadAnaserServicesRemuneres(
                $records,
                $periodLabel,
                Auth::user()?->name ?? 'Inconnu'
            ),

            'word' => $this->wordService->downloadServicesRemuneres($records, $periodLabel, Auth::user()?->name ?? 'Inconnu'),
        };
    }

    private function checkExportPermission(string $format): bool
    {
        $user = Auth::user();
        return match ($format) {
            'pdf'   => $user->can('export.pdf'),
            'word'  => $user->can('export.pdf'),
            'excel' => $user->can('export.csv'),
            default => false,
        };
    }

    /** Filtre géo sur les modèles ayant commune_id (Infraction, Accident, Amende, ServiceRemunere). */
    private function applyGeoFilters($query, Request $request): void
    {
        if ($request->commune_id) {
            $query->where('commune_id', $request->commune_id);
        } elseif ($request->departement_id) {
            $query->whereHas('commune', fn($q) => $q->where('departement_id', $request->departement_id));
        } elseif ($request->region_id) {
            $query->whereHas('commune.departement', fn($q) => $q->where('region_id', $request->region_id));
        }
    }

    /** Filtre géo sur les modèles sans commune_id direct mais avec service_id (Immigration, Personnel). */
    private function applyGeoFiltersViaService($query, Request $request): void
    {
        if (!$request->commune_id && !$request->departement_id && !$request->region_id) return;
        $query->whereHas('service', function ($q) use ($request) {
            if ($request->commune_id) {
                $q->where('commune_id', $request->commune_id);
            } elseif ($request->departement_id) {
                $q->whereHas('commune', fn($c) => $c->where('departement_id', $request->departement_id));
            } elseif ($request->region_id) {
                $q->whereHas('commune.departement', fn($c) => $c->where('region_id', $request->region_id));
            }
        });
    }

    private function applyDateRange($query, ?string $from, ?string $to): void
    {
        if (!$from && !$to) return;

        $query->where(function ($q) use ($from, $to) {
            if ($from && $to) {
                $q->whereBetween('date', [$from, $to])
                  ->orWhere(fn($q2) => $q2->whereNull('date')
                      ->whereDate('created_at', '>=', $from)
                      ->whereDate('created_at', '<=', $to));
            } elseif ($from) {
                $q->where('date', '>=', $from)
                  ->orWhere(fn($q2) => $q2->whereNull('date')->whereDate('created_at', '>=', $from));
            } else {
                $q->where('date', '<=', $to)
                  ->orWhere(fn($q2) => $q2->whereNull('date')->whereDate('created_at', '<=', $to));
            }
        });
    }

    private function logExport(string $module, string $format, string $period, int $count): void
    {
        AuditLog::create([
            'user_id'    => Auth::id(),
            'action'     => 'export',
            'model_type' => $module,
            'model_id'   => null,
            'new_values' => [
                'format'  => $format,
                'period'  => $period,
                'count'   => $count,
            ],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
