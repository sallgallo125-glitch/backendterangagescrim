<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Service;
use App\Models\TypeInfraction;
use Carbon\Carbon;

class DataSeeder extends Seeder
{
    private array $svcMap   = [];
    private array $typeMap  = [];
    private array $coordMap = [];
    private int   $uid      = 1;

    // GPS coords (lat, lng) for each commissariat key — used to geo-tag seeded records
    private array $svcCoords = [
        'dakar'       => [14.6937, -17.4441],
        'guediawaye'  => [14.7731, -17.3895],
        'rufisque'    => [14.7156, -17.2712],
        'thies'       => [14.7889, -16.9261],
        'mbour'       => [14.3973, -16.9651],
        'tivaouane'   => [14.9490, -16.8200],
        'kaolack'     => [14.1520, -16.0726],
        'kaffrine'    => [14.1060, -15.5508],
        'saint-louis' => [16.0178, -16.4896],
        'louga'       => [15.6167, -16.2242],
        'kebemer'     => [15.3700, -16.4500],
        'diourbel'    => [14.6557, -16.2318],
        'bambey'      => [14.7031, -16.4533],
        'mbacke'      => [14.7948, -15.9097],
        'touba'       => [14.8508, -15.8817],
        'ziguinchor'  => [12.5563, -16.2719],
        'tamba'       => [13.7707, -13.6673],
        'kolda'       => [12.8952, -14.9490],
        'fatick'      => [14.3394, -16.4072],
        'matam'       => [15.6550, -13.2512],
    ];

    public function run(): void
    {
        DB::transaction(function () {
            $this->loadLookups();
            $this->seedWeeklyAccidents();
            $this->seedYearlyAccidents();
            $this->seedWeeklyInfractions();
            $this->seedAmendesPieces();
        });
    }

    // ------------------------------------------------------------------ lookups

    private function loadLookups(): void
    {
        foreach (Service::with('commune')->get() as $s) {
            $this->svcMap[mb_strtolower(trim($s->nom))] = $s;
        }
        foreach (TypeInfraction::all() as $t) {
            $this->typeMap[mb_strtolower(trim($t->nom))] = $t->id;
        }
        $this->uid = DB::table('users')->value('id');
    }

    private function svc(string $key): ?Service
    {
        $k = mb_strtolower(trim($key));
        $map = [
            'dakar'       => 'commissariat central de dakar',
            'guediawaye'  => 'commissariat central de guédiawaye',
            'rufisque'    => 'commissariat central de rufisque',
            'thies'       => 'commissariat de thiès',
            'mbour'       => 'commissariat de mbour',
            'tivaouane'   => 'commissariat de tivaouane',
            'kaolack'     => 'commissariat central de kaolack',
            'kaffrine'    => 'commissariat de kaffrine',
            'saint-louis' => 'commissariat central de saint-louis',
            'louga'       => 'commissariat de louga',
            'kebemer'     => 'commissariat de kébémer',
            'diourbel'    => 'commissariat de diourbel',
            'bambey'      => 'commissariat de bambey',
            'mbacke'      => 'commissariat de mbacké',
            'touba'       => 'commissariat spécial de touba',
            'ziguinchor'  => 'commissariat central de ziguinchor',
            'tamba'       => 'commissariat de tambacounda',
            'kolda'       => 'commissariat de kolda',
            'fatick'      => 'commissariat de fatick',
            'matam'       => 'commissariat de matam',
        ];
        $dbName = $map[$k] ?? null;
        return $dbName ? ($this->svcMap[$dbName] ?? null) : null;
    }

    // Returns [lat, lng] with small random offset (±0.02°  ≈ ±2 km) for map variety
    private function coords(string $key): array
    {
        $base = $this->svcCoords[$key] ?? null;
        if (!$base) return [null, null];
        $jitter = fn() => (mt_rand(-200, 200)) / 10000.0; // ±0.02°
        return [round($base[0] + $jitter(), 6), round($base[1] + $jitter(), 6)];
    }

