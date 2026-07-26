<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Region;

/**
 * Crée les utilisateurs de test couvrant toutes les régions et tous les services.
 *
 * Résultat attendu :
 *  - 1  administrateur national
 *  - 14 gestionnaires (1 par région)
 *  - N  agents (1 par commissariat/service)
 *
 * Mot de passe pour tous : passer123
 * Convention email : {role}{slug}@gescrim.sn
 */
class TestUsersSeeder extends Seeder
{
    private function slug(string $name): string
    {
        $map = [
            'é'=>'e','è'=>'e','ê'=>'e','ë'=>'e','à'=>'a','â'=>'a','ä'=>'a',
            'î'=>'i','ï'=>'i','ô'=>'o','ö'=>'o','ù'=>'u','û'=>'u','ü'=>'u',
            'ç'=>'c','ñ'=>'n','É'=>'e','È'=>'e','Ê'=>'e','À'=>'a','Â'=>'a',
            'Î'=>'i','Ô'=>'o','Ù'=>'u','Û'=>'u','Ç'=>'c',
        ];
        $slug = preg_replace('/[^a-z0-9]/', '', strtolower(strtr($name, $map)));
        return substr($slug, 0, 8);
    }

    private function makeUser(array $data, string $role): void
    {
        if (User::where('email', $data['email'])->exists()) {
            $user = User::where('email', $data['email'])->first();
            // Mettre à jour le rôle si nécessaire
            if (!$user->hasRole($role)) {
                $user->syncRoles([$role]);
            }
            return;
        }

        $user = User::create(array_merge($data, [
            'password'                => Hash::make('passer123'),
            'is_active'               => true,
            'is_2fa_enabled'          => true,
            'two_factor_confirmed_at' => now(),
        ]));

        $user->assignRole($role);
    }

    public function run(): void
    {
        // ── 1. Administrateur ─────────────────────────────────────────────────
        $this->makeUser([
            'name'      => 'Administrateur National',
            'email'     => 'admin.national@gescrim.sn',
            'telephone' => '+221 77 100 00 00',
        ], 'administrateur');

        // ── 2. 14 Gestionnaires régionaux + agents par service ────────────────
        $regions = Region::with(['departements.communes.services'])->get();

        foreach ($regions as $region) {
            $slug = $this->slug($region->nom);

            // Gestionnaire régional (1 par région)
            $this->makeUser([
                'name'             => "Gestionnaire {$region->nom}",
                'email'            => "gestionnaire{$slug}@gescrim.sn",
                'telephone'        => '+221 77 300 00 00',
                'read_scope_type'  => 'region',
                'read_scope_id'    => $region->id,
                'write_scope_type' => 'region',
                'write_scope_id'   => $region->id,
            ], 'gestionnaire');

            // Agents terrain (1 par commissariat/service)
            foreach ($region->departements as $dept) {
                foreach ($dept->communes as $commune) {
                    foreach ($commune->services as $service) {
                        $serviceSlug = $this->slug($commune->nom);
                        $email = "agent{$serviceSlug}{$service->id}@gescrim.sn";

                        $this->makeUser([
                            'name'             => "Agent {$commune->nom}",
                            'email'            => $email,
                            'telephone'        => '+221 77 400 00 00',
                            'service_id'       => $service->id,
                            'read_scope_type'  => 'service',
                            'read_scope_id'    => $service->id,
                            'write_scope_type' => 'service',
                            'write_scope_id'   => $service->id,
                        ], 'agent');
                    }
                }
            }
        }

        // ── 3. Résumé ─────────────────────────────────────────────────────────
        $total          = User::count();
        $nbAdmin        = User::role('administrateur')->count();
        $nbGestionnaire = User::role('gestionnaire')->count();
        $nbAgent        = User::role('agent')->count();

        $this->command->info("TestUsersSeeder terminé — {$total} utilisateurs au total.");
        $this->command->table(
            ['Rôle', 'Nombre'],
            [
                ['administrateur', $nbAdmin],
                ['gestionnaire',   $nbGestionnaire],
                ['agent',          $nbAgent],
            ]
        );
    }
}
