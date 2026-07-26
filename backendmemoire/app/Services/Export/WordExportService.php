<?php

namespace App\Services\Export;

use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\SimpleType\TblWidth;
use PhpOffice\PhpWord\SimpleType\Jc;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;

class WordExportService
{
    private const COLOR_HEADER_BG = '1B4332';
    private const COLOR_HEADER_FG = 'FFFFFF';
    private const COLOR_BLOCK_BG  = '2D6A4F';
    private const COLOR_DATA_ODD  = 'FFFF00';
    private const COLOR_DATA_EVEN = 'FFFFFF';
    private const COLOR_TOTAL_BG  = 'C6F6D5';
    private const COLOR_TOTAL_FG  = '1B4332';
    private const COLOR_SUMMARY   = 'D9D9D9';
    private const COLOR_META_BG   = 'ECFDF5';
    private const COLOR_TITLE_FG  = '1B4332';

    // ─── Export plat original (inchangé pour rétrocompat) ────────────────────

    public function download(
        string $title,
        string $subtitle,
        string $agent,
        array  $headers,
        array  $rows,
        string $filename
    ): Response {
        $previousLevel = error_reporting(error_reporting() & ~E_DEPRECATED);
        $word    = $this->makeDoc();
        $section = $this->makeSection($word);

        $this->addDocHeader($section, $title, $subtitle, $agent);

        $this->addDataTable($section, $headers, $rows);

        $section->addTextBreak(1);
        $section->addText('Total : ' . count($rows) . ' enregistrement(s)',
            ['bold' => true, 'size' => 10, 'color' => self::COLOR_TITLE_FG]);
        $this->addFooter($section);

        error_reporting($previousLevel);
        return $this->mkResponse($word, $filename);
    }

    // ─── Synthèse structurée par module ──────────────────────────────────────

    public function downloadSynthese(
        string $title,
        string $subtitle,
        string $agent,
        string $filename,
        array  $summaryCards,   // [['label'=>'', 'value'=>''], ...]
        array  $blocks,         // [['title'=>'', 'headers'=>[], 'rows'=>[], 'totals'=>[]], ...]
        array  $detailHeaders,
        array  $detailRows,
        string $detailTitle = 'DÉTAIL COMPLET'
    ): Response {
        $previousLevel = error_reporting(error_reporting() & ~E_DEPRECATED);
        $word    = $this->makeDoc();
        $section = $this->makeSection($word);

        $this->addDocHeader($section, $title, $subtitle, $agent);

        // Cartes de synthèse (tableau 1 ligne)
        if (!empty($summaryCards)) {
            $this->addSummaryCards($section, $summaryCards);
        }

        // Blocs thématiques
        foreach ($blocks as $block) {
            $this->addBlock($section, $block['title'], $block['headers'], $block['rows'], $block['totals'] ?? []);
        }

        // Tableau détaillé
        $section->addTextBreak(1);
        $this->addSectionTitle($section, "{$detailTitle} (" . count($detailRows) . ')');
        $this->addDataTable($section, $detailHeaders, $detailRows);

        $section->addTextBreak(1);
        $section->addText('Total : ' . count($detailRows) . ' enregistrement(s)',
            ['bold' => true, 'size' => 10, 'color' => self::COLOR_TITLE_FG]);
        $this->addFooter($section);

        error_reporting($previousLevel);
        return $this->mkResponse($word, $filename);
    }

    // ─── Méthodes de haut niveau par module ──────────────────────────────────

