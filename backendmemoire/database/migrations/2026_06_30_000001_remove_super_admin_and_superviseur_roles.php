<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Réassigner les super_admin → admin
        $superAdminRole = Role::where('name', 'super_admin')->where('guard_name', 'api')->first();
        if ($superAdminRole) {
            $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);
            $userIds = DB::table('model_has_roles')
                ->where('role_id', $superAdminRole->id)
                ->where('model_type', 'App\\Models\\User')
                ->pluck('model_id');

            foreach ($userIds as $userId) {
                DB::table('model_has_roles')->updateOrInsert(
                    ['role_id' => $adminRole->id, 'model_type' => 'App\\Models\\User', 'model_id' => $userId],
                );
            }

            DB::table('model_has_roles')->where('role_id', $superAdminRole->id)->delete();
            DB::table('role_has_permissions')->where('role_id', $superAdminRole->id)->delete();
            $superAdminRole->delete();
        }

        // Réassigner les superviseur → gestionnaire
        $superviseurRole = Role::where('name', 'superviseur')->where('guard_name', 'api')->first();
        if ($superviseurRole) {
            $gestionnaireRole = Role::firstOrCreate(['name' => 'gestionnaire', 'guard_name' => 'api']);
            $userIds = DB::table('model_has_roles')
                ->where('role_id', $superviseurRole->id)
                ->where('model_type', 'App\\Models\\User')
                ->pluck('model_id');

            foreach ($userIds as $userId) {
                DB::table('model_has_roles')->updateOrInsert(
                    ['role_id' => $gestionnaireRole->id, 'model_type' => 'App\\Models\\User', 'model_id' => $userId],
                );
            }

            DB::table('model_has_roles')->where('role_id', $superviseurRole->id)->delete();
            DB::table('role_has_permissions')->where('role_id', $superviseurRole->id)->delete();
            $superviseurRole->delete();
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        // La migration inverse est non-déterministe (on ne sait pas qui était super_admin/superviseur).
        // Pour restaurer, utiliser les seeders et réassigner manuellement.
    }
};