    private function tid(string $name): ?int
    {
        $aliases = [
            'homicide volontaire'       => 'meurtre',
            'homicide involontaire'     => 'homicide involontaire',
            'cbv'                       => 'coups et blessures volontaires',
            'adt'                       => 'violence conjugale',
            'mœurs'                     => 'viol',
            'moeurs'                    => 'viol',
            'vol avec violence'         => 'vol à main armée',
            'vol avec effra-cambriolage'=> 'vol avec effraction',
            'vol avec effrac-cambriolage'=> 'vol avec effraction',
            'voln avec effrac- cambriolage' => 'vol avec effraction',
            'vol de vehicule'           => 'vol simple',
            "vol à l'arracher"          => 'vol simple',
            'vol de betail'             => 'vol simple',
            'vols simples'              => 'vol simple',
            'vols'                      => 'vol simple',
            'vol'                       => 'vol simple',
            'recel'                     => 'recel',
            'abus de confiance'         => 'abus de confiance',
            'escroquerie'               => 'escroquerie',
            'outrage rebellions'        => 'outrage à agent',
            'outrage -rebellions'       => 'outrage à agent',
            'outrage/rebellion'         => 'outrage à agent',
            'prostitution'              => 'vagabondage',
            'ipm'                       => 'ivresse publique',
            'usage de ci'               => 'détention de chanvre indien',
            'usage de chanvre indien'   => 'détention de chanvre indien',
            'trafic de ci'              => 'trafic de drogue',
            'trafic de chanvre indien'  => 'trafic de drogue',
            'usurpation'                => "usurpation d'identité",
            "port d'arme"               => "détention d'arme à feu",
            'usage de drogue dure'      => 'trafic de drogue',
            'trafic de drogue dure'     => 'trafic de drogue',
            'trafi de drogue dure'      => 'trafic de drogue',
            'trafic de drogue dure'     => 'trafic de drogue',
            'divers publique'           => 'vagabondage',
            'divers personnes'          => 'coups et blessures volontaires',
        ];
        $k  = mb_strtolower(trim($name));
        $k2 = $aliases[$k] ?? $k;
        return $this->typeMap[$k2] ?? null;
    }

    // ------------------------------------------------------------------ accidents hebdomadaires (semaine 30/05 – 05/06/2024)