    public function downloadAccidents(Collection $records, string $periodLabel, string $agentName): Response
    {
        $total   = $records->count();
        $tues    = $records->sum(fn($a) => $a->victimes->where('statut_deces', true)->count());
        $victTot = $records->sum(fn($a) => $a->victimes->count());
        $mortels = $records->where('type', 'mortel')->count();
        $corpor  = $records->where('type', 'corporel')->count();
        $materiel= $records->where('type', 'matériel')->count();

        $summaryCards = [
            ['label' => 'Total accidents', 'value' => $total],
            ['label' => 'Mortels',         'value' => $mortels],
            ['label' => 'Corporels',       'value' => $corpor],
            ['label' => 'Matériels',       'value' => $materiel],
            ['label' => 'Total victimes',  'value' => $victTot],
            ['label' => 'Tués',            'value' => $tues],
        ];

        $byType  = $records->groupBy('type');
        $typeRows = [];
        foreach ($byType as $type => $items) {
            $typeRows[] = [ucfirst($type ?: 'Autre'), $items->count(),
                $items->sum(fn($a) => $a->victimes->where('statut_deces', true)->count()),
                $items->sum(fn($a) => $a->victimes->count())];
        }

        $byCause = $records->groupBy('cause_probable');
        $causeRows = [];
        foreach ($byCause->take(10) as $cause => $items) {
            $causeRows[] = [ucfirst($cause ?: 'Non précisée'), $items->count(),
                round($items->count() / max($total, 1) * 100, 1) . '%'];
        }

        $byMois = [];
        $moisLabels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
        for ($m = 1; $m <= 12; $m++) {
            $n = $records->filter(fn($a) => $a->date && $a->date->month === $m)->count();
            if ($n > 0) $byMois[] = [$moisLabels[$m-1], $n];
        }

        $blocks = [
            ['title' => 'RÉPARTITION PAR TYPE D\'ACCIDENT',
             'headers' => ['Type', 'Nb accidents', 'Tués', 'Total victimes'],
             'rows'    => $typeRows,
             'totals'  => ['TOTAL', $total, $tues, $victTot]],
            ['title' => 'RÉPARTITION PAR CAUSE PROBABLE (TOP 10)',
             'headers' => ['Cause', 'Nb accidents', '%'],
             'rows'    => $causeRows,
             'totals'  => []],
            ['title' => 'RÉPARTITION MENSUELLE',
             'headers' => ['Mois', 'Nb accidents'],
             'rows'    => $byMois,
             'totals'  => ['TOTAL', $total]],
        ];

        $detailRows = $records->map(fn($a, $i) => [
            $i + 1, $a->date?->format('d/m/Y') ?? '-', $a->heure ?? '-',
            $a->type ?? '-', $a->lieu ?? '-', $a->commune->nom ?? '-',
            $a->moyen ?? '-', $a->cause_probable ?? '-', $a->victimes->count(),
        ])->values()->all();

        return $this->downloadSynthese(
            'Rapport des Accidents de Circulation', $periodLabel, $agentName,
            'accidents',
            $summaryCards, $blocks,
            ['#', 'Date', 'Heure', 'Type', 'Lieu', 'Commune', 'Moyen', 'Cause', 'Victimes'],
            $detailRows, 'DÉTAIL DES ACCIDENTS'
        );
    }

    public function downloadInfractions(Collection $records, string $periodLabel, string $agentName): Response
    {
        $total   = $records->count();
        $deferes = $records->filter(fn($r) => str_contains(mb_strtolower($r->issue ?? ''), 'déféré'))->count();
        $gav     = $records->filter(fn($r) => str_contains(mb_strtolower($r->issue ?? ''), 'garde'))->count();

        $summaryCards = [
            ['label' => 'Total infractions', 'value' => $total],
            ['label' => 'Déférés',           'value' => $deferes],
            ['label' => 'Garde à vue',       'value' => $gav],
            ['label' => 'Classés',           'value' => $records->filter(fn($r) => str_contains(mb_strtolower($r->issue ?? ''), 'class'))->count()],
        ];

        $byCat   = $records->groupBy(fn($r) => $r->typeInfraction?->categorieInfraction?->nom ?? 'Non classé');
        $catRows = [];
        foreach ($byCat as $cat => $items) {
            $catRows[] = [mb_substr($cat, 0, 35), $items->count(),
                round($items->count() / max($total, 1) * 100, 1) . '%'];
        }

        $byType  = $records->groupBy(fn($r) => $r->typeInfraction?->nom ?? 'Autre')->take(15);
        $typeRows= [];
        foreach ($byType as $type => $items) {
            $typeRows[] = [mb_substr($type, 0, 35), $items->count()];
        }

        $byIssue = $records->groupBy('issue');
        $issueRows = [];
        foreach ($byIssue as $issue => $items) {
            $issueRows[] = [ucfirst($issue ?: 'Non précisée'), $items->count(),
                round($items->count() / max($total, 1) * 100, 1) . '%'];
        }

        $blocks = [
            ['title' => 'RÉPARTITION PAR CATÉGORIE',
             'headers' => ['Catégorie', 'Nb infractions', '%'],
             'rows'    => $catRows,
             'totals'  => ['TOTAL', $total, '100%']],
            ['title' => 'TOP 15 TYPES D\'INFRACTION',
             'headers' => ['Type d\'infraction', 'Nb'],
             'rows'    => $typeRows,
             'totals'  => []],
            ['title' => 'RÉPARTITION PAR ISSUE',
             'headers' => ['Issue', 'Nb', '%'],
             'rows'    => $issueRows,
             'totals'  => ['TOTAL', $total, '100%']],
        ];

        $detailRows = $records->map(fn($r, $i) => [
            $i + 1, $r->date?->format('d/m/Y') ?? ($r->annee ?? '-'), $r->heure ?? '-',
            $r->lieu ?? '-', $r->commune->nom ?? '-',
            $r->typeInfraction->nom ?? '-',
            $r->typeInfraction?->categorieInfraction?->nom ?? '-',
            $r->issue ?? '-',
        ])->values()->all();

        return $this->downloadSynthese(
            'Rapport des Infractions Constatées', $periodLabel, $agentName,
            'infractions',
            $summaryCards, $blocks,
            ['#', 'Date', 'Heure', 'Lieu', 'Commune', 'Type', 'Catégorie', 'Issue'],
            $detailRows, 'DÉTAIL DES INFRACTIONS'
        );
    }

