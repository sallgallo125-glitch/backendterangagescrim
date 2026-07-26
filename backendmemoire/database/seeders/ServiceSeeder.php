<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Commune;
use App\Models\Service;

class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        // Liste complète des 54 commissariats du Sénégal
        // Clé : nom de la commune (correspond exactement au SubdivisionSeeder)
        // lat/lng : coordonnées GPS approchées du commissariat
        $services = [
            // === RÉGION DAKAR — Département Dakar ===
            'Dakar-Plateau' => [
                ['nom' => 'Commissariat Central de Dakar',   'type' => 'CC', 'lat' =>  14.6937, 'lng' => -17.4441],
                ['nom' => 'Commissariat de Rebeuss',          'type' => 'CA', 'lat' =>  14.6991, 'lng' => -17.4383],
            ],
            'Médina' => [
                ['nom' => 'Commissariat de la Médina',        'type' => 'CA', 'lat' =>  14.6870, 'lng' => -17.4560],
            ],
            'Grand-Dakar' => [
                ['nom' => 'Commissariat du Point E',          'type' => 'CA', 'lat' =>  14.7017, 'lng' => -17.4750],
                ['nom' => 'Commissariat de Grand Yoff',       'type' => 'CA', 'lat' =>  14.7350, 'lng' => -17.4600],
            ],
            'Mermoz-Sacré-Cœur' => [
                ['nom' => 'Commissariat de Bel Air',          'type' => 'CA', 'lat' =>  14.7280, 'lng' => -17.4900],
            ],

            // === RÉGION DAKAR — Département Guédiawaye ===
            'Guédiawaye' => [
                ['nom' => 'Commissariat Central de Guédiawaye', 'type' => 'CC', 'lat' => 14.7731, 'lng' => -17.3895],
            ],

            // === RÉGION DAKAR — Département Pikine ===
            'Pikine Nord' => [
                ['nom' => 'Commissariat Central de Pikine',   'type' => 'CC', 'lat' => 14.7490, 'lng' => -17.3900],
            ],
            'Golf Sud' => [
                ['nom' => 'Commissariat de Golf Sud',         'type' => 'CA', 'lat' => 14.7620, 'lng' => -17.4020],
            ],
            'Parcelles Assainies' => [
                ['nom' => 'Commissariat des Parcelles Assainies', 'type' => 'CA', 'lat' => 14.7730, 'lng' => -17.4250],
            ],
            'Pikine Est' => [
                ['nom' => 'Commissariat de Yeumbeul',         'type' => 'CA', 'lat' => 14.7460, 'lng' => -17.3500],
            ],
            'Thiaroye' => [
                ['nom' => 'Commissariat de Thiaroye',         'type' => 'CA', 'lat' => 14.7350, 'lng' => -17.3650],
            ],

            // === RÉGION DAKAR — Département Rufisque ===
            'Rufisque Nord' => [
                ['nom' => 'Commissariat Central de Rufisque', 'type' => 'CC', 'lat' => 14.7156, 'lng' => -17.2712],
            ],
            'Bargny' => [
                ['nom' => 'Poste de Police de Bargny',        'type' => 'PP', 'lat' => 14.6980, 'lng' => -17.2320],
            ],
            'Diamniadio' => [
                ['nom' => 'Poste de Police de Diamniadio',    'type' => 'PP', 'lat' => 14.7220, 'lng' => -17.1820],
            ],
            'Sébikotane' => [
                ['nom' => 'Poste de Police de Sébikotane',    'type' => 'PP', 'lat' => 14.7470, 'lng' => -17.1300],
            ],

            // === RÉGION THIÈS ===
            'Thiès Nord' => [
                ['nom' => 'Commissariat de Thiès',            'type' => 'CC', 'lat' => 14.7889, 'lng' => -16.9261],
            ],
            'Mbour' => [
                ['nom' => 'Commissariat de Mbour',            'type' => 'CC', 'lat' => 14.3973, 'lng' => -16.9651],
            ],
            'Tivaouane' => [
                ['nom' => 'Commissariat de Tivaouane',        'type' => 'CC', 'lat' => 14.9490, 'lng' => -16.8200],
            ],
            'Joal-Fadiouth' => [
                ['nom' => 'Poste de Police de Joal',          'type' => 'PP', 'lat' => 14.1600, 'lng' => -16.8400],
            ],

            // === RÉGION SAINT-LOUIS ===
            'Saint-Louis' => [
                ['nom' => 'Commissariat Central de Saint-Louis', 'type' => 'CC', 'lat' => 16.0178, 'lng' => -16.4896],
            ],
            'Gandon' => [
                ['nom' => 'Commissariat de Sor',              'type' => 'CA', 'lat' => 16.0350, 'lng' => -16.4750],
            ],
            'Richard-Toll' => [
                ['nom' => 'Commissariat de Richard-Toll',     'type' => 'CC', 'lat' => 16.4645, 'lng' => -15.7015],
            ],
            'Dagana' => [
                ['nom' => 'Poste de Police de Dagana',        'type' => 'PP', 'lat' => 16.5150, 'lng' => -15.5050],
            ],

            // === RÉGION LOUGA ===
            'Louga' => [
                ['nom' => 'Commissariat de Louga',            'type' => 'CC', 'lat' => 15.6167, 'lng' => -16.2242],
            ],
            'Kébémer' => [
                ['nom' => 'Commissariat de Kébémer',          'type' => 'CC', 'lat' => 15.3700, 'lng' => -16.4500],
            ],
            'Linguère' => [
                ['nom' => 'Poste de Police de Linguère',      'type' => 'PP', 'lat' => 15.3950, 'lng' => -15.1150],
            ],

            // === RÉGION DIOURBEL ===
            'Diourbel' => [
                ['nom' => 'Commissariat de Diourbel',         'type' => 'CC', 'lat' => 14.6557, 'lng' => -16.2318],
            ],
            'Bambey' => [
                ['nom' => 'Commissariat de Bambey',           'type' => 'CC', 'lat' => 14.7031, 'lng' => -16.4533],
            ],
            'Mbacké' => [
                ['nom' => 'Commissariat de Mbacké',           'type' => 'CC', 'lat' => 14.7948, 'lng' => -15.9097],
            ],
            'Touba' => [
                ['nom' => 'Commissariat Spécial de Touba',    'type' => 'CS', 'lat' => 14.8508, 'lng' => -15.8817],
            ],

            // === RÉGION KAOLACK ===
            'Kaolack' => [
                ['nom' => 'Commissariat Central de Kaolack',  'type' => 'CC', 'lat' => 14.1520, 'lng' => -16.0726],
            ],
            'Nioro du Rip' => [
                ['nom' => 'Commissariat de Nioro',            'type' => 'CC', 'lat' => 13.7500, 'lng' => -15.7900],
            ],
            'Guinguinéo' => [
                ['nom' => 'Poste de Police de Guinguinéo',    'type' => 'PP', 'lat' => 14.2700, 'lng' => -15.9500],
            ],

            // === RÉGION KAFFRINE ===
            'Kaffrine' => [
                ['nom' => 'Commissariat de Kaffrine',         'type' => 'CC', 'lat' => 14.1060, 'lng' => -15.5508],
            ],
            'Koungheul' => [
                ['nom' => 'Poste de Police de Koungheul',     'type' => 'PP', 'lat' => 13.9900, 'lng' => -14.8000],
            ],

            // === RÉGION FATICK ===
            'Fatick' => [
                ['nom' => 'Commissariat de Fatick',           'type' => 'CC', 'lat' => 14.3394, 'lng' => -16.4072],
            ],
            'Foundiougne' => [
                ['nom' => 'Poste de Police de Foundiougne',   'type' => 'PP', 'lat' => 14.1320, 'lng' => -16.4700],
            ],
            'Gossas' => [
                ['nom' => 'Poste de Police de Gossas',        'type' => 'PP', 'lat' => 14.4900, 'lng' => -16.0600],
            ],

            // === RÉGION TAMBACOUNDA ===
            'Tambacounda' => [
                ['nom' => 'Commissariat de Tambacounda',      'type' => 'CC', 'lat' => 13.7707, 'lng' => -13.6673],
            ],
            'Bakel' => [
                ['nom' => 'Poste de Police de Bakel',         'type' => 'PP', 'lat' => 14.9000, 'lng' => -12.4600],
            ],
            'Goudiry' => [
                ['nom' => 'Poste de Police de Goudiry',       'type' => 'PP', 'lat' => 14.1800, 'lng' => -12.7100],
            ],

            // === RÉGION KÉDOUGOU ===
            'Kédougou' => [
                ['nom' => 'Commissariat de Kédougou',         'type' => 'CC', 'lat' => 12.5579, 'lng' => -12.1743],
            ],
            'Saraya' => [
                ['nom' => 'Poste de Police de Saraya',        'type' => 'PP', 'lat' => 12.8300, 'lng' => -11.7500],
            ],

            // === RÉGION KOLDA ===
            'Kolda' => [
                ['nom' => 'Commissariat de Kolda',            'type' => 'CC', 'lat' => 12.8952, 'lng' => -14.9490],
            ],
            'Vélingara' => [
                ['nom' => 'Poste de Police de Vélingara',     'type' => 'PP', 'lat' => 13.1500, 'lng' => -14.1100],
            ],

            // === RÉGION SÉDHIOU ===
            'Sédhiou' => [
                ['nom' => 'Commissariat de Sédhiou',          'type' => 'CC', 'lat' => 12.7081, 'lng' => -15.5568],
            ],
            'Bounkiling' => [
                ['nom' => 'Poste de Police de Bounkiling',    'type' => 'PP', 'lat' => 12.8550, 'lng' => -15.6900],
            ],

            // === RÉGION ZIGUINCHOR ===
            'Ziguinchor' => [
                ['nom' => 'Commissariat Central de Ziguinchor', 'type' => 'CC', 'lat' => 12.5563, 'lng' => -16.2719],
            ],
            'Bignona' => [
                ['nom' => 'Poste de Police de Bignona',       'type' => 'PP', 'lat' => 12.8100, 'lng' => -16.2200],
            ],
            'Oussouye' => [
                ['nom' => "Poste de Police d'Oussouye",       'type' => 'PP', 'lat' => 12.4850, 'lng' => -16.5450],
            ],

            // === RÉGION MATAM ===
            'Matam' => [
                ['nom' => 'Commissariat de Matam',            'type' => 'CC', 'lat' => 15.6550, 'lng' => -13.2512],
            ],
            'Kanel' => [
                ['nom' => 'Poste de Police de Kanel',         'type' => 'PP', 'lat' => 15.4900, 'lng' => -13.1700],
            ],
            'Ranérou' => [
                ['nom' => 'Poste de Police de Ranérou',       'type' => 'PP', 'lat' => 15.3000, 'lng' => -13.9600],
            ],
        ];

        foreach ($services as $communeNom => $entries) {
            $commune = Commune::where('nom', $communeNom)->first();

            if (!$commune) {
                $this->command->warn("Commune introuvable : {$communeNom}");
                continue;
            }

            foreach ($entries as $entry) {
                Service::create([
                    'nom'        => $entry['nom'],
                    'type'       => $entry['type'],
                    'commune_id' => $commune->id,
                    'latitude'   => $entry['lat'],
                    'longitude'  => $entry['lng'],
                ]);
            }
        }
    }
}
