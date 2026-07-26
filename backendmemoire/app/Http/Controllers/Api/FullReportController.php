<?php

namespace App\Http\Controllers\Api;

use App\Models\Accident;
use App\Models\AmendePieceSaisie;
use App\Models\ImmigrationClandestine;
use App\Models\Infraction;
use App\Models\Personnel;
use App\Models\ServiceRemunere;
use App\Models\Victime;
use App\Models\AuditLog;
use App\Services\Export\DateFilterService;
use App\Services\Export\PDFExportService;
use App\Services\Export\ExcelExportService;
use App\Services\Export\WordExportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\SimpleType\Jc;

class FullReportController extends ApiController
{
    public function __construct(
        private DateFilterService  $dateFilter,
        private PDFExportService   $pdfService,
        private ExcelExportService $excelService,
    ) {}

    public function generate(Request $request)
    {
        ini_set('memory_limit', '512M');
        set_time_limit(120);
        error_reporting(error_reporting() & ~E_DEPRECATED);

        $request->validate([
            'format'     => 'required|in:pdf,word,excel',
            'periodType' => 'required|string',
            'month'      => 'nullable|integer|min:1|max:12',
            'year'       => 'nullable|integer|min:2000|max:2100',
            'start_date' => 'nullable|date',
            'end_date'   => 'nullable|date|after_or_equal:start_date',
        ]);

        $user = Auth::user();
        $permOk = match ($request->format) {
            'excel' => $user->can('export.csv'),
            default => $user->can('export.pdf'),
        };
        if (!$permOk) {
            return $this->errorResponse('Permission insuffisante pour ce format d\'export.', 403);
        }

        [$from, $to] = $this->dateFilter->resolve($request->periodType, $request->all());
        $periodLabel  = $this->dateFilter->label($request->periodType, $request->all());

        $data = $this->gatherAllData($from, $to);

        $this->logExport($request->format, $periodLabel, $data);

        return match ($request->format) {
            'pdf'   => $this->buildPdf($data, $periodLabel),
            'excel' => $this->buildExcel($data, $periodLabel),
            'word'  => $this->buildWord($data, $periodLabel),
        };
    }

    private function gatherAllData(?string $from, ?string $to): array
    {
        $infractions = $this->queryWithDateRange(
            Infraction::with(['typeInfraction.categorieInfraction', 'service', 'commune'])->visibleByUser(),
            $from, $to
        )->orderByDesc('date')->get();

        $accidents = $this->queryWithDateRange(
            Accident::with(['service', 'commune', 'victimes'])->visibleByUser(),
            $from, $to
        )->orderByDesc('date')->get();

        $immigrations = $this->queryWithDateRange(
            ImmigrationClandestine::with(['service'])->visibleByUser(),
            $from, $to
        )->orderByDesc('date')->get();

        $personnel = Personnel::with(['service'])->visibleByUser()->get();

        $victimes = Victime::with(['infraction', 'accident'])->visibleByUser()->get();

        $amendes = $this->queryWithDateRange(
            AmendePieceSaisie::with(['service'])->visibleByUser(),
            $from, $to
        )->orderByDesc('date')->get();

        $services = $this->queryWithDateRange(
            ServiceRemunere::with(['service'])->visibleByUser(),
            $from, $to
        )->orderByDesc('date')->get();

        return compact('infractions', 'accidents', 'immigrations', 'personnel', 'victimes', 'amendes', 'services');
    }

    private function buildPdf(array $data, string $periodLabel)
    {
        return $this->pdfService->generate('exports.advanced.full-report', [
            'data'            => $data,
            'titre'           => 'Rapport Complet GESCRIM',
            'date_generation' => now()->format('d/m/Y H:i'),
            'agent'           => Auth::user()?->name ?? 'Inconnu',
            'period_label'    => $periodLabel,
        ], 'rapport_complet');
    }