    public function downloadImmigrations(Collection $records, string $periodLabel, string $agentName): Response
    {
        $total   = (int) $records->sum('nombre_interpellation');
        $hommes  = (int) $records->sum('nombre_hommes');
        $femmes  = (int) $records->sum('nombre_femmes');
        $enfants = (int) $records->sum('nombre_enfants');
        $seneg   = (int) $records->sum('nombre_senegalais');
        $etr     = (int) $records->sum('nombre_etrangers');

        $summaryCards = [
            ['label' => 'Total interpellés', 'value' => $total],
            ['label' => 'Hommes',   'value' => $hommes],
            ['label' => 'Femmes',   'value' => $femmes],
            ['label' => 'Enfants',  'value' => $enfants],
            ['label' => 'Sénégalais', 'value' => $seneg],
            ['label' => 'Étrangers',  'value' => $etr],
        ];

        $byZone = $records->groupBy('zone_depart')->take(10);
        $zoneRows = [];
        foreach ($byZone as $zone => $items) {
            $zoneRows[] = [$zone ?: 'Non précisée', $items->count(),
                (int) $items->sum('nombre_interpellation')];
        }

        $byMois = [];
        $moisLabels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
        for ($m = 1; $m <= 12; $m++) {
            $n = $records->filter(fn($r) => $r->date && $r->date->month === $m)->count();
            if ($n > 0) {
                $byMois[] = [$moisLabels[$m-1], $n,
                    (int) $records->filter(fn($r) => $r->date && $r->date->month === $m)->sum('nombre_interpellation')];
            }
        }

        $blocks = [
            ['title' => 'RÉPARTITION PAR ZONE DE DÉPART (TOP 10)',
             'headers' => ['Zone de départ', 'Nb dossiers', 'Nb interpellés'],
             'rows'    => $zoneRows,
             'totals'  => []],
            ['title' => 'RÉPARTITION MENSUELLE',
             'headers' => ['Mois', 'Nb dossiers', 'Nb interpellés'],
             'rows'    => $byMois,
             'totals'  => ['TOTAL', $records->count(), $total]],
        ];

        $detailRows = $records->map(fn($r, $i) => [
            $i + 1, $r->date?->format('d/m/Y') ?? '-', $r->service->nom ?? '-',
            $r->nombre_interpellation ?? 0, $r->nombre_hommes ?? 0,
            $r->nombre_femmes ?? 0, $r->nombre_enfants ?? 0,
            $r->nombre_senegalais ?? 0, $r->nombre_etrangers ?? 0,
            $r->zone_depart ?? '-', $r->zone_arrivee_prevue ?? '-',
        ])->values()->all();

        return $this->downloadSynthese(
            'Rapport des Immigrations Clandestines', $periodLabel, $agentName,
            'immigrations',
            $summaryCards, $blocks,
            ['#', 'Date', 'Service', 'Total', 'H', 'F', 'Enf', 'Sén', 'Étr', 'Zone départ', 'Zone arrivée'],
            $detailRows, 'DÉTAIL DES INTERPELLATIONS'
        );
    }

