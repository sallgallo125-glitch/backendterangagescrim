<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CategorieInfraction;
use App\Models\TypeInfraction;

/**
 * Seeder pour les catégories et types d'infractions.
 */
class InfractionTypeSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Crime' => [
                'Meurtre', 'Assassinat', 'Vol à main armée', 'Viol',
                'Trafic de drogue', 'Kidnapping', 'Homicide involontaire',
                'Association de malfaiteurs', 'Détention d\'arme à feu',
            ],
            'Délit' => [
                'Vol simple', 'Vol avec effraction', 'Coups et blessures volontaires',
                'Escroquerie', 'Abus de confiance', 'Recel', 'Détention de chanvre indien',
                'Outrage à agent', 'Rébellion', 'Usurpation d\'identité',
                'Détournement de mineure', 'Violence conjugale', 'Menaces de mort',
            ],
            'Contravention' => [
                'Tapage nocturne', 'Ivresse publique', 'Défaut de pièce d\'identité',
                'Vagabondage', 'Mendicité', 'Jets de pierres',
                'Occupation illégale de la voie publique',
            ],
        ];

        foreach ($categories as $catNom => $types) {
            $categorie = CategorieInfraction::create([
                'nom' => $catNom,
                'description' => "Catégorie d'infraction : {$catNom}",
            ]);

            foreach ($types as $typeNom) {
                TypeInfraction::create([
                    'nom' => $typeNom,
                    'categorie_infraction_id' => $categorie->id,
                ]);
            }
        }
    }
}