    private function seedWeeklyAccidents(): void
    {
        // [region_key => [matériel, corporel, mortel]]
        $weekAcc = [
            'DAKAR'       => [14, 8,  0],
            'GUEDIAWAYE'  => [21, 12, 1],
            'RUFISQUE'    => [9,  4,  0],
            'THIES'       => [6,  5,  0],
            'MBOUR'       => [3,  1,  0],
            'TIVAOUANE'   => [0,  1,  0],
            'KAOLACK'     => [4,  3,  0],
            'KAFFRINE'    => [1,  1,  0],
            'SAINT-LOUIS' => [5,  5,  0],
            'LOUGA'       => [3,  2,  0],
            'KEBEMER'     => [1,  2,  0],
            'DIOURBEL'    => [1,  0,  0],
            'MBACKE'      => [1,  2,  0],
            'TOUBA'       => [5,  4,  0],
            'ZIGUINCHOR'  => [3,  2,  0],
            'TAMBA'       => [7,  3,  1],
            'KOLDA'       => [5,  1,  0],
            'FATICK'      => [1,  1,  0],
            'MATAM'       => [1,  0,  0],
        ];

        $types  = ['matériel', 'corporel', 'mortel'];
        $rows   = [];
        $now    = now();
        $weekStart = Carbon::create(2024, 5, 30);

        foreach ($weekAcc as $key => $counts) {
            $s    = $this->svc(strtolower($key));
            if (!$s) continue;
            $cKey = strtolower($key);
            foreach ($types as $i => $type) {
                $n = $counts[$i];
                for ($j = 0; $j < $n; $j++) {
                    $date = $weekStart->copy()->addDays($j % 7);
                    [$lat, $lng] = $this->coords($cKey);
                    $rows[] = [
                        'type'           => $type,
                        'date'           => $date->toDateString(),
                        'lieu'           => 'Zone ' . ucfirst(strtolower($key)),
                        'commune_id'     => $s->commune_id,
                        'service_id'     => $s->id,
                        'cause_probable' => 'Statistique hebdomadaire DSP – sem. 30/05-05/06/2024',
                        'latitude'       => $lat,
                        'longitude'      => $lng,
                        'sync_status'    => 'synced',
                        'user_id'        => $this->uid,
                        'created_at'     => $now,
                        'updated_at'     => $now,
                    ];
                }
            }
        }
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('accidents')->insert($chunk);
        }
    }

    // ------------------------------------------------------------------ accidents annuels 2021-2023

    private function seedYearlyAccidents(): void
    {
        // [année => [matériel, corporel, mortel]]
        $yearly = [
            2021 => [3306, 2476, 176],
            2022 => [2082, 1450, 87],
            2023 => [3306, 2582, 154],
        ];

        $mainServices = [
            'dakar', 'guediawaye', 'rufisque', 'thies', 'mbour',
            'saint-louis', 'kaolack', 'ziguinchor', 'tamba', 'kolda',
            'diourbel', 'touba', 'fatick', 'louga', 'kaffrine',
            'matam', 'kebemer', 'tivaouane', 'bambey', 'mbacke',
        ];

        $types   = ['matériel', 'corporel', 'mortel'];
        $rows    = [];
        $now     = now();
        $nSvc    = count($mainServices);

        foreach ($yearly as $year => $counts) {
            foreach ($types as $ti => $type) {
                $total = $counts[$ti];
                // Distribute evenly per month per service (sample 1/3 of total)
                $sample     = (int) ceil($total / 3);
                $perMonthSvc = max(1, (int) floor($sample / (12 * $nSvc)));

                foreach ($mainServices as $si => $key) {
                    $s = $this->svc($key);
                    if (!$s) continue;
                    for ($m = 1; $m <= 12; $m++) {
                        for ($k = 0; $k < $perMonthSvc; $k++) {
                            [$lat, $lng] = $this->coords($key);
                            $rows[] = [
                                'type'           => $type,
                                'date'           => Carbon::create($year, $m, rand(1, 28))->toDateString(),
                                'lieu'           => 'Données annuelles ' . $year,
                                'commune_id'     => $s->commune_id,
                                'service_id'     => $s->id,
                                'cause_probable' => "Statistiques annuelles DSP {$year}",
                                'latitude'       => $lat,
                                'longitude'      => $lng,
                                'sync_status'    => 'synced',
                                'user_id'        => $this->uid,
                                'created_at'     => $now,
                                'updated_at'     => $now,
                            ];
                        }
                    }
                }
            }
        }
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('accidents')->insert($chunk);
        }
    }

    // ------------------------------------------------------------------ infractions hebdomadaires

    private function seedWeeklyInfractions(): void
    {
        // Données semaine 30/05 – 05/06/2024
        // Format : [type_label => [service_key => count, ...]]
        $data = [
            'Homicide Involontaire' => ['GUEDIAWAYE' => 1],
            'CBV'                   => ['DAKAR' => 1, 'GUEDIAWAYE' => 3, 'RUFISQUE' => 3,
                                        'THIES' => 1, 'SAINT-LOUIS' => 2,
                                        'TOUBA' => 1, 'ZIGUINCHOR' => 1, 'TAMBA' => 3, 'KOLDA' => 2],
            'Mœurs'                 => ['DAKAR' => 12, 'GUEDIAWAYE' => 17,
                                        'THIES' => 4, 'MBOUR' => 12, 'KAOLACK' => 6,
                                        'SAINT-LOUIS' => 2, 'MBACKE' => 16, 'TOUBA' => 2,
                                        'ZIGUINCHOR' => 4, 'KOLDA' => 3],
            'Divers personnes'      => ['DAKAR' => 1, 'GUEDIAWAYE' => 1, 'RUFISQUE' => 1,
                                        'KAOLACK' => 1, 'SAINT-LOUIS' => 2],
            'Vol avec violence'     => ['DAKAR' => 2, 'GUEDIAWAYE' => 2, 'MATAM' => 1],
            'Vols simples'          => ['DAKAR' => 21, 'GUEDIAWAYE' => 18, 'RUFISQUE' => 2,
                                        'THIES' => 1, 'MBOUR' => 22, 'KAOLACK' => 4,
                                        'SAINT-LOUIS' => 7, 'LOUGA' => 1,
                                        'DIOURBEL' => 6, 'MBACKE' => 2, 'TOUBA' => 19,
                                        'TAMBA' => 5, 'KOLDA' => 8],
            'Recel'                 => ['GUEDIAWAYE' => 3, 'RUFISQUE' => 3,
                                        'SAINT-LOUIS' => 1, 'LOUGA' => 2,
                                        'TOUBA' => 5, 'KOLDA' => 3],
            'Abus de confiance'     => ['DAKAR' => 3, 'GUEDIAWAYE' => 4, 'RUFISQUE' => 2,
                                        'THIES' => 2, 'KAOLACK' => 1,
                                        'SAINT-LOUIS' => 2, 'LOUGA' => 1,
                                        'TAMBA' => 3, 'KOLDA' => 1, 'MATAM' => 1],
            'Escroquerie'           => ['DAKAR' => 4, 'GUEDIAWAYE' => 6,
                                        'MBOUR' => 1, 'KAOLACK' => 1,
                                        'SAINT-LOUIS' => 5, 'ZIGUINCHOR' => 2],
            'Outrage rebellions'    => ['DAKAR' => 1, 'GUEDIAWAYE' => 1,
                                        'MBOUR' => 1, 'MATAM' => 2],
            'Prostitution'          => ['GUEDIAWAYE' => 2, 'TOUBA' => 2, 'TAMBA' => 5],
            'Usage de CI'           => ['DAKAR' => 19, 'GUEDIAWAYE' => 7, 'RUFISQUE' => 9,
                                        'THIES' => 2, 'MBOUR' => 3,
                                        'KAOLACK' => 1, 'LOUGA' => 1,
                                        'DIOURBEL' => 1, 'BAMBEY' => 2, 'MBACKE' => 10, 'TOUBA' => 3,
                                        'ZIGUINCHOR' => 5],
            'Trafic de CI'          => ['DAKAR' => 3, 'THIES' => 1,
                                        'MBOUR' => 2, 'KEBEMER' => 1],
            "Port d'arme"           => ['GUEDIAWAYE' => 2, 'LOUGA' => 2, 'TOUBA' => 1],
            'Usage de drogue dure'  => ['DAKAR' => 4, 'MBOUR' => 2],
            'Trafic de drogue dure' => ['DAKAR' => 1],
            'IPM'                   => ['DAKAR' => 113, 'GUEDIAWAYE' => 71, 'RUFISQUE' => 7,
                                        'THIES' => 8, 'MBOUR' => 8, 'KAOLACK' => 3,
                                        'SAINT-LOUIS' => 9, 'KEBEMER' => 5,
                                        'DIOURBEL' => 1, 'BAMBEY' => 2, 'MBACKE' => 2,
                                        'TAMBA' => 32, 'KOLDA' => 9, 'FATICK' => 3, 'MATAM' => 1],
            'Homicide Volontaire'   => ['MATAM' => 3],
        ];

        $rows      = [];
        $now       = now();
        $weekStart = Carbon::create(2024, 5, 30);

        foreach ($data as $typeLabel => $services) {
            $tid = $this->tid($typeLabel);
            if (!$tid) continue;

            foreach ($services as $svcKey => $count) {
                $s = $this->svc(strtolower($svcKey));
                if (!$s) continue;

                for ($i = 0; $i < $count; $i++) {
                    $date  = $weekStart->copy()->addDays($i % 7);
                    $issue = ($i % 5 === 0) ? 'Déférée' : 'Constatée';
                    [$lat, $lng] = $this->coords(strtolower($svcKey));
                    $rows[] = [
                        'type_infraction_id' => $tid,
                        'service_id'         => $s->id,
                        'commune_id'         => $s->commune_id,
                        'annee'              => 2024,
                        'date'               => $date->toDateString(),
                        'lieu'               => 'Zone ' . ucfirst(strtolower($svcKey)),
                        'issue'              => $issue,
                        'latitude'           => $lat,
                        'longitude'          => $lng,
                        'sync_status'        => 'synced',
                        'user_id'            => $this->uid,
                        'created_at'         => $now,
                        'updated_at'         => $now,
                    ];
                }
            }
        }
        foreach (array_chunk($rows, 300) as $chunk) {
            DB::table('infractions')->insert($chunk);
        }
    }

    // ------------------------------------------------------------------ amendes et pièces saisies

    private function seedAmendesPieces(): void
    {
        // Données semaine 30/05 – 05/06/2024
        // [service_key => [amendes_forfaitaires, pieces_saisies]]
        $weekData = [
            'DAKAR'       => [49,   755],
            'GUEDIAWAYE'  => [473,  1270],
            'RUFISQUE'    => [213,  784],
            'THIES'       => [951,  622],
            'MBOUR'       => [6409, 1521],
            'TIVAOUANE'   => [155,  79],
            'KAOLACK'     => [771,  353],
            'KAFFRINE'    => [852,  231],
            'SAINT-LOUIS' => [456,  498],
            'LOUGA'       => [54,   464],
            'KEBEMER'     => [336,  112],
            'DIOURBEL'    => [312,  104],
            'BAMBEY'      => [248,  58],
            'MBACKE'      => [346,  250],
            'TOUBA'       => [737,  511],
            'ZIGUINCHOR'  => [330,  319],
            'TAMBA'       => [849,  89],
            'KOLDA'       => [728,  171],
            'FATICK'      => [1043, 41],
            'MATAM'       => [39,   27],
        ];

        $rows = [];
        $now  = now();
        $date = '2024-06-05'; // fin de semaine

        foreach ($weekData as $key => [$amendes, $pieces]) {
            $s = $this->svc(strtolower($key));
            if (!$s) continue;

            if ($amendes > 0) {
                $rows[] = [
                    'type'        => 'Amende',
                    'service_id'  => $s->id,
                    'date'        => $date,
                    'montant'     => $amendes * 1000, // forfait 1 000 FCFA par amende
                    'description' => "Amendes forfaitaires semaine 30/05-05/06/2024 – {$amendes} amendes",
                    'user_id'     => $this->uid,
                    'created_at'  => $now,
                    'updated_at'  => $now,
                ];
            }
            if ($pieces > 0) {
                $rows[] = [
                    'type'        => 'Pièce saisie',
                    'service_id'  => $s->id,
                    'date'        => $date,
                    'montant'     => $pieces * 500, // valeur estimée 500 FCFA par pièce
                    'description' => "Pièces saisies semaine 30/05-05/06/2024 – {$pieces} pièces",
                    'user_id'     => $this->uid,
                    'created_at'  => $now,
                    'updated_at'  => $now,
                ];
            }
        }
        DB::table('amendes_pieces_saisies')->insert($rows);
    }
}
