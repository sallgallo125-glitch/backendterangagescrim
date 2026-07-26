<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Service;
use App\Models\Infraction;
use App\Models\Accident;
use Carbon\Carbon;

/**
 * Seeder pour les données manquantes : Personnel, Immigration, Victimes.
 * Données cohérentes avec le contexte sénégalais DSP.
 */
class RealisticDataSeeder extends Seeder
{
    private int $userId = 1;
    private array $svcByName = [];

    // Prénoms et noms sénégalais courants
    private array $prenomsMasc = [
        'Mamadou', 'Ibrahima', 'Cheikh', 'Ousmane', 'Abdoulaye', 'Moussa',
        'Modou', 'Aliou', 'Pape', 'Saliou', 'Boubacar', 'Ismaila',
        'Babacar', 'Assane', 'Gora', 'Lamine', 'Landing', 'Demba',
    ];
    private array $prenomsFem = [
        'Fatou', 'Aminata', 'Mariama', 'Aïssatou', 'Ndeye', 'Rokhaya',
        'Seynabou', 'Astou', 'Coumba', 'Dieynaba', 'Khady', 'Yacine',
    ];
    private array $noms = [
        'Diallo', 'Ndiaye', 'Fall', 'Sow', 'Ba', 'Diop', 'Sarr', 'Gueye',
        'Mbaye', 'Ndour', 'Diouf', 'Faye', 'Thiongane', 'Cissé', 'Coulibaly',
        'Badji', 'Diatta', 'Coly', 'Mendy', 'Dieme',
    ];
    private array $grades = [
        'Commissaire Principal',  'Commissaire', 'Commandant',
        'Lieutenant de Police',   'Inspecteur Principal', 'Inspecteur de Police',
        'Brigadier-chef',         'Brigadier',   'Gardien de la Paix',
    ];
    // Distribution réaliste : beaucoup de gardiens, peu de commissaires
    private array $gradeWeights = [1, 2, 3, 5, 6, 8, 12, 18, 45];

    private array $villes = [
        'Dakar', 'Thiès', 'Saint-Louis', 'Ziguinchor', 'Kaolack',
        'Rufisque', 'Diourbel', 'Tambacounda', 'Kolda', 'Louga',
        'Touba', 'Mbour', 'Pikine', 'Guédiawaye', 'Fatick',
    ];

    // Zones de départ immigration (pays/villes d'origine) avec coordonnées approchées
    private array $zonesDepartures = [
        ['zone' => 'Ziguinchor',  'lat' => 12.5563, 'lng' => -16.2719],
        ['zone' => 'Bignona',     'lat' => 12.8120, 'lng' => -16.2270],
        ['zone' => 'Kolda',       'lat' => 12.8952, 'lng' => -14.9490],
        ['zone' => 'Sédhiou',     'lat' => 12.7080, 'lng' => -15.5568],
        ['zone' => 'Tambacounda', 'lat' => 13.7707, 'lng' => -13.6673],
        ['zone' => 'Kaolack',     'lat' => 14.1520, 'lng' => -16.0726],
        ['zone' => 'Saint-Louis', 'lat' => 16.0178, 'lng' => -16.4896],
        ['zone' => 'Dakar',       'lat' => 14.6937, 'lng' => -17.4441],
        ['zone' => 'Matam',       'lat' => 15.6550, 'lng' => -13.2512],
        ['zone' => 'Louga',       'lat' => 15.6167, 'lng' => -16.2242],
    ];

    // Destinations prévues (zone d'arrivée approximative sur l'Atlantique/route migratoire)
    private array $zonesArrivee = [
        ['zone' => 'Espagne (Îles Canaries)', 'lat' => 28.2916, 'lng' => -15.7239],
        ['zone' => 'Maroc (Sebta)',           'lat' => 35.8880, 'lng' => -5.3169],
        ['zone' => 'Mauritanie (Nouadhibou)', 'lat' => 20.9310, 'lng' => -17.0350],
        ['zone' => 'Guinée-Bissau',           'lat' => 11.8636, 'lng' => -15.5977],
        ['zone' => 'Gambie (Banjul)',         'lat' => 13.4549, 'lng' => -16.5790],
    ];