    public function downloadAmendes(Collection $records, string $periodLabel, string $agentName): Response
    {
        $total   = $records->count();
        $montant = (int) $records->sum('montant');
        $amendes = $records->where('type', 'Amende')->count();
        $saisies = $records->where('type', 'Pièce saisie')->count();

        $summaryCards = [
            ['label' => 'Total dossiers',   'value' => $total],
            ['label' => 'Amendes',          'value' => $amendes],
            ['label' => 'Pièces saisies',   'value' => $saisies],
            ['label' => 'Montant (FCFA)',   'value' => number_format($montant, 0, ',', ' ')],
        ];

        $byType  = $records->groupBy('type');
        $typeRows = [];
        foreach ($byType as $type => $items) {
            $typeRows[] = [$type ?: 'Autre', $items->count(),
                number_format((int) $items->sum('montant'), 0, ',', ' ')];
        }

        $byMois = [];
        $moisLabels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
        for ($m = 1; $m <= 12; $m++) {
            $sub = $records->filter(fn($r) => $r->date && $r->date->month === $m);
            if ($sub->isNotEmpty()) {
                $byMois[] = [$moisLabels[$m-1], $sub->count(),
                    number_format((int) $sub->sum('montant'), 0, ',', ' ')];
            }
        }

        $blocks = [
            ['title' => 'RÉPARTITION PAR TYPE',
             'headers' => ['Type', 'Nb dossiers', 'Montant (FCFA)'],
             'rows'    => $typeRows,
             'totals'  => ['TOTAL', $total, number_format($montant, 0, ',', ' ')]],
            ['title' => 'RÉPARTITION MENSUELLE',
             'headers' => ['Mois', 'Nb dossiers', 'Montant (FCFA)'],
             'rows'    => $byMois,
             'totals'  => ['TOTAL', $total, number_format($montant, 0, ',', ' ')]],
        ];

        $detailRows = $records->map(fn($r, $i) => [
            $i + 1, $r->date?->format('d/m/Y') ?? '-', $r->type ?? '-',
            $r->service->nom ?? '-', number_format((int)($r->montant ?? 0), 0, ',', ' '),
            mb_substr($r->description ?? '-', 0, 45),
        ])->values()->all();

        return $this->downloadSynthese(
            'Rapport des Amendes et Pièces Saisies', $periodLabel, $agentName,
            'amendes',
            $summaryCards, $blocks,
            ['#', 'Date', 'Type', 'Service', 'Montant FCFA', 'Description'],
            $detailRows, 'DÉTAIL DES AMENDES & PIÈCES SAISIES'
        );
    }

    public function downloadPersonnels(Collection $records, string $periodLabel, string $agentName): Response
    {
        $total   = $records->count();
        $hommes  = $records->where('sexe', 'M')->count();
        $femmes  = $records->where('sexe', 'F')->count();
        $actifs  = $records->where('statut', 'actif')->count();

        $summaryCards = [
            ['label' => 'Total agents',  'value' => $total],
            ['label' => 'Hommes',        'value' => $hommes],
            ['label' => 'Femmes',        'value' => $femmes],
            ['label' => 'Actifs',        'value' => $actifs],
        ];

        $byGrade = $records->groupBy('grade');
        $gradeRows = [];
        foreach ($byGrade as $grade => $items) {
            $gradeRows[] = [$grade ?: 'Non précisé', $items->count(),
                $items->where('sexe', 'M')->count(),
                $items->where('sexe', 'F')->count()];
        }

        $byStatut = $records->groupBy('statut');
        $statutRows = [];
        foreach ($byStatut as $statut => $items) {
            $statutRows[] = [ucfirst($statut ?: 'Non précisé'), $items->count(),
                round($items->count() / max($total, 1) * 100, 1) . '%'];
        }

        $blocks = [
            ['title' => 'RÉPARTITION PAR GRADE',
             'headers' => ['Grade', 'Nb agents', 'Hommes', 'Femmes'],
             'rows'    => $gradeRows,
             'totals'  => ['TOTAL', $total, $hommes, $femmes]],
            ['title' => 'RÉPARTITION PAR STATUT',
             'headers' => ['Statut', 'Nb agents', '%'],
             'rows'    => $statutRows,
             'totals'  => ['TOTAL', $total, '100%']],
        ];

        $detailRows = $records->map(fn($r, $i) => [
            $i + 1, $r->ccap ?? '-',
            $r->prenom . ' ' . $r->nom,
            $r->grade ?? '-', $r->sexe ?? '-',
            $r->statut ?? '-', $r->service->nom ?? '-',
            $r->date_entree_corps?->format('d/m/Y') ?? '-',
        ])->values()->all();

        return $this->downloadSynthese(
            'Rapport du Personnel DSP', $periodLabel, $agentName,
            'personnels',
            $summaryCards, $blocks,
            ['#', 'CCAP', 'Nom Prénom', 'Grade', 'Sexe', 'Statut', 'Service', 'Entrée corps'],
            $detailRows, 'LISTE DU PERSONNEL'
        );
    }