    private function buildExcel(array $data, string $periodLabel)
    {
        $headers = [];
        $rows = [];

        // Section Infractions
        $rows[] = ['=== INFRACTIONS (' . $data['infractions']->count() . ') ===', '', '', '', '', '', '', '', ''];
        $rows[] = ['Date', 'Heure', 'Lieu', 'Commune', 'Service', 'Type', 'Catégorie', 'Issue', 'Description'];
        foreach ($data['infractions'] as $inf) {
            $rows[] = [
                $inf->date?->format('d/m/Y') ?? '-',
                $inf->heure ?? '-',
                $inf->lieu ?? '-',
                $inf->commune->nom ?? '-',
                $inf->service->nom ?? '-',
                $inf->typeInfraction->nom ?? '-',
                $inf->typeInfraction->categorieInfraction->nom ?? '-',
                $inf->issue ?? '-',
                $inf->description ?? '-',
            ];
        }
        $rows[] = [''];

        // Section Accidents
        $rows[] = ['=== ACCIDENTS (' . $data['accidents']->count() . ') ===', '', '', '', '', '', '', '', ''];
        $rows[] = ['Date', 'Heure', 'Type', 'Lieu', 'Commune', 'Service', 'Moyen', 'Cause', 'Victimes'];
        foreach ($data['accidents'] as $a) {
            $rows[] = [
                $a->date?->format('d/m/Y') ?? '-',
                $a->heure ?? '-',
                $a->type ?? '-',
                $a->lieu ?? '-',
                $a->commune->nom ?? '-',
                $a->service->nom ?? '-',
                $a->moyen ?? '-',
                $a->cause_probable ?? '-',
                $a->victimes->count(),
            ];
        }
        $rows[] = [''];

        // Section Immigrations
        $rows[] = ['=== IMMIGRATION CLANDESTINE (' . $data['immigrations']->count() . ') ===', '', '', '', '', '', '', '', ''];
        $rows[] = ['Date', 'Service', 'Total', 'Hommes', 'Femmes', 'Enfants', 'Sénégalais', 'Étrangers', 'Zone départ'];
        foreach ($data['immigrations'] as $r) {
            $rows[] = [
                $r->date?->format('d/m/Y') ?? '-',
                $r->service->nom ?? '-',
                $r->nombre_interpellation ?? 0,
                $r->nombre_hommes ?? 0,
                $r->nombre_femmes ?? 0,
                $r->nombre_enfants ?? 0,
                $r->nombre_senegalais ?? 0,
                $r->nombre_etrangers ?? 0,
                $r->zone_depart ?? '-',
            ];
        }
        $rows[] = [''];

        // Section Personnel
        $rows[] = ['=== PERSONNEL (' . $data['personnel']->count() . ') ===', '', '', '', '', '', '', '', ''];
        $rows[] = ['CCAP', 'Nom', 'Prénom', 'Grade', 'Sexe', 'Service', 'Statut', 'Téléphone', ''];
        foreach ($data['personnel'] as $p) {
            $rows[] = [
                $p->ccap ?? '-',
                $p->nom ?? '-',
                $p->prenom ?? '-',
                $p->grade ?? '-',
                $p->sexe ?? '-',
                $p->service->nom ?? '-',
                $p->statut ?? '-',
                $p->telephone ?? '-',
                '',
            ];
        }
        $rows[] = [''];

        // Section Victimes
        $rows[] = ['=== VICTIMES (' . $data['victimes']->count() . ') ===', '', '', '', '', '', '', '', ''];
        $rows[] = ['Nom', 'Prénom', 'CIN/Passeport', 'Sexe', 'Âge', 'Nationalité', 'Gravité', 'État médical', 'Décédé'];
        foreach ($data['victimes'] as $v) {
            $rows[] = [
                $v->nom ?? '-',
                $v->prenom ?? '-',
                $v->no_cin_passeport ?? '-',
                $v->sexe ?? '-',
                $v->age ?? '-',
                $v->nationalite ?? '-',
                $v->gravite_blessures ?? '-',
                $v->etat_medical ?? '-',
                $v->statut_deces ? 'Oui' : 'Non',
            ];
        }
        $rows[] = [''];

        // Section Amendes
        $rows[] = ['=== AMENDES & PIÈCES SAISIES (' . $data['amendes']->count() . ') ===', '', '', '', '', '', '', '', ''];
        $rows[] = ['Date', 'Heure', 'Type', 'Service', 'Montant', 'Description', '', '', ''];
        foreach ($data['amendes'] as $am) {
            $rows[] = [
                $am->date?->format('d/m/Y') ?? '-',
                $am->heure ?? '-',
                $am->type ?? '-',
                $am->service->nom ?? '-',
                $am->montant ?? '-',
                $am->description ?? '-',
                '', '', '',
            ];
        }
        $rows[] = [''];

        // Section Services Rémunérés
        $rows[] = ['=== SERVICES RÉMUNÉRÉS (' . $data['services']->count() . ') ===', '', '', '', '', '', '', '', ''];
        $rows[] = ['Date', 'Heure', 'Libellé', 'Service', 'Montant', 'Description', '', '', ''];
        foreach ($data['services'] as $sr) {
            $rows[] = [
                $sr->date?->format('d/m/Y') ?? '-',
                $sr->heure ?? '-',
                $sr->libelle ?? '-',
                $sr->service->nom ?? '-',
                $sr->montant ?? '-',
                $sr->description ?? '-',
                '', '', '',
            ];
        }

        $headerRow = ['RAPPORT COMPLET GESCRIM — ' . $periodLabel . ' — Généré le ' . now()->format('d/m/Y H:i'), '', '', '', '', '', '', '', ''];

        return $this->excelService->download(
            $headerRow,
            $rows,
            'rapport_complet_gescrim'
        );
    }