    // Seules valeurs autorisées par la migration
    private array $nationalites = [
        'Sénégalaise', 'Sénégalaise', 'Sénégalaise',
        'Étrangère', 'Étrangère',
    ];

    public function run(): void
    {
        $this->userId = DB::table('users')->value('id') ?? 1;
        $this->loadServices();

        DB::transaction(function () {
            $this->seedPersonnel();
            $this->seedImmigration();
            $this->seedVictimes();
            $this->seedServicesRemuneres();
        });
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function loadServices(): void
    {
        foreach (Service::with('commune')->get() as $s) {
            $this->svcByName[mb_strtolower($s->nom)] = $s;
        }
    }

    private function rnd(array $arr): mixed
    {
        return $arr[array_rand($arr)];
    }

    private function rndInt(int $a, int $b): int
    {
        return rand($a, $b);
    }

    private function weightedGrade(): string
    {
        $pool = [];
        foreach ($this->grades as $i => $grade) {
            $pool = array_merge($pool, array_fill(0, $this->gradeWeights[$i], $grade));
        }
        return $pool[array_rand($pool)];
    }

    private function jitter(float $coord, float $range = 0.02): float
    {
        return round($coord + (rand(-200, 200) / 10000.0), 6);
    }

    // ─── Personnel ───────────────────────────────────────────────────────────

    private function seedPersonnel(): void
    {
        $rows = [];
        $now  = now();

        // Distribution des agents par service (réaliste : plus dans les grandes villes)
        $distribution = [
            'commissariat central de dakar'           => 45,
            'commissariat central de guédiawaye'      => 38,
            'commissariat central de pikine'          => 30,
            'commissariat central de rufisque'        => 22,
            'commissariat de thiès'                   => 28,
            'commissariat de mbour'                   => 20,
            'commissariat de tivaouane'               => 14,
            'commissariat central de kaolack'         => 25,
            'commissariat central de saint-louis'     => 22,
            'commissariat de louga'                   => 16,
            'commissariat de diourbel'                => 14,
            'commissariat spécial de touba'           => 20,
            'commissariat de mbacké'                  => 12,
            'commissariat central de ziguinchor'      => 18,
            'commissariat de tambacounda'             => 15,
            'commissariat de kolda'                   => 12,
            'commissariat de fatick'                  => 10,
            'commissariat de kaffrine'                => 10,
            'commissariat de matam'                   => 9,
            'commissariat de kébémer'                 => 8,
            'commissariat de bambey'                  => 7,
            'commissariat de richard-toll'            => 8,
        ];

        $ccap = 1000;
        foreach ($distribution as $svcName => $count) {
            $svc = $this->svcByName[$svcName] ?? null;
            if (!$svc) continue;

            for ($i = 0; $i < $count; $i++) {
                $sexe    = ($i % 7 === 0) ? 'F' : 'M';
                $prenom  = $sexe === 'F' ? $this->rnd($this->prenomsFem) : $this->rnd($this->prenomsMasc);
                $statut  = match (true) {
                    $i % 15 === 0 => 'Inactif',
                    $i % 8  === 0 => 'Mission',
                    default       => 'Actif',
                };
                $anciennete     = $this->rndInt(1, 28);
                $dateEntreeCorps = Carbon::now()->subYears($anciennete)->subDays(rand(0, 364))->toDateString();
                $dateNaissance   = Carbon::now()->subYears($anciennete + $this->rndInt(22, 35))->subDays(rand(0, 364))->toDateString();

                $rows[] = [
                    'ccap'                  => 'SN' . str_pad($ccap++, 6, '0', STR_PAD_LEFT),
                    'prenom'                => $prenom,
                    'nom'                   => $this->rnd($this->noms),
                    'grade'                 => $this->weightedGrade(),
                    'telephone'             => '+221 7' . $this->rndInt(7, 8) . ' ' . $this->rndInt(100, 999) . ' ' . $this->rndInt(10, 99) . ' ' . $this->rndInt(10, 99),
                    'anciennete'            => $anciennete,
                    'date_entree_corps'     => $dateEntreeCorps,
                    'sexe'                  => $sexe,
                    'situation_matrimoniale'=> ($i % 3 === 0) ? 'Célibataire' : 'Marié(e)',
                    'date_naissance'        => $dateNaissance,
                    'lieu_naissance'        => $this->rnd($this->villes),
                    'service_id'            => $svc->id,
                    'statut'                => $statut,
                    'sanction'              => ($i % 25 === 0) ? 'Avertissement' : '',
                    'user_id'               => $this->userId,
                    'created_at'            => $now,
                    'updated_at'            => $now,
                ];
            }
        }

        // Reste des services : minimum 5 agents chacun
        foreach ($this->svcByName as $name => $svc) {
            if (isset($distribution[$name])) continue;
            for ($i = 0; $i < 5; $i++) {
                $sexe   = ($i % 6 === 0) ? 'F' : 'M';
                $prenom = $sexe === 'F' ? $this->rnd($this->prenomsFem) : $this->rnd($this->prenomsMasc);
                $an     = $this->rndInt(2, 20);
                $rows[] = [
                    'ccap'                  => 'SN' . str_pad($ccap++, 6, '0', STR_PAD_LEFT),
                    'prenom'                => $prenom,
                    'nom'                   => $this->rnd($this->noms),
                    'grade'                 => $this->weightedGrade(),
                    'telephone'             => '+221 7' . $this->rndInt(7, 8) . ' ' . $this->rndInt(100, 999) . ' ' . $this->rndInt(10, 99) . ' ' . $this->rndInt(10, 99),
                    'anciennete'            => $an,
                    'date_entree_corps'     => Carbon::now()->subYears($an)->toDateString(),
                    'sexe'                  => $sexe,
                    'situation_matrimoniale'=> ($i % 2 === 0) ? 'Marié(e)' : 'Célibataire',
                    'date_naissance'        => Carbon::now()->subYears($an + 25)->toDateString(),
                    'lieu_naissance'        => $this->rnd($this->villes),
                    'service_id'            => $svc->id,
                    'statut'                => 'Actif',
                    'sanction'              => '',
                    'user_id'               => $this->userId,
                    'created_at'            => $now,
                    'updated_at'            => $now,
                ];
            }
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('personnels')->insert($chunk);
        }

        $this->command->info('✅ Personnel : ' . count($rows) . ' agents créés.');
    }

    // ─── Immigration ─────────────────────────────────────────────────────────

    private function seedImmigration(): void
    {
        $rows  = [];
        $now   = now();

        // Données hebdomadaire réelle : sem. 30/05–05/06/2024
        // [service_key => [total_interp, hommes, femmes, enfants, senegalais]]
        $weekData = [
            'dakar'       => [7,  5, 1, 1, 4],
            'guediawaye'  => [12, 8, 3, 1, 7],
            'rufisque'    => [5,  3, 1, 1, 3],
            'thies'       => [8,  6, 2, 0, 5],
            'mbour'       => [15, 9, 4, 2, 8],
            'kaolack'     => [6,  4, 1, 1, 4],
            'saint-louis' => [9,  7, 2, 0, 6],
            'ziguinchor'  => [22, 14, 6, 2, 12],
            'tamba'       => [11, 8, 2, 1, 7],
            'kolda'       => [18, 12, 4, 2, 9],
        ];

        $svcNameMap = [
            'dakar'       => 'commissariat central de dakar',
            'guediawaye'  => 'commissariat central de guédiawaye',
            'rufisque'    => 'commissariat central de rufisque',
            'thies'       => 'commissariat de thiès',
            'mbour'       => 'commissariat de mbour',
            'kaolack'     => 'commissariat central de kaolack',
            'saint-louis' => 'commissariat central de saint-louis',
            'ziguinchor'  => 'commissariat central de ziguinchor',
            'tamba'       => 'commissariat de tambacounda',
            'kolda'       => 'commissariat de kolda',
        ];

        foreach ($weekData as $key => [$total, $h, $f, $e, $sn]) {
            $svcNom = $svcNameMap[$key] ?? null;
            $svc    = $svcNom ? ($this->svcByName[$svcNom] ?? null) : null;
            if (!$svc) continue;

            $dep  = $this->rnd($this->zonesDepartures);
            $arr  = $this->rnd($this->zonesArrivee);
            $et   = max(0, $total - $sn);
            $mar  = (int)floor(($h + $f) * 0.3);
            $cel  = max(0, $h + $f - $mar);

            $rows[] = [
                'nombre_interpellation' => $total,
                'date'                  => '2024-06-03',
                'service_id'            => $svc->id,
                'nombre_hommes'         => $h,
                'nombre_femmes'         => $f,
                'nombre_enfants'        => $e,
                'nombre_maries'         => $mar,
                'nombre_celibataires'   => $cel,
                'nombre_senegalais'     => $sn,
                'nombre_etrangers'      => $et,
                'zone_depart'           => $dep['zone'],
                'zone_depart_lat'       => $this->jitter($dep['lat']),
                'zone_depart_lng'       => $this->jitter($dep['lng']),
                'zone_arrivee_prevue'   => $arr['zone'],
                'zone_arrivee_lat'      => $arr['lat'],
                'zone_arrivee_lng'      => $arr['lng'],
                'user_id'               => $this->userId,
                'created_at'            => $now,
                'updated_at'            => $now,
            ];
        }

        // Données annuelles 2021–2024 réparties sur les mois
        $annualData = [
            2021 => 890,
            2022 => 1120,
            2023 => 1340,
            2024 => 980,
        ];

        $mainSvcs = [
            'commissariat central de ziguinchor',
            'commissariat de kolda',
            'commissariat de tambacounda',
            'commissariat central de saint-louis',
            'commissariat de mbour',
            'commissariat central de dakar',
            'commissariat de fatick',
            'commissariat de matam',
        ];

        foreach ($annualData as $year => $totalPersons) {
            $nMonths = ($year === 2024) ? 5 : 12; // 2024 partiel
            $nSvcs   = count($mainSvcs);
            $perEntry = max(3, (int)floor($totalPersons / ($nMonths * $nSvcs)));

            for ($m = 1; $m <= $nMonths; $m++) {
                foreach ($mainSvcs as $svcNom) {
                    $svc = $this->svcByName[$svcNom] ?? null;
                    if (!$svc) continue;

                    $h   = (int)floor($perEntry * 0.6);
                    $f   = (int)floor($perEntry * 0.25);
                    $e   = max(0, $perEntry - $h - $f);
                    $sn  = (int)floor($perEntry * 0.55);
                    $et  = max(0, $perEntry - $sn);
                    $mar = (int)floor(($h + $f) * 0.3);
                    $cel = max(0, $h + $f - $mar);

                    $dep = $this->rnd($this->zonesDepartures);
                    $arr = $this->rnd($this->zonesArrivee);
                    $day = rand(1, min(28, Carbon::create($year, $m, 1)->daysInMonth));

                    $rows[] = [
                        'nombre_interpellation' => $perEntry,
                        'date'                  => Carbon::create($year, $m, $day)->toDateString(),
                        'service_id'            => $svc->id,
                        'nombre_hommes'         => $h,
                        'nombre_femmes'         => $f,
                        'nombre_enfants'        => $e,
                        'nombre_maries'         => $mar,
                        'nombre_celibataires'   => $cel,
                        'nombre_senegalais'     => $sn,
                        'nombre_etrangers'      => $et,
                        'zone_depart'           => $dep['zone'],
                        'zone_depart_lat'       => $this->jitter($dep['lat']),
                        'zone_depart_lng'       => $this->jitter($dep['lng']),
                        'zone_arrivee_prevue'   => $arr['zone'],
                        'zone_arrivee_lat'      => $arr['lat'],
                        'zone_arrivee_lng'      => $arr['lng'],
                        'user_id'               => $this->userId,
                        'created_at'            => $now,
                        'updated_at'            => $now,
                    ];
                }
            }
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('immigrations_clandestines')->insert($chunk);
        }

        $this->command->info('✅ Immigration : ' . count($rows) . ' enregistrements créés.');
    }

    // ─── Victimes ─────────────────────────────────────────────────────────────

    private function seedVictimes(): void
    {
        $rows = [];
        $now  = now();

        // Lier ~30% des infractions à une victime
        $infractionIds = DB::table('infractions')
            ->inRandomOrder()
            ->limit(200)
            ->pluck('id')
            ->toArray();

        foreach ($infractionIds as $id) {
            $sexe   = (rand(0, 3) === 0) ? 'F' : 'M';
            $prenom = $sexe === 'F' ? $this->rnd($this->prenomsFem) : $this->rnd($this->prenomsMasc);
            $rows[] = [
                'nom'              => $this->rnd($this->noms),
                'prenom'           => $prenom,
                'no_cin_passeport' => 'SN' . $this->rndInt(1000000, 9999999),
                'sexe'             => $sexe,
                'age'              => $this->rndInt(15, 65),
                'nationalite'      => $this->rnd($this->nationalites),
                'infraction_id'    => $id,
                'accident_id'      => null,
                'created_at'       => $now,
                'updated_at'       => $now,
            ];
        }

        // Lier ~40% des accidents à une ou deux victimes
        $accidentIds = DB::table('accidents')
            ->inRandomOrder()
            ->limit(300)
            ->pluck('id')
            ->toArray();

        foreach ($accidentIds as $id) {
            $n = rand(1, 2); // 1 ou 2 victimes par accident
            for ($i = 0; $i < $n; $i++) {
                $sexe   = (rand(0, 3) === 0) ? 'F' : 'M';
                $prenom = $sexe === 'F' ? $this->rnd($this->prenomsFem) : $this->rnd($this->prenomsMasc);
                $rows[] = [
                    'nom'              => $this->rnd($this->noms),
                    'prenom'           => $prenom,
                    'no_cin_passeport' => 'SN' . $this->rndInt(1000000, 9999999),
                    'sexe'             => $sexe,
                    'age'              => $this->rndInt(16, 70),
                    'nationalite'      => $this->rnd($this->nationalites),
                    'infraction_id'    => null,
                    'accident_id'      => $id,
                    'created_at'       => $now,
                    'updated_at'       => $now,
                ];
            }
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('victimes')->insert($chunk);
        }

        $this->command->info('✅ Victimes : ' . count($rows) . ' enregistrements créés.');
    }

    // ─── Services Rémunérés ───────────────────────────────────────────────────

    private function seedServicesRemuneres(): void
    {
        $libelles = [
            'Garde de nuit',
            'Escorte VIP',
            'Sécurité événementielle',
            'Surveillance de site',
            'Escorte de fonds',
            'Patrouille spéciale',
            'Sécurité routière renforcée',
            'Gardiennage temporaire',
        ];

        $services = array_values($this->svcByName);
        if (empty($services)) return;

        $rows = [];
        $now  = now();

        // 2 à 4 enregistrements par service sur les 6 derniers mois
        foreach ($services as $svc) {
            $count = rand(2, 4);
            for ($i = 0; $i < $count; $i++) {
                $daysAgo = rand(0, 180);
                $date    = now()->subDays($daysAgo)->toDateString();
                $montant = rand(5, 80) * 5000; // 25 000 à 400 000 CFA
                $rows[]  = [
                    'libelle'     => $this->rnd($libelles),
                    'service_id'  => $svc->id,
                    'date'        => $date,
                    'montant'     => $montant,
                    'description' => null,
                    'user_id'     => $this->userId,
                    'created_at'  => $now,
                    'updated_at'  => $now,
                ];
            }
        }

        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('services_remuneres')->insert($chunk);
        }

        $this->command->info('✅ Services rémunérés : ' . count($rows) . ' enregistrements créés.');
    }
}