    public function downloadVictimes(Collection $records, string $periodLabel, string $agentName): Response
    {
        $total  = $records->count();
        $deces  = $records->where('statut_deces', true)->count();
        $graves = $records->filter(fn($v) => !$v->statut_deces && in_array(mb_strtolower($v->gravite_blessures ?? ''), ['grave','graves','sérieux','serieux']))->count();
        $legers = $records->filter(fn($v) => !$v->statut_deces && in_array(mb_strtolower($v->gravite_blessures ?? ''), ['léger','leger','légers','legers','mineur','mineurs']))->count();

        $summaryCards = [
            ['label' => 'Total victimes',    'value' => $total],
            ['label' => 'Décédées',          'value' => $deces],
            ['label' => 'Blessées graves',   'value' => $graves],
            ['label' => 'Blessées légères',  'value' => $legers],
        ];

        $bySexe = [
            ['Masculin',    $records->where('sexe', 'M')->count()],
            ['Féminin',     $records->where('sexe', 'F')->count()],
            ['Non précisé', $records->filter(fn($v) => !in_array($v->sexe, ['M','F']))->count()],
        ];

        $byNat = $records->groupBy('nationalite')->sortByDesc(fn($c) => $c->count())->take(10);
        $natRows = [];
        foreach ($byNat as $nat => $items) {
            $natRows[] = [$nat ?: 'Non précisée', $items->count()];
        }

        $gravRows = [
            ['Décédées',         $deces,  round($deces / max($total, 1) * 100, 1) . '%'],
            ['Blessées graves',  $graves, round($graves / max($total, 1) * 100, 1) . '%'],
            ['Blessées légères', $legers, round($legers / max($total, 1) * 100, 1) . '%'],
            ['Indemnes',         $total - $deces - $graves - $legers, ''],
        ];

        $blocks = [
            ['title' => 'RÉPARTITION PAR GRAVITÉ',
             'headers' => ['Catégorie', 'Nb', '%'],
             'rows'    => $gravRows,
             'totals'  => ['TOTAL', $total, '100%']],
            ['title' => 'RÉPARTITION PAR SEXE',
             'headers' => ['Sexe', 'Nb'],
             'rows'    => $bySexe,
             'totals'  => ['TOTAL', $total]],
            ['title' => 'TOP 10 NATIONALITÉS',
             'headers' => ['Nationalité', 'Nb'],
             'rows'    => $natRows,
             'totals'  => []],
        ];

        $detailRows = $records->map(fn($r, $i) => [
            $i + 1, $r->prenom . ' ' . $r->nom, $r->sexe ?? '-',
            $r->age ?? '-', $r->nationalite ?? '-',
            $r->gravite_blessures ?? '-',
            $r->statut_deces ? 'OUI' : 'non',
            $r->accident_id ? 'Accident #' . $r->accident_id : ($r->infraction_id ? 'Infraction #' . $r->infraction_id : '-'),
        ])->values()->all();

        return $this->downloadSynthese(
            'Rapport des Victimes et Impliqués', $periodLabel, $agentName,
            'victimes',
            $summaryCards, $blocks,
            ['#', 'Nom Prénom', 'Sexe', 'Âge', 'Nationalité', 'Gravité', 'Décédé', 'Lié à'],
            $detailRows, 'LISTE DES VICTIMES'
        );
    }

