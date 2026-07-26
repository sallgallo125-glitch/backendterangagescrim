<?php

namespace App\Http\Controllers\Api;

use App\Models\Infraction;
use App\Models\Accident;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExportController extends ApiController
{
    // Applique les filtres communs date/heure/géo sur une query
    private function applyCommonFilters($query, Request $request): void
    {
        // Filtre date — inclut aussi les enregistrements sans date (saisie offline)
        // dont le created_at tombe dans la plage demandée
        if ($request->filled('date_from') || $request->filled('date_to')) {
            $from = $request->filled('date_from') ? $request->date_from : null;
            $to   = $request->filled('date_to')   ? $request->date_to   : null;

            $query->where(function ($q) use ($from, $to) {
                if ($from && $to) {
                    $q->whereBetween('date', [$from, $to])
                      ->orWhere(function ($q2) use ($from, $to) {
                          $q2->whereNull('date')
                             ->whereDate('created_at', '>=', $from)
                             ->whereDate('created_at', '<=', $to);
                      });
                } elseif ($from) {
                    $q->where('date', '>=', $from)
                      ->orWhere(function ($q2) use ($from) {
                          $q2->whereNull('date')->whereDate('created_at', '>=', $from);
                      });
                } else {
                    $q->where('date', '<=', $to)
                      ->orWhere(function ($q2) use ($to) {
                          $q2->whereNull('date')->whereDate('created_at', '<=', $to);
                      });
                }
            });
        }

        // Filtre heure — compare sur le champ `heure` (string "HH:MM")
        if ($request->filled('hour')) {
            $hourPadded = str_pad((int) $request->hour, 2, '0', STR_PAD_LEFT);
            $query->where('heure', 'LIKE', $hourPadded . '%');
        }

        // Filtre géographique — commune > département > région (priorité décroissante)
        if ($request->filled('commune_id')) {
            $query->byCommune($request->commune_id);
        } elseif ($request->filled('departement_id')) {
            $query->whereHas('commune', fn($q) => $q->where('departement_id', $request->departement_id));
        } elseif ($request->filled('region_id')) {
            $query->whereHas('commune.departement', fn($q) => $q->where('region_id', $request->region_id));
        }
    }

    public function infrationsPdf(Request $request)
    {
        $query = Infraction::with(['typeInfraction.categorieInfraction', 'service', 'commune'])
            ->visibleByUser();

        if ($request->filled('annee'))      $query->byAnnee($request->annee);
        if ($request->filled('service_id')) $query->byService($request->service_id);

        $this->applyCommonFilters($query, $request);

        $infractions = $query->orderByDesc('date')->orderByDesc('created_at')->get();

        $pdf = Pdf::loadView('exports.infractions', [
            'infractions'     => $infractions,
            'titre'           => 'Rapport des Infractions',
            'date_generation' => now()->format('d/m/Y H:i'),
            'filters'         => $request->all(),
        ]);

        return $pdf->download('infractions_' . now()->format('Y-m-d') . '.pdf');
    }

    public function accidentsPdf(Request $request)
    {
        $query = Accident::with(['service', 'commune', 'victimes'])
            ->visibleByUser();

        if ($request->filled('type')) $query->byType($request->type);

        $this->applyCommonFilters($query, $request);

        $accidents = $query->orderByDesc('date')->orderByDesc('created_at')->get();

        $pdf = Pdf::loadView('exports.accidents', [
            'accidents'       => $accidents,
            'titre'           => 'Rapport des Accidents de Circulation',
            'date_generation' => now()->format('d/m/Y H:i'),
            'filters'         => $request->all(),
        ]);

        return $pdf->download('accidents_' . now()->format('Y-m-d') . '.pdf');
    }

    public function infractionsCsv(Request $request)
    {
        $query = Infraction::with(['typeInfraction', 'service', 'commune'])
            ->visibleByUser();

        if ($request->filled('annee'))      $query->byAnnee($request->annee);
        if ($request->filled('service_id')) $query->byService($request->service_id);

        $this->applyCommonFilters($query, $request);

        $infractions = $query->orderByDesc('date')->orderByDesc('created_at')->get();

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="infractions_' . now()->format('Y-m-d') . '.csv"',
        ];

        $callback = function () use ($infractions) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($file, ['ID', 'Date', 'Heure', 'Lieu', 'Commune', 'Service', 'Type', 'Issue', 'Description'], ';');

            foreach ($infractions as $infraction) {
                fputcsv($file, [
                    $infraction->id,
                    $infraction->date?->format('d/m/Y') ?? ($infraction->annee ?? '-'),
                    $infraction->heure ?? '-',
                    $infraction->lieu ?? '-',
                    $infraction->commune->nom ?? '-',
                    $infraction->service->nom ?? '-',
                    $infraction->typeInfraction->nom ?? '-',
                    $infraction->issue ?? '-',
                    $infraction->description ?? '-',
                ], ';');
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function accidentsCsv(Request $request)
    {
        $query = Accident::with(['service', 'commune'])
            ->visibleByUser();

        if ($request->filled('type')) $query->byType($request->type);

        $this->applyCommonFilters($query, $request);

        $accidents = $query->orderByDesc('date')->orderByDesc('created_at')->get();

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="accidents_' . now()->format('Y-m-d') . '.csv"',
        ];

        $callback = function () use ($accidents) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($file, ['ID', 'Date', 'Heure', 'Type', 'Lieu', 'Commune', 'Service', 'Moyen', 'Cause'], ';');

            foreach ($accidents as $accident) {
                fputcsv($file, [
                    $accident->id,
                    $accident->date?->format('d/m/Y') ?? '-',
                    $accident->heure ?? '-',
                    $accident->type ?? '-',
                    $accident->lieu ?? '-',
                    $accident->commune->nom ?? '-',
                    $accident->service->nom ?? '-',
                    $accident->moyen ?? '-',
                    $accident->cause_probable ?? '-',
                ], ';');
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private const INFRACTION_FILLABLE = [
        'date', 'heure', 'annee', 'lieu', 'description', 'issue',
        'type_infraction_id', 'commune_id', 'service_id',
    ];

    private const ACCIDENT_FILLABLE = [
        'date', 'heure', 'lieu', 'type', 'cause_probable', 'description',
        'moyen', 'commune_id', 'service_id',
    ];

    public function importJson(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|mimes:json|max:10240']);

        $content = json_decode(file_get_contents($request->file('file')->getRealPath()), true);

        if (!$content || !is_array($content)) {
            return $this->errorResponse('Fichier JSON invalide.', 422);
        }

        $user = auth()->user();
        $scopeService = app(\App\Services\ScopeAccessService::class);
        $imported = 0;
        $skipped  = 0;

        DB::beginTransaction();
        try {
            foreach ($content['infractions'] ?? [] as $raw) {
                $data = array_intersect_key($raw, array_flip(self::INFRACTION_FILLABLE));
                $data['user_id'] = $user->id;
                $infraction = new Infraction($data);
                if (!$scopeService->canWrite($user, $infraction)) {
                    $skipped++;
                    continue;
                }
                Infraction::create($data);
                $imported++;
            }
            foreach ($content['accidents'] ?? [] as $raw) {
                $data = array_intersect_key($raw, array_flip(self::ACCIDENT_FILLABLE));
                $data['user_id'] = $user->id;
                $accident = new Accident($data);
                if (!$scopeService->canWrite($user, $accident)) {
                    $skipped++;
                    continue;
                }
                Accident::create($data);
                $imported++;
            }
            DB::commit();
            $msg = "{$imported} enregistrement(s) importé(s)" . ($skipped ? ", {$skipped} ignoré(s) (portée territoriale)." : '.');
            return $this->successResponse(['imported' => $imported, 'skipped' => $skipped], $msg);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Erreur lors de l\'import: ' . $e->getMessage(), 500);
        }
    }
}
