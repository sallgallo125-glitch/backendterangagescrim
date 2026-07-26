<?php

namespace App\Services\Export;

use Illuminate\Http\Response;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ExcelExportService
{
    private const COLOR_HEADER_BG = '1B4332';
    private const COLOR_HEADER_FG = 'FFFFFF';
    private const COLOR_TOTAL_BG  = 'C6F6D5';
    private const COLOR_TOTAL_FG  = '1B4332';
    private const COLOR_TITLE_FG  = '1B4332';
    private const COLOR_META_BG   = 'ECFDF5';
    private const COLOR_BORDER    = 'CCCCCC';
    private const COLOR_BLOCK_BG  = '2D6A4F';

    // ─── Export plat original (inchangé) ──────────────────────────────────────

    public function download(
        string $title,
        string $subtitle,
        string $agent,
        array  $headers,
        array  $rows,
        array  $totals = [],
        string $filename = 'rapport'
    ): Response {
        $spreadsheet   = new Spreadsheet();
        $sheet         = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Rapport');

        $colCount      = count($headers);
        $lastColLetter = Coordinate::stringFromColumnIndex($colCount);

        $sheet->mergeCells("A1:{$lastColLetter}1");
        $sheet->setCellValue('A1', 'DIRECTION DE LA SÉCURITÉ PUBLIQUE — SÉNÉGAL (TERANGA GESCRIM)');
        $this->styleRange($sheet, "A1:{$lastColLetter}1", [
            'font'      => ['bold' => true, 'size' => 13, 'color' => ['argb' => 'FF' . self::COLOR_TITLE_FG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF' . self::COLOR_META_BG]],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(22);

        $sheet->mergeCells("A2:{$lastColLetter}2");
        $sheet->setCellValue('A2', strtoupper($title));
        $this->styleRange($sheet, "A2:{$lastColLetter}2", [
            'font'      => ['bold' => true, 'size' => 12, 'color' => ['argb' => 'FF' . self::COLOR_TITLE_FG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF' . self::COLOR_META_BG]],
        ]);
        $sheet->getRowDimension(2)->setRowHeight(18);

        $sheet->mergeCells("A3:{$lastColLetter}3");
        $sheet->setCellValue('A3', "Période : {$subtitle}     |     Généré le : " . now()->format('d/m/Y H:i') . "     |     Agent : {$agent}");
        $this->styleRange($sheet, "A3:{$lastColLetter}3", [
            'font'      => ['size' => 9, 'color' => ['argb' => 'FF555555']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF' . self::COLOR_META_BG]],
        ]);
        $sheet->getRowDimension(3)->setRowHeight(14);

        $headerRow = 4;
        foreach ($headers as $col => $header) {
            $letter = Coordinate::stringFromColumnIndex($col + 1);
            $sheet->setCellValue("{$letter}{$headerRow}", $header);
        }
        $this->styleRange($sheet, "A{$headerRow}:{$lastColLetter}{$headerRow}", [
            'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => 'FF' . self::COLOR_HEADER_FG]],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF' . self::COLOR_HEADER_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FF' . self::COLOR_BORDER]]],
        ]);
        $sheet->getRowDimension($headerRow)->setRowHeight(16);

        foreach ($rows as $ri => $row) {
            $currentRow = $headerRow + 1 + $ri;
            $bgArgb     = ($ri % 2 === 0) ? 'FFFFFF00' : 'FFFFFFFF';
            foreach ($row as $col => $value) {
                $letter = Coordinate::stringFromColumnIndex($col + 1);
                $sheet->setCellValue("{$letter}{$currentRow}", $value);
            }
            $this->styleRange($sheet, "A{$currentRow}:{$lastColLetter}{$currentRow}", [
                'font'      => ['size' => 9],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bgArgb]],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFDDDDDD']]],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getRowDimension($currentRow)->setRowHeight(14);
        }

        if (!empty($totals)) {
            $totalRow = $headerRow + 1 + count($rows);
            foreach ($totals as $col => $value) {
                $letter = Coordinate::stringFromColumnIndex($col + 1);
                $sheet->setCellValue("{$letter}{$totalRow}", $value);
            }
            $this->styleRange($sheet, "A{$totalRow}:{$lastColLetter}{$totalRow}", [
                'font'    => ['bold' => true, 'size' => 9, 'color' => ['argb' => 'FF' . self::COLOR_TOTAL_FG]],
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF' . self::COLOR_TOTAL_BG]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FF' . self::COLOR_BORDER]]],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getRowDimension($totalRow)->setRowHeight(15);
        }

        foreach (range(1, $colCount) as $colIndex) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($colIndex))->setAutoSize(true);
        }
        $sheet->freezePane("A{$headerRow}");

        return $this->mkResponse($spreadsheet, $filename . '_' . now()->format('Y-m-d'));
    }

    // ─── Synthèses ANASER multi-feuilles ──────────────────────────────────────

    public function downloadAnaserAccidents(Collection $accidents, string $periodLabel, string $agentName): Response
    {
        $indicators = ['Accidents', 'Tués', 'Blessés Graves', 'Blessés Légers', 'Indemnes', 'Total Victimes'];
        $computeFn  = fn($c) => $this->accidentIndicators($c);
        $groupFn    = fn($r) => mb_strtoupper($r->commune?->departement?->region?->nom ?? 'NON DÉFINI');
        $subFn      = fn($r) => mb_strtoupper($r->commune?->departement?->nom ?? 'NON DÉFINI');

        $blocksBuilder = function (Collection $records, bool $isNational, string $groupName, array $groups) use ($groupFn, $subFn) {
            $blocks = [];

            $blocks[] = ['title' => '1. RÉPARTITION PAR TYPE D\'ACCIDENT', 'filters' => [
                'Mortel'   => fn($c) => $c->where('type', 'mortel'),
                'Corporel' => fn($c) => $c->where('type', 'corporel'),
                'Matériel' => fn($c) => $c->where('type', 'matériel'),
            ]];

            $moyens = $records->pluck('moyen')->filter()->unique()->sort()->values();
            if ($moyens->isNotEmpty()) {
                $filters = [];
                foreach ($moyens as $m) {
                    $mv = $m;
                    $filters[ucwords(str_replace('_', ' ', $mv))] = fn($c) => $c->where('moyen', $mv);
                }
                $blocks[] = ['title' => '2. RÉPARTITION PAR MOYEN (VÉHICULE / USAGER)', 'filters' => $filters];
            }

            $causes = $records->pluck('cause_probable')->filter()->unique()->sort()->values();
            if ($causes->isNotEmpty()) {
                $filters = [];
                foreach ($causes as $cause) {
                    $cv = $cause;
                    $filters[ucfirst($cv)] = fn($c) => $c->where('cause_probable', $cv);
                }
                $blocks[] = ['title' => '3. RÉPARTITION PAR CAUSE PROBABLE', 'filters' => $filters];
            }

            $blocks[] = $this->heuresBlock('4. RÉPARTITION PAR TRANCHE HORAIRE');
            $blocks[] = $this->moisBlock('5. RÉPARTITION PAR MOIS');
            $blocks[] = $isNational
                ? $this->geoBlock('6. RÉPARTITION PAR RÉGION', $groups, $groupFn)
                : $this->geoBlock('6. RÉPARTITION PAR DÉPARTEMENT', $this->collectGroups($records, $subFn), $subFn);

            return $blocks;
        };

        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0);
        $this->buildMultiSheetWorkbook($spreadsheet, $accidents, 'ACCIDENTS DE CIRCULATION', 'accidents',
            $periodLabel, $agentName, $indicators, $computeFn, $groupFn, $blocksBuilder);
        $spreadsheet->setActiveSheetIndex(0);
        return $this->mkResponse($spreadsheet, 'SYNTHESE_ACCIDENTS_DSP');
    }

    public function downloadAnaserInfractions(Collection $infractions, string $periodLabel, string $agentName): Response
    {
        $indicators = ['Infractions', 'Garde à vue', 'Déféré', 'Classé', 'Archivé', 'Autre issue'];
        $computeFn  = fn($c) => $this->infractionIndicators($c);
        $groupFn    = fn($r) => mb_strtoupper($r->commune?->departement?->region?->nom ?? 'NON DÉFINI');
        $subFn      = fn($r) => mb_strtoupper($r->commune?->departement?->nom ?? 'NON DÉFINI');

        $blocksBuilder = function (Collection $records, bool $isNational, string $groupName, array $groups) use ($groupFn, $subFn) {
            $blocks = [];

            $blocks[] = ['title' => '1. RÉPARTITION PAR ISSUE', 'filters' => [
                'Garde à vue' => fn($c) => $c->filter(fn($r) => in_array(mb_strtolower($r->issue ?? ''), ['garde à vue', 'garde_a_vue', 'gav'])),
                'Déféré'      => fn($c) => $c->filter(fn($r) => in_array(mb_strtolower($r->issue ?? ''), ['déféré', 'defere', 'déféré au parquet'])),
                'Classé'      => fn($c) => $c->filter(fn($r) => in_array(mb_strtolower($r->issue ?? ''), ['classé', 'classe', 'classé sans suite'])),
                'Archivé'     => fn($c) => $c->filter(fn($r) => in_array(mb_strtolower($r->issue ?? ''), ['archivé', 'archive'])),
                'Autre'       => fn($c) => $c->filter(fn($r) => !in_array(mb_strtolower($r->issue ?? ''), [
                    'garde à vue', 'garde_a_vue', 'gav', 'déféré', 'defere', 'déféré au parquet',
                    'classé', 'classe', 'classé sans suite', 'archivé', 'archive',
                ])),
            ]];

            $cats = $records->pluck('typeInfraction.categorieInfraction.nom')->filter()->unique()->sort()->values();
            if ($cats->isNotEmpty()) {
                $filters = [];
                foreach ($cats as $cat) {
                    $cv = $cat;
                    $filters[$cv] = fn($c) => $c->filter(fn($r) => ($r->typeInfraction?->categorieInfraction?->nom ?? '') === $cv);
                }
                $blocks[] = ['title' => '2. RÉPARTITION PAR CATÉGORIE D\'INFRACTION', 'filters' => $filters];
            }

            $types = $records->pluck('typeInfraction.nom')->filter()->unique()->sort()->values();
            if ($types->isNotEmpty()) {
                $filters = [];
                foreach ($types as $type) {
                    $tv = $type;
                    $filters[$tv] = fn($c) => $c->filter(fn($r) => ($r->typeInfraction?->nom ?? '') === $tv);
                }
                $blocks[] = ['title' => '3. RÉPARTITION PAR TYPE D\'INFRACTION', 'filters' => $filters];
            }

            $blocks[] = $this->heuresBlock('4. RÉPARTITION PAR TRANCHE HORAIRE');
            $blocks[] = $this->moisBlock('5. RÉPARTITION PAR MOIS');
            $blocks[] = $isNational
                ? $this->geoBlock('6. RÉPARTITION PAR RÉGION', $groups, $groupFn)
                : $this->geoBlock('6. RÉPARTITION PAR DÉPARTEMENT', $this->collectGroups($records, $subFn), $subFn);

            return $blocks;
        };

        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0);
        $this->buildMultiSheetWorkbook($spreadsheet, $infractions, 'INFRACTIONS CONSTATÉES', 'infractions',
            $periodLabel, $agentName, $indicators, $computeFn, $groupFn, $blocksBuilder);
        $spreadsheet->setActiveSheetIndex(0);
        return $this->mkResponse($spreadsheet, 'SYNTHESE_INFRACTIONS_DSP');
    }

    public function downloadAnaserImmigrations(Collection $immigrations, string $periodLabel, string $agentName): Response
    {
        $indicators = ['Interpellations', 'Hommes', 'Femmes', 'Enfants', 'Sénégalais', 'Étrangers'];
        $computeFn  = fn($c) => $this->immigrationIndicators($c);
        $groupFn    = fn($r) => mb_strtoupper($r->service?->nom ?? 'NON DÉFINI');

        $blocksBuilder = function (Collection $records, bool $isNational, string $groupName, array $groups) use ($groupFn) {
            $blocks = [];

            $blocks[] = $this->moisBlock('1. RÉPARTITION PAR MOIS');
            $blocks[] = $this->heuresBlock('2. RÉPARTITION PAR TRANCHE HORAIRE');

            $zones = $records->pluck('zone_depart')->filter()->unique()->sort()->values()->take(25);
            if ($zones->isNotEmpty()) {
                $filters = [];
                foreach ($zones as $zone) {
                    $zv = $zone;
                    $filters[$zv] = fn($c) => $c->where('zone_depart', $zv);
                }
                $filters['Non précisé'] = fn($c) => $c->filter(fn($r) => !$r->zone_depart);
                $blocks[] = ['title' => '3. RÉPARTITION PAR ZONE DE DÉPART', 'filters' => $filters];
            }

            $zonesArr = $records->pluck('zone_arrivee_prevue')->filter()->unique()->sort()->values()->take(25);
            if ($zonesArr->isNotEmpty()) {
                $filters = [];
                foreach ($zonesArr as $zone) {
                    $zv = $zone;
                    $filters[$zv] = fn($c) => $c->where('zone_arrivee_prevue', $zv);
                }
                $filters['Non précisé'] = fn($c) => $c->filter(fn($r) => !$r->zone_arrivee_prevue);
                $blocks[] = ['title' => '4. RÉPARTITION PAR ZONE D\'ARRIVÉE PRÉVUE', 'filters' => $filters];
            }

            $blocks[] = $this->geoBlock('5. RÉPARTITION PAR SERVICE', $groups, $groupFn);

            return $blocks;
        };

        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0);
        $this->buildMultiSheetWorkbook($spreadsheet, $immigrations, 'IMMIGRATION CLANDESTINE', 'interpellations',
            $periodLabel, $agentName, $indicators, $computeFn, $groupFn, $blocksBuilder);
        $spreadsheet->setActiveSheetIndex(0);
        return $this->mkResponse($spreadsheet, 'SYNTHESE_IMMIGRATION_DSP');
    }

    public function downloadAnaserPersonnel(Collection $personnel, string $periodLabel, string $agentName): Response
    {
        $indicators = ['Agents', 'Hommes', 'Femmes', 'Actifs', 'Inactifs', 'Sanctionnés'];
        $computeFn  = fn($c) => $this->personnelIndicators($c);
        $groupFn    = fn($r) => mb_strtoupper($r->service?->commune?->departement?->region?->nom ?? 'NON DÉFINI');
        $subFn      = fn($r) => mb_strtoupper($r->service?->commune?->departement?->nom ?? 'NON DÉFINI');

        $blocksBuilder = function (Collection $records, bool $isNational, string $groupName, array $groups) use ($groupFn, $subFn) {
            $blocks = [];

            $grades = $records->pluck('grade')->filter()->unique()->sort()->values();
            if ($grades->isNotEmpty()) {
                $filters = [];
                foreach ($grades as $g) {
                    $gv = $g;
                    $filters[$gv] = fn($c) => $c->where('grade', $gv);
                }
                $blocks[] = ['title' => '1. RÉPARTITION PAR GRADE', 'filters' => $filters];
            }

            $blocks[] = ['title' => '2. RÉPARTITION PAR SEXE', 'filters' => [
                'Masculin'   => fn($c) => $c->where('sexe', 'M'),
                'Féminin'    => fn($c) => $c->where('sexe', 'F'),
                'Non précisé'=> fn($c) => $c->filter(fn($r) => !in_array($r->sexe, ['M', 'F'])),
            ]];

            $blocks[] = ['title' => '3. RÉPARTITION PAR STATUT', 'filters' => [
                'Actif'    => fn($c) => $c->where('statut', 'actif'),
                'Inactif'  => fn($c) => $c->where('statut', 'inactif'),
                'Suspendu' => fn($c) => $c->where('statut', 'suspendu'),
                'Retraité' => fn($c) => $c->where('statut', 'retraite'),
                'Autre'    => fn($c) => $c->filter(fn($r) => !in_array($r->statut, ['actif', 'inactif', 'suspendu', 'retraite'])),
            ]];

            $blocks[] = $isNational
                ? $this->geoBlock('4. RÉPARTITION PAR RÉGION', $groups, $groupFn)
                : $this->geoBlock('4. RÉPARTITION PAR DÉPARTEMENT', $this->collectGroups($records, $subFn), $subFn);

            return $blocks;
        };

        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0);
        $this->buildMultiSheetWorkbook($spreadsheet, $personnel, 'PERSONNEL DSP', 'agents',
            $periodLabel, $agentName, $indicators, $computeFn, $groupFn, $blocksBuilder);
        $spreadsheet->setActiveSheetIndex(0);
        return $this->mkResponse($spreadsheet, 'SYNTHESE_PERSONNEL_DSP');
    }

    public function downloadAnaserVictimes(Collection $victimes, string $periodLabel, string $agentName): Response
    {
        $indicators = ['Victimes', 'Décédées', 'Blessées Graves', 'Blessées Légères', 'Indemnes'];
        $computeFn  = fn($c) => $this->victimeIndicators($c);
        $groupFn    = fn($r) => mb_strtoupper(
            ($r->accident?->commune?->departement?->region?->nom
            ?? $r->infraction?->commune?->departement?->region?->nom
            ?? 'NON DÉFINI')
        );

        $blocksBuilder = function (Collection $records, bool $isNational, string $groupName, array $groups) use ($groupFn) {
            $blocks = [];

            $blocks[] = ['title' => '1. RÉPARTITION PAR SEXE', 'filters' => [
                'Masculin'    => fn($c) => $c->where('sexe', 'M'),
                'Féminin'     => fn($c) => $c->where('sexe', 'F'),
                'Non précisé' => fn($c) => $c->filter(fn($r) => !in_array($r->sexe, ['M', 'F'])),
            ]];

            $blocks[] = ['title' => '2. RÉPARTITION PAR GRAVITÉ', 'filters' => [
                'Décédées'        => fn($c) => $c->where('statut_deces', true),
                'Blessées graves' => fn($c) => $c->filter(fn($r) => !$r->statut_deces && in_array(mb_strtolower($r->gravite_blessures ?? ''), ['grave', 'graves', 'sérieux', 'serieux'])),
                'Blessées légères'=> fn($c) => $c->filter(fn($r) => !$r->statut_deces && in_array(mb_strtolower($r->gravite_blessures ?? ''), ['léger', 'leger', 'légers', 'legers', 'mineur', 'mineurs'])),
                'Indemnes'        => fn($c) => $c->filter(fn($r) => !$r->statut_deces && !$r->gravite_blessures),
            ]];

            $nats = $records->pluck('nationalite')->filter()->unique()->sort()->values()->take(20);
            if ($nats->isNotEmpty()) {
                $filters = [];
                foreach ($nats as $nat) {
                    $nv = $nat;
                    $filters[$nv] = fn($c) => $c->where('nationalite', $nv);
                }
                $filters['Autre'] = fn($c) => $c->filter(fn($r) => !$r->nationalite);
                $blocks[] = ['title' => '3. RÉPARTITION PAR NATIONALITÉ', 'filters' => $filters];
            }

            $blocks[] = $this->geoBlock('4. RÉPARTITION PAR RÉGION', $groups, $groupFn);

            return $blocks;
        };

        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0);
        $this->buildMultiSheetWorkbook($spreadsheet, $victimes, 'VICTIMES ET IMPLIQUÉS', 'victimes',
            $periodLabel, $agentName, $indicators, $computeFn, $groupFn, $blocksBuilder);
        $spreadsheet->setActiveSheetIndex(0);
        return $this->mkResponse($spreadsheet, 'SYNTHESE_VICTIMES_DSP');
    }

    public function downloadAnaserServicesRemuneres(Collection $services, string $periodLabel, string $agentName): Response
    {
        $indicators = ['Prestations', 'Montant total (FCFA)'];
        $computeFn  = fn($c) => $this->amendeIndicators($c); // même logique count + sum montant
        $groupFn    = fn($r) => mb_strtoupper($r->commune?->departement?->region?->nom ?? 'NON DÉFINI');
        $subFn      = fn($r) => mb_strtoupper($r->commune?->departement?->nom ?? 'NON DÉFINI');

        $blocksBuilder = function (Collection $records, bool $isNational, string $groupName, array $groups) use ($groupFn, $subFn) {
            $blocks = [];

            $libelles = $records->pluck('libelle')->filter()->unique()->sort()->values()->take(30);
            if ($libelles->isNotEmpty()) {
                $filters = [];
                foreach ($libelles as $l) {
                    $lv = $l;
                    $filters[$lv] = fn($c) => $c->where('libelle', $lv);
                }
                $blocks[] = ['title' => '1. RÉPARTITION PAR PRESTATION', 'filters' => $filters];
            }

            $blocks[] = $this->heuresBlock('2. RÉPARTITION PAR TRANCHE HORAIRE');
            $blocks[] = $this->moisBlock('3. RÉPARTITION PAR MOIS');
            $blocks[] = $isNational
                ? $this->geoBlock('4. RÉPARTITION PAR RÉGION', $groups, $groupFn)
                : $this->geoBlock('4. RÉPARTITION PAR DÉPARTEMENT', $this->collectGroups($records, $subFn), $subFn);

            return $blocks;
        };

        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0);
        $this->buildMultiSheetWorkbook($spreadsheet, $services, 'SERVICES RÉMUNÉRÉS', 'prestations',
            $periodLabel, $agentName, $indicators, $computeFn, $groupFn, $blocksBuilder);
        $spreadsheet->setActiveSheetIndex(0);
        return $this->mkResponse($spreadsheet, 'SYNTHESE_SERVICES_REMUNERES_DSP');
    }

    public function downloadAnaserAmendes(Collection $amendes, string $periodLabel, string $agentName): Response
    {
        $indicators = ['Dossiers', 'Montant total (FCFA)'];
        $computeFn  = fn($c) => $this->amendeIndicators($c);
        $groupFn    = fn($r) => mb_strtoupper($r->commune?->departement?->region?->nom ?? 'NON DÉFINI');
        $subFn      = fn($r) => mb_strtoupper($r->commune?->departement?->nom ?? 'NON DÉFINI');

        $blocksBuilder = function (Collection $records, bool $isNational, string $groupName, array $groups) use ($groupFn, $subFn) {
            $blocks = [];

            $types = $records->pluck('type')->filter()->unique()->sort()->values();
            $typeFilters = $types->isNotEmpty()
                ? $types->mapWithKeys(function ($t) { $tv = $t; return [$tv => fn($c) => $c->where('type', $tv)]; })->all()
                : ['Amende' => fn($c) => $c->where('type', 'Amende'), 'Pièce saisie' => fn($c) => $c->where('type', 'Pièce saisie')];
            $blocks[] = ['title' => '1. RÉPARTITION PAR TYPE', 'filters' => $typeFilters];

            $blocks[] = $this->heuresBlock('2. RÉPARTITION PAR TRANCHE HORAIRE');
            $blocks[] = $this->moisBlock('3. RÉPARTITION PAR MOIS');
            $blocks[] = $isNational
                ? $this->geoBlock('4. RÉPARTITION PAR RÉGION', $groups, $groupFn)
                : $this->geoBlock('4. RÉPARTITION PAR DÉPARTEMENT', $this->collectGroups($records, $subFn), $subFn);

            return $blocks;
        };

        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0);
        $this->buildMultiSheetWorkbook($spreadsheet, $amendes, 'AMENDES ET PIÈCES SAISIES', 'dossiers',
            $periodLabel, $agentName, $indicators, $computeFn, $groupFn, $blocksBuilder);
        $spreadsheet->setActiveSheetIndex(0);
        return $this->mkResponse($spreadsheet, 'SYNTHESE_AMENDES_DSP');
    }

    // ─── Moteur générique ─────────────────────────────────────────────────────

    private function buildMultiSheetWorkbook(
        Spreadsheet $spreadsheet,
        Collection $records,
        string $entityTitle,
        string $entityLabel,
        string $periodLabel,
        string $agentName,
        array $indicators,
        callable $computeFn,
        callable $groupFn,
        callable $blocksBuilder
    ): void {
        $groups = $this->collectGroups($records, $groupFn);
        ksort($groups);

        // Feuille nationale
        $nationalBlocks = $blocksBuilder($records, true, 'NATIONAL', $groups);
        $this->buildSheet($spreadsheet, 'SYNTHÈSE NATIONALE',
            "SYNTHÈSE NATIONALE — {$entityTitle}", $entityLabel,
            $records, $periodLabel, $agentName, $indicators, $computeFn, $nationalBlocks);

        // Feuilles par groupe
        foreach ($groups as $groupName => $groupRecords) {
            $sheetTitle  = mb_substr($groupName, 0, 31);
            $groupBlocks = $blocksBuilder($groupRecords, false, $groupName, $groups);
            $this->buildSheet($spreadsheet, $sheetTitle,
                "SYNTHÈSE — {$entityTitle} — {$groupName}", $entityLabel,
                $groupRecords, $periodLabel, $agentName, $indicators, $computeFn, $groupBlocks);
        }
    }

    private function buildSheet(
        Spreadsheet $spreadsheet,
        string $sheetTitle,
        string $entityTitle,
        string $entityLabel,
        Collection $records,
        string $periodLabel,
        string $agentName,
        array $indicators,
        callable $computeFn,
        array $blocks
    ): void {
        $sheet         = $spreadsheet->createSheet();
        $sheet->setTitle($sheetTitle);
        $numDataCols   = count($indicators);
        $lastColLetter = Coordinate::stringFromColumnIndex($numDataCols + 1);

        $row = $this->buildSheetHeader($sheet, $lastColLetter, $entityTitle, $periodLabel, $agentName, $records->count(), $entityLabel);

        foreach ($blocks as $block) {
            $row = $this->writeBlock($sheet, $row, $block['title'], $indicators, $block['filters'], $records, $computeFn);
            $row++; // ligne vide entre blocs
        }

        $sheet->getColumnDimension('A')->setWidth(36);
        for ($c = 2; $c <= $numDataCols + 1; $c++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($c))->setWidth(16);
        }
        $sheet->freezePane('A6');
    }

    private function buildSheetHeader(
        Worksheet $sheet,
        string $lastColLetter,
        string $entityTitle,
        string $periodLabel,
        string $agentName,
        int $totalCount,
        string $entityLabel
    ): int {
        $row = 1;

        $sheet->mergeCells("A{$row}:{$lastColLetter}{$row}");
        $sheet->setCellValue("A{$row}", 'DIRECTION DE LA SÉCURITÉ PUBLIQUE — SÉNÉGAL (TERANGA GESCRIM)');
        $this->styleRange($sheet, "A{$row}:{$lastColLetter}{$row}", [
            'font'      => ['bold' => true, 'size' => 12, 'color' => ['argb' => 'FFFFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF' . self::COLOR_HEADER_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(22);
        $row++;

        $sheet->mergeCells("A{$row}:{$lastColLetter}{$row}");
        $sheet->setCellValue("A{$row}", $entityTitle);
        $this->styleRange($sheet, "A{$row}:{$lastColLetter}{$row}", [
            'font'      => ['bold' => true, 'size' => 11, 'color' => ['argb' => 'FF' . self::COLOR_HEADER_BG]],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF' . self::COLOR_META_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(18);
        $row++;

        $sheet->mergeCells("A{$row}:{$lastColLetter}{$row}");
        $sheet->setCellValue("A{$row}", "Période : {$periodLabel}   |   Généré le : " . now()->format('d/m/Y H:i') . "   |   Agent : {$agentName}");
        $this->styleRange($sheet, "A{$row}:{$lastColLetter}{$row}", [
            'font'      => ['size' => 9, 'color' => ['argb' => 'FF555555']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF' . self::COLOR_META_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(13);
        $row++;

        $sheet->mergeCells("A{$row}:{$lastColLetter}{$row}");
        $sheet->setCellValue("A{$row}", "Total {$entityLabel} dans la période : {$totalCount}");
        $this->styleRange($sheet, "A{$row}:{$lastColLetter}{$row}", [
            'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => 'FF' . self::COLOR_HEADER_BG]],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF' . self::COLOR_META_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
        ]);
        $row++;
        $row++; // ligne vide

        return $row;
    }

    private function writeBlock(
        Worksheet $sheet,
        int $startRow,
        string $blockTitle,
        array $indicators,
        array $categoryFilters,
        Collection $data,
        callable $computeFn
    ): int {
        $row     = $startRow;
        $numCols = count($indicators);
        $lastCol = Coordinate::stringFromColumnIndex($numCols + 1);

        // Titre du bloc
        $sheet->mergeCells("A{$row}:{$lastCol}{$row}");
        $sheet->setCellValue("A{$row}", $blockTitle);
        $this->styleRange($sheet, "A{$row}:{$lastCol}{$row}", [
            'font'      => ['bold' => true, 'size' => 10, 'color' => ['argb' => 'FFFFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF' . self::COLOR_BLOCK_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FF1B4332']]],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(16);
        $row++;

        // En-têtes indicateurs
        $sheet->setCellValue("A{$row}", 'Catégorie');
        for ($i = 0; $i < $numCols; $i++) {
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($i + 2) . $row, $indicators[$i]);
        }
        $this->styleRange($sheet, "A{$row}:{$lastCol}{$row}", [
            'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => 'FFFFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF' . self::COLOR_HEADER_BG]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFAAAAAA']]],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(15);
        $row++;

        // Lignes de données
        $totals  = array_fill(0, $numCols, 0);
        $dataIdx = 0;
        foreach ($categoryFilters as $label => $filterFn) {
            $subset = $filterFn($data);
            $values = $computeFn($subset);
            $sheet->setCellValue("A{$row}", $label);
            for ($i = 0; $i < $numCols; $i++) {
                $val = $values[$i] ?? 0;
                $sheet->setCellValue(Coordinate::stringFromColumnIndex($i + 2) . $row, $val);
                if (is_numeric($val)) $totals[$i] += $val;
            }
            $bgArgb = ($dataIdx % 2 === 0) ? 'FFFFF9E6' : 'FFFFFFFF';
            $this->styleRange($sheet, "A{$row}:{$lastCol}{$row}", [
                'font'      => ['size' => 9],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bgArgb]],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFDDDDDD']]],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getStyle(Coordinate::stringFromColumnIndex(2) . "{$row}:{$lastCol}{$row}")
                ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getRowDimension($row)->setRowHeight(13);
            $dataIdx++;
            $row++;
        }

        // Ligne TOTAL
        $sheet->setCellValue("A{$row}", 'TOTAL');
        for ($i = 0; $i < $numCols; $i++) {
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($i + 2) . $row, $totals[$i]);
        }
        $this->styleRange($sheet, "A{$row}:{$lastCol}{$row}", [
            'font'    => ['bold' => true, 'size' => 9, 'color' => ['argb' => 'FF' . self::COLOR_TOTAL_FG]],
            'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF' . self::COLOR_TOTAL_BG]],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FF' . self::COLOR_BORDER]]],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getStyle(Coordinate::stringFromColumnIndex(2) . "{$row}:{$lastCol}{$row}")
            ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getRowDimension($row)->setRowHeight(14);

        return $row + 1;
    }

    // ─── Fonctions de calcul des indicateurs (une par module) ─────────────────

    private function accidentIndicators(Collection $accidents): array
    {
        $count = $accidents->count();
        $tues = $bG = $bL = $indemnes = 0;
        foreach ($accidents as $a) {
            foreach ($a->victimes as $v) {
                if ($v->statut_deces) {
                    $tues++;
                } elseif (in_array(mb_strtolower($v->gravite_blessures ?? ''), ['grave', 'graves', 'sérieux', 'serieux'])) {
                    $bG++;
                } elseif (in_array(mb_strtolower($v->gravite_blessures ?? ''), ['léger', 'leger', 'légers', 'legers', 'mineur', 'mineurs', 'legere', 'légère'])) {
                    $bL++;
                } else {
                    $indemnes++;
                }
            }
        }
        return [$count, $tues, $bG, $bL, $indemnes, $tues + $bG + $bL + $indemnes];
    }

    private function infractionIndicators(Collection $infractions): array
    {
        $count = $infractions->count();
        $gav = $defere = $classe = $archive = $autre = 0;
        foreach ($infractions as $r) {
            $issue = mb_strtolower($r->issue ?? '');
            if (in_array($issue, ['garde à vue', 'garde_a_vue', 'gav'])) {
                $gav++;
            } elseif (in_array($issue, ['déféré', 'defere', 'déféré au parquet'])) {
                $defere++;
            } elseif (in_array($issue, ['classé', 'classe', 'classé sans suite'])) {
                $classe++;
            } elseif (in_array($issue, ['archivé', 'archive'])) {
                $archive++;
            } else {
                $autre++;
            }
        }
        return [$count, $gav, $defere, $classe, $archive, $autre];
    }

    private function immigrationIndicators(Collection $records): array
    {
        return [
            (int) $records->sum('nombre_interpellation'),
            (int) $records->sum('nombre_hommes'),
            (int) $records->sum('nombre_femmes'),
            (int) $records->sum('nombre_enfants'),
            (int) $records->sum('nombre_senegalais'),
            (int) $records->sum('nombre_etrangers'),
        ];
    }

    private function amendeIndicators(Collection $records): array
    {
        return [
            $records->count(),
            (int) $records->sum('montant'),
        ];
    }

    private function personnelIndicators(Collection $records): array
    {
        $count     = $records->count();
        $hommes    = $records->where('sexe', 'M')->count();
        $femmes    = $records->where('sexe', 'F')->count();
        $actifs    = $records->where('statut', 'actif')->count();
        $inactifs  = $records->filter(fn($r) => !in_array($r->statut, ['actif']))->count();
        $sanctionne= $records->filter(fn($r) => $r->sanction && $r->sanction !== '' && $r->sanction !== null)->count();
        return [$count, $hommes, $femmes, $actifs, $inactifs, $sanctionne];
    }

    private function victimeIndicators(Collection $records): array
    {
        $count  = $records->count();
        $deces  = $records->where('statut_deces', true)->count();
        $bG     = $records->filter(fn($v) => !$v->statut_deces && in_array(mb_strtolower($v->gravite_blessures ?? ''), ['grave', 'graves', 'sérieux', 'serieux']))->count();
        $bL     = $records->filter(fn($v) => !$v->statut_deces && in_array(mb_strtolower($v->gravite_blessures ?? ''), ['léger', 'leger', 'légers', 'legers', 'mineur', 'mineurs']))->count();
        $indem  = $records->filter(fn($v) => !$v->statut_deces && !$v->gravite_blessures)->count();
        return [$count, $deces, $bG, $bL, $indem];
    }

    // ─── Helpers blocs réutilisables ───────────────────────────────────────────

    private function moisBlock(string $title): array
    {
        $labels  = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        $filters = [];
        foreach ($labels as $i => $label) {
            $mn = $i + 1;
            $filters[$label] = fn($c) => $c->filter(fn($r) => $r->date && $r->date->month === $mn);
        }
        return ['title' => $title, 'filters' => $filters];
    }

    private function heuresBlock(string $title): array
    {
        return ['title' => $title, 'filters' => [
            '00h – 06h'   => fn($c) => $c->filter(fn($r) => $this->inTimeRange($r->heure, 0, 6)),
            '06h – 12h'   => fn($c) => $c->filter(fn($r) => $this->inTimeRange($r->heure, 6, 12)),
            '12h – 18h'   => fn($c) => $c->filter(fn($r) => $this->inTimeRange($r->heure, 12, 18)),
            '18h – 24h'   => fn($c) => $c->filter(fn($r) => $this->inTimeRange($r->heure, 18, 24)),
            'Non précisé' => fn($c) => $c->filter(fn($r) => !$r->heure),
        ]];
    }

    private function geoBlock(string $title, array $groups, callable $keyFn): array
    {
        $filters = [];
        foreach (array_keys($groups) as $key) {
            $k = $key;
            $filters[$k] = fn($c) => $c->filter(fn($r) => $keyFn($r) === $k);
        }
        if (empty($filters)) {
            $filters['(aucune donnée)'] = fn($c) => $c;
        }
        return ['title' => $title, 'filters' => $filters];
    }

    private function collectGroups(Collection $records, callable $keyFn): array
    {
        $groups = [];
        foreach ($records as $r) {
            $k = $keyFn($r);
            if (!isset($groups[$k])) {
                $groups[$k] = collect();
            }
            $groups[$k]->push($r);
        }
        ksort($groups);
        return $groups;
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────

    private function inTimeRange(?string $heure, int $from, int $to): bool
    {
        if (!$heure) return false;
        preg_match('/^(\d{1,2})/', trim($heure), $m);
        if (empty($m[1])) return false;
        $h = (int) $m[1];
        return $h >= $from && ($to === 24 ? $h < 24 : $h < $to);
    }

    private function mkResponse(Spreadsheet $spreadsheet, string $basename): Response
    {
        $tmpPath = tempnam(sys_get_temp_dir(), 'gescrim_');
        (new Xlsx($spreadsheet))->save($tmpPath);
        $content = file_get_contents($tmpPath);
        unlink($tmpPath);
        return response($content, 200, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $basename . '_' . now()->format('Y-m-d') . '.xlsx"',
            'Content-Length'      => strlen($content),
            'Cache-Control'       => 'no-cache, no-store, must-revalidate',
            'Pragma'              => 'no-cache',
        ]);
    }

    private function styleRange(Worksheet $sheet, string $range, array $styles): void
    {
        $style = $sheet->getStyle($range);
        if (isset($styles['font']))      $style->getFont()->applyFromArray($styles['font']);
        if (isset($styles['alignment'])) $style->getAlignment()->applyFromArray($styles['alignment']);
        if (isset($styles['borders']))   $style->getBorders()->applyFromArray($styles['borders']);
        if (isset($styles['fill']))      $style->getFill()->applyFromArray($styles['fill']);
    }
}