    public function downloadServicesRemuneres(Collection $records, string $periodLabel, string $agentName): Response
    {
        $total   = $records->count();
        $montant = (int) $records->sum('montant');

        $summaryCards = [
            ['label' => 'Total prestations', 'value' => $total],
            ['label' => 'Montant (FCFA)',    'value' => number_format($montant, 0, ',', ' ')],
            ['label' => 'Montant moyen',     'value' => number_format($total > 0 ? (int)($montant / $total) : 0, 0, ',', ' ')],
            ['label' => 'Services actifs',   'value' => $records->pluck('service_id')->unique()->count()],
        ];

        $byLibelle = $records->groupBy('libelle')->sortByDesc(fn($c) => $c->count())->take(10);
        $libelleRows = [];
        foreach ($byLibelle as $lib => $items) {
            $libelleRows[] = [mb_substr($lib ?: 'Autre', 0, 35), $items->count(),
                number_format((int)$items->sum('montant'), 0, ',', ' ')];
        }

        $byMois = [];
        $moisLabels = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
        for ($m = 1; $m <= 12; $m++) {
            $sub = $records->filter(fn($r) => $r->date && $r->date->month === $m);
            if ($sub->isNotEmpty()) {
                $byMois[] = [$moisLabels[$m-1], $sub->count(),
                    number_format((int)$sub->sum('montant'), 0, ',', ' ')];
            }
        }

        $blocks = [
            ['title' => 'TOP 10 PRESTATIONS',
             'headers' => ['Libellé', 'Nb', 'Montant (FCFA)'],
             'rows'    => $libelleRows,
             'totals'  => ['TOTAL', $total, number_format($montant, 0, ',', ' ')]],
            ['title' => 'RÉPARTITION MENSUELLE',
             'headers' => ['Mois', 'Nb prestations', 'Montant (FCFA)'],
             'rows'    => $byMois,
             'totals'  => ['TOTAL', $total, number_format($montant, 0, ',', ' ')]],
        ];

        $detailRows = $records->map(fn($r, $i) => [
            $i + 1, $r->date?->format('d/m/Y') ?? '-',
            mb_substr($r->libelle ?? '-', 0, 30),
            $r->service->nom ?? '-', $r->commune->nom ?? '-',
            number_format((int)($r->montant ?? 0), 0, ',', ' '),
        ])->values()->all();

        return $this->downloadSynthese(
            'Rapport des Services Rémunérés', $periodLabel, $agentName,
            'services_remuneres',
            $summaryCards, $blocks,
            ['#', 'Date', 'Libellé', 'Service', 'Commune', 'Montant FCFA'],
            $detailRows, 'DÉTAIL DES PRESTATIONS'
        );
    }

    // ─── Primitives de construction Word ─────────────────────────────────────

    private function makeDoc(): PhpWord
    {
        $word = new PhpWord();
        $word->setDefaultFontName('Arial');
        $word->setDefaultFontSize(10);
        return $word;
    }

    private function makeSection(PhpWord $word): \PhpOffice\PhpWord\Element\Section
    {
        return $word->addSection([
            'marginTop'    => 600,
            'marginBottom' => 600,
            'marginLeft'   => 800,
            'marginRight'  => 800,
            'orientation'  => \PhpOffice\PhpWord\Style\Section::ORIENTATION_LANDSCAPE,
        ]);
    }

    private function addDocHeader(\PhpOffice\PhpWord\Element\Section $section, string $title, string $subtitle, string $agent): void
    {
        $section->addText('RÉPUBLIQUE DU SÉNÉGAL — MINISTÈRE DE L\'INTÉRIEUR',
            ['size' => 8, 'color' => '4a5568'], ['alignment' => Jc::CENTER]);
        $section->addText('DIRECTION DE LA SÉCURITÉ PUBLIQUE — TERANGA GESCRIM',
            ['bold' => true, 'size' => 13, 'color' => self::COLOR_TITLE_FG], ['alignment' => Jc::CENTER]);
        $section->addText(strtoupper($title),
            ['bold' => true, 'size' => 12, 'color' => '2d3748'], ['alignment' => Jc::CENTER]);
        $section->addText('Période : ' . $subtitle . '   |   Généré le : ' . now()->format('d/m/Y H:i') . '   |   Agent : ' . $agent,
            ['size' => 9, 'color' => '555555'], ['alignment' => Jc::CENTER]);
        $section->addTextBreak(1);
    }

    private function addSummaryCards(\PhpOffice\PhpWord\Element\Section $section, array $cards): void
    {
        $count    = count($cards);
        $colWidth = (int) floor(15000 / max($count, 1));

        $table = $section->addTable([
            'borderSize' => 4, 'borderColor' => 'CCCCCC',
            'cellMargin' => 80, 'width' => 100, 'unit' => TblWidth::PERCENT,
        ]);
        $table->addRow(600);
        foreach ($cards as $card) {
            $cell = $table->addCell($colWidth, ['bgColor' => self::COLOR_SUMMARY, 'valign' => 'center']);
            $cell->addText((string) $card['value'],
                ['bold' => true, 'size' => 16, 'color' => self::COLOR_HEADER_BG],
                ['alignment' => Jc::CENTER]);
            $cell->addText(mb_strtoupper($card['label']),
                ['size' => 7, 'color' => '4a5568'],
                ['alignment' => Jc::CENTER]);
        }
        $section->addTextBreak(1);
    }

