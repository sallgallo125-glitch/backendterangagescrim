<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Region;
use App\Models\Departement;
use App\Models\Commune;

/**
 * Seeder pour les subdivisions administratives du Sénégal.
 * Données réelles : 14 régions, départements et communes principales.
 */
class SubdivisionSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            'Dakar' => [
                'code' => 'DK',
                'departements' => [
                    'Dakar' => ['DK-DK', ['Dakar-Plateau', 'Médina', 'Grand-Dakar', 'Parcelles Assainies', 'Mermoz-Sacré-Cœur']],
                    'Guédiawaye' => ['DK-GD', ['Guédiawaye', 'Sam Notaire', 'Golf Sud', 'Ndiarème Limamoulaye']],
                    'Pikine' => ['DK-PK', ['Pikine Nord', 'Pikine Ouest', 'Pikine Est', 'Diamaguène Sicap Mbao', 'Thiaroye']],
                    'Rufisque' => ['DK-RF', ['Rufisque Nord', 'Rufisque Ouest', 'Bargny', 'Diamniadio', 'Sébikotane']],
                ],
            ],
            'Thiès' => [
                'code' => 'TH',
                'departements' => [
                    'Thiès' => ['TH-TH', ['Thiès Nord', 'Thiès Sud', 'Thiès Est', 'Thiès Ouest']],
                    'Mbour' => ['TH-MB', ['Mbour', 'Saly', 'Joal-Fadiouth', 'Somone', 'Nguékhokh']],
                    'Tivaouane' => ['TH-TV', ['Tivaouane', 'Mékhé', 'Pambal']],
                ],
            ],
            'Saint-Louis' => [
                'code' => 'SL',
                'departements' => [
                    'Saint-Louis' => ['SL-SL', ['Saint-Louis', 'Gandon', 'Ndiébène Gandiol']],
                    'Dagana' => ['SL-DG', ['Dagana', 'Richard-Toll', 'Ross Béthio']],
                    'Podor' => ['SL-PD', ['Podor', 'Ndioum', 'Galoya']],
                ],
            ],
            'Diourbel' => [
                'code' => 'DL',
                'departements' => [
                    'Diourbel' => ['DL-DL', ['Diourbel', 'Ndoulo']],
                    'Bambey' => ['DL-BB', ['Bambey', 'Lambaye']],
                    'Mbacké' => ['DL-MK', ['Mbacké', 'Touba']],
                ],
            ],
            'Fatick' => [
                'code' => 'FK',
                'departements' => [
                    'Fatick' => ['FK-FK', ['Fatick', 'Diakhao']],
                    'Foundiougne' => ['FK-FD', ['Foundiougne', 'Sokone', 'Passy']],
                    'Gossas' => ['FK-GS', ['Gossas', 'Colobane']],
                ],
            ],
            'Kaolack' => [
                'code' => 'KL',
                'departements' => [
                    'Kaolack' => ['KL-KL', ['Kaolack', 'Kahone', 'Ndoffane']],
                    'Guinguinéo' => ['KL-GG', ['Guinguinéo', 'Mbadakhoune']],
                    'Nioro du Rip' => ['KL-NR', ['Nioro du Rip', 'Paoskoto']],
                ],
            ],
            'Ziguinchor' => [
                'code' => 'ZG',
                'departements' => [
                    'Ziguinchor' => ['ZG-ZG', ['Ziguinchor', 'Niaguis']],
                    'Bignona' => ['ZG-BG', ['Bignona', 'Thionck Essyl']],
                    'Oussouye' => ['ZG-OS', ['Oussouye', 'Loudia Ouoloff']],
                ],
            ],
            'Kolda' => [
                'code' => 'KD',
                'departements' => [
                    'Kolda' => ['KD-KD', ['Kolda', 'Dioulacolon']],
                    'Vélingara' => ['KD-VL', ['Vélingara', 'Kounkané']],
                    'Médina Yoro Foulah' => ['KD-MYF', ['Médina Yoro Foulah', 'Pata']],
                ],
            ],
            'Tambacounda' => [
                'code' => 'TC',
                'departements' => [
                    'Tambacounda' => ['TC-TC', ['Tambacounda', 'Makacolibantang']],
                    'Bakel' => ['TC-BK', ['Bakel', 'Kidira']],
                    'Goudiry' => ['TC-GD', ['Goudiry', 'Koulor']],
                    'Koumpentoum' => ['TC-KP', ['Koumpentoum', 'Malème Niani']],
                ],
            ],
            'Louga' => [
                'code' => 'LG',
                'departements' => [
                    'Louga' => ['LG-LG', ['Louga', 'Sakal']],
                    'Kébémer' => ['LG-KB', ['Kébémer', 'Ndande']],
                    'Linguère' => ['LG-LR', ['Linguère', 'Dahra']],
                ],
            ],
            'Matam' => [
                'code' => 'MT',
                'departements' => [
                    'Matam' => ['MT-MT', ['Matam', 'Ourossogui']],
                    'Kanel' => ['MT-KN', ['Kanel', 'Hamady Hounaré']],
                    'Ranérou' => ['MT-RN', ['Ranérou', 'Vélingara Ferlo']],
                ],
            ],
            'Kaffrine' => [
                'code' => 'KF',
                'departements' => [
                    'Kaffrine' => ['KF-KF', ['Kaffrine', 'Nganda']],
                    'Birkelane' => ['KF-BL', ['Birkelane', 'Keur Mboucki']],
                    'Koungheul' => ['KF-KG', ['Koungheul', 'Ida Mouride']],
                    'Malem-Hodar' => ['KF-MH', ['Malem-Hodar', 'Sagna']],
                ],
            ],
            'Kédougou' => [
                'code' => 'KG',
                'departements' => [
                    'Kédougou' => ['KG-KG', ['Kédougou', 'Bandafassi']],
                    'Salémata' => ['KG-SM', ['Salémata', 'Dar Salam']],
                    'Saraya' => ['KG-SY', ['Saraya', 'Sabodala']],
                ],
            ],
            'Sédhiou' => [
                'code' => 'SD',
                'departements' => [
                    'Sédhiou' => ['SD-SD', ['Sédhiou', 'Djibabouya']],
                    'Bounkiling' => ['SD-BK', ['Bounkiling', 'Diaroumé']],
                    'Goudomp' => ['SD-GP', ['Goudomp', 'Samine']],
                ],
            ],
        ];

        foreach ($data as $regionNom => $regionData) {
            $region = Region::create([
                'nom' => $regionNom,
                'code' => $regionData['code'],
            ]);

            foreach ($regionData['departements'] as $deptNom => [$deptCode, $communes]) {
                $departement = Departement::create([
                    'nom' => $deptNom,
                    'code' => $deptCode,
                    'region_id' => $region->id,
                ]);

                foreach ($communes as $communeNom) {
                    Commune::create([
                        'nom' => $communeNom,
                        'departement_id' => $departement->id,
                    ]);
                }
            }
        }
    }
}