    private function buildWord(array $data, string $periodLabel)
    {
        $word = new PhpWord();
        $word->setDefaultFontName('Arial');
        $word->setDefaultFontSize(10);

        $section = $word->addSection([
            'marginTop' => 800, 'marginBottom' => 800,
            'marginLeft' => 900, 'marginRight' => 900,
        ]);

        $agent = Auth::user()?->name ?? 'Inconnu';

        // Header
        $section->addText('TERANGA GESCRIM — Direction de la Sécurité Publique', ['bold' => true, 'size' => 13, 'color' => '1B4332'], ['alignment' => Jc::CENTER]);
        $section->addText('Rapport Complet', ['bold' => true, 'size' => 14], ['alignment' => Jc::CENTER]);
        $section->addText($periodLabel, ['size' => 10, 'color' => '555555'], ['alignment' => Jc::CENTER]);
        $section->addText('Généré le : ' . now()->format('d/m/Y H:i') . ' — par : ' . $agent, ['size' => 9, 'color' => '888888'], ['alignment' => Jc::CENTER]);
        $section->addTextBreak(1);

        // Infractions
        $this->addWordSection($section, 'Infractions (' . $data['infractions']->count() . ')',
            ['#', 'Date', 'Lieu', 'Service', 'Type', 'Catégorie', 'Issue'],
            $data['infractions']->map(fn($inf, $i) => [
                $i + 1,
                $inf->date?->format('d/m/Y') ?? '-',
                $inf->lieu ?? '-',
                $inf->service->nom ?? '-',
                $inf->typeInfraction->nom ?? '-',
                $inf->typeInfraction->categorieInfraction->nom ?? '-',
                $inf->issue ?? '-',
            ])->all()
        );

        // Accidents
        $this->addWordSection($section, 'Accidents (' . $data['accidents']->count() . ')',
            ['#', 'Date', 'Type', 'Lieu', 'Service', 'Moyen', 'Victimes'],
            $data['accidents']->map(fn($a, $i) => [
                $i + 1,
                $a->date?->format('d/m/Y') ?? '-',
                $a->type ?? '-',
                $a->lieu ?? '-',
                $a->service->nom ?? '-',
                $a->moyen ?? '-',
                $a->victimes->count(),
            ])->all()
        );

        // Immigrations
        $this->addWordSection($section, 'Immigration Clandestine (' . $data['immigrations']->count() . ')',
            ['#', 'Date', 'Service', 'Total', 'Hommes', 'Femmes', 'Zone départ'],
            $data['immigrations']->map(fn($r, $i) => [
                $i + 1,
                $r->date?->format('d/m/Y') ?? '-',
                $r->service->nom ?? '-',
                $r->nombre_interpellation ?? 0,
                $r->nombre_hommes ?? 0,
                $r->nombre_femmes ?? 0,
                $r->zone_depart ?? '-',
            ])->all()
        );

        // Personnel
        $this->addWordSection($section, 'Personnel (' . $data['personnel']->count() . ')',
            ['#', 'CCAP', 'Nom', 'Prénom', 'Grade', 'Service', 'Statut'],
            $data['personnel']->map(fn($p, $i) => [
                $i + 1,
                $p->ccap ?? '-',
                $p->nom ?? '-',
                $p->prenom ?? '-',
                $p->grade ?? '-',
                $p->service->nom ?? '-',
                $p->statut ?? '-',
            ])->all()
        );

        // Victimes
        $this->addWordSection($section, 'Victimes (' . $data['victimes']->count() . ')',
            ['#', 'Nom', 'Prénom', 'Sexe', 'Âge', 'Nationalité', 'Gravité'],
            $data['victimes']->map(fn($v, $i) => [
                $i + 1,
                $v->nom ?? '-',
                $v->prenom ?? '-',
                $v->sexe ?? '-',
                $v->age ?? '-',
                $v->nationalite ?? '-',
                $v->gravite_blessures ?? '-',
            ])->all()
        );

        // Amendes
        $this->addWordSection($section, 'Amendes & Pièces Saisies (' . $data['amendes']->count() . ')',
            ['#', 'Date', 'Type', 'Service', 'Montant', 'Description'],
            $data['amendes']->map(fn($am, $i) => [
                $i + 1,
                $am->date?->format('d/m/Y') ?? '-',
                $am->type ?? '-',
                $am->service->nom ?? '-',
                $am->montant ?? '-',
                $am->description ?? '-',
            ])->all()
        );

        // Services Rémunérés
        $this->addWordSection($section, 'Services Rémunérés (' . $data['services']->count() . ')',
            ['#', 'Date', 'Libellé', 'Service', 'Montant', 'Description'],
            $data['services']->map(fn($sr, $i) => [
                $i + 1,
                $sr->date?->format('d/m/Y') ?? '-',
                $sr->libelle ?? '-',
                $sr->service->nom ?? '-',
                $sr->montant ?? '-',
                $sr->description ?? '-',
            ])->all()
        );

        // Footer
        $section->addTextBreak(1);
        $section->addText(
            'Teranga GESCRIM — Rapport confidentiel — Accès réservé au personnel autorisé',
            ['size' => 8, 'color' => 'AAAAAA'],
            ['alignment' => Jc::CENTER]
        );

        $fullName = 'rapport_complet_gescrim_' . now()->format('Y-m-d') . '.docx';

        // Fichier temporaire pour éviter la corruption du ZIP OOXML par les middleware Laravel
        $tmpPath = tempnam(sys_get_temp_dir(), 'gescrim_full_docx_');
        $writer  = IOFactory::createWriter($word, 'Word2007');
        $writer->save($tmpPath);
        $content = file_get_contents($tmpPath);
        unlink($tmpPath);

        return response($content, 200, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => 'attachment; filename="' . $fullName . '"',
            'Content-Length'      => strlen($content),
            'Cache-Control'       => 'no-cache, no-store, must-revalidate',
            'Pragma'              => 'no-cache',
        ]);
    }

    private function addWordSection($section, string $title, array $headers, array $rows): void
    {
        $section->addText($title, ['bold' => true, 'size' => 12, 'color' => '1B4332']);
        $section->addTextBreak(0);

        if (empty($rows)) {
            $section->addText('Aucun enregistrement.', ['size' => 9, 'italic' => true, 'color' => '888888']);
            $section->addTextBreak(1);
            return;
        }

        $colCount = count($headers);
        $colWidth = (int) floor(9000 / max($colCount, 1));

        $table = $section->addTable([
            'borderSize' => 6, 'borderColor' => 'CCCCCC', 'cellMargin' => 80,
        ]);

        $table->addRow();
        foreach ($headers as $header) {
            $cell = $table->addCell($colWidth, ['bgColor' => '1B4332']);
            $cell->addText($header, ['color' => 'FFFFFF', 'bold' => true, 'size' => 8]);
        }

        foreach ($rows as $i => $row) {
            $bgColor = ($i % 2 === 0) ? 'FFFFFF' : 'F5F5F5';
            $table->addRow();
            foreach ($row as $cell) {
                $c = $table->addCell($colWidth, ['bgColor' => $bgColor]);
                $c->addText((string) ($cell ?? '-'), ['size' => 8]);
            }
        }

        $section->addTextBreak(1);
    }

    private function queryWithDateRange($query, ?string $from, ?string $to)
    {
        if (!$from && !$to) return $query;

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

        return $query;
    }

    private function logExport(string $format, string $period, array $data): void
    {
        $counts = [];
        foreach ($data as $key => $collection) {
            $counts[$key] = $collection->count();
        }

        AuditLog::create([
            'user_id'    => Auth::id(),
            'action'     => 'export',
            'model_type' => 'full_report',
            'model_id'   => null,
            'new_values' => [
                'format' => $format,
                'period' => $period,
                'counts' => $counts,
            ],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