    private function addSectionTitle(\PhpOffice\PhpWord\Element\Section $section, string $title): void
    {
        $table = $section->addTable(['width' => 100, 'unit' => TblWidth::PERCENT]);
        $table->addRow(320);
        $cell = $table->addCell(15000, ['bgColor' => self::COLOR_HEADER_BG]);
        $cell->addText($title,
            ['bold' => true, 'size' => 10, 'color' => self::COLOR_HEADER_FG],
            ['alignment' => Jc::LEFT, 'spaceAfter' => 0]);
        $section->addTextBreak(0);
    }

    private function addBlock(
        \PhpOffice\PhpWord\Element\Section $section,
        string $blockTitle,
        array $headers,
        array $rows,
        array $totals = []
    ): void {
        $section->addTextBreak(1);
        $this->addSectionTitle($section, $blockTitle);
        $this->addDataTable($section, $headers, $rows, $totals);
    }

    private function addDataTable(
        \PhpOffice\PhpWord\Element\Section $section,
        array $headers,
        array $rows,
        array $totals = []
    ): void {
        $colCount = count($headers);
        $colWidth = (int) floor(15000 / max($colCount, 1));

        $table = $section->addTable([
            'borderSize' => 4, 'borderColor' => 'CCCCCC',
            'cellMargin' => 60, 'width' => 100, 'unit' => TblWidth::PERCENT,
        ]);

        // En-tête
        $table->addRow(400);
        foreach ($headers as $header) {
            $cell = $table->addCell($colWidth, ['bgColor' => self::COLOR_HEADER_BG, 'valign' => 'center']);
            $cell->addText((string) $header,
                ['color' => self::COLOR_HEADER_FG, 'bold' => true, 'size' => 8],
                ['alignment' => Jc::CENTER]);
        }

        // Données
        foreach ($rows as $i => $row) {
            $bgColor = ($i % 2 === 0) ? self::COLOR_DATA_ODD : self::COLOR_DATA_EVEN;
            $table->addRow(300);
            foreach ($row as $col => $value) {
                $cell = $table->addCell($colWidth, ['bgColor' => $bgColor, 'valign' => 'center']);
                $align = ($col === 0) ? Jc::LEFT : Jc::CENTER;
                $cell->addText((string)($value ?? '-'), ['size' => 8], ['alignment' => $align]);
            }
        }

        // Totaux
        if (!empty($totals)) {
            $table->addRow(340);
            foreach ($totals as $col => $value) {
                $cell = $table->addCell($colWidth, ['bgColor' => self::COLOR_TOTAL_BG, 'valign' => 'center']);
                $align = ($col === 0) ? Jc::LEFT : Jc::CENTER;
                $cell->addText((string)($value ?? ''),
                    ['bold' => true, 'size' => 8.5, 'color' => self::COLOR_TOTAL_FG],
                    ['alignment' => $align]);
            }
        }
    }

    private function addFooter(\PhpOffice\PhpWord\Element\Section $section): void
    {
        $section->addTextBreak(1);
        $section->addText(
            'Teranga GESCRIM — Rapport confidentiel — Accès réservé au personnel autorisé',
            ['size' => 8, 'color' => 'AAAAAA'], ['alignment' => Jc::CENTER]);
    }

    private function mkResponse(PhpWord $word, string $filename): Response
    {
        $tmpPath = tempnam(sys_get_temp_dir(), 'gescrim_docx_');
        $previousLevel = error_reporting(error_reporting() & ~E_DEPRECATED);
        try {
            IOFactory::createWriter($word, 'Word2007')->save($tmpPath);
        } finally {
            error_reporting($previousLevel);
        }
        $content  = file_get_contents($tmpPath);
        unlink($tmpPath);
        $fullName = $filename . '_' . now()->format('Y-m-d') . '.docx';
        return response($content, 200, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => 'attachment; filename="' . $fullName . '"',
            'Content-Length'      => strlen($content),
            'Cache-Control'       => 'no-cache, no-store, must-revalidate',
            'Pragma'              => 'no-cache',
        ]);
    }
}
