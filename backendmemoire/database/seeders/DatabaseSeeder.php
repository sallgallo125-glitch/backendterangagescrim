<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeder principal - Exécute tous les seeders dans le bon ordre.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SubdivisionSeeder::class,    // 1. Régions, Départements, Communes
            ServiceSeeder::class,         // 2. Services DSP
            RolePermissionSeeder::class,  // 3. Rôles et Permissions
            UserSeeder::class,            // 4. Utilisateurs de base
            TestUsersSeeder::class,       // 5. Utilisateurs de test (un par région/service/rôle)
            InfractionTypeSeeder::class,  // 6. Catégories et Types d'infractions
            DataSeeder::class,            // 7. Données réelles JSON (accidents, infractions, amendes)
        ]);
    }
}
