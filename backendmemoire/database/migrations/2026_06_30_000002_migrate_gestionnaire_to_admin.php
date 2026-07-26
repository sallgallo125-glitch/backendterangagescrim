<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $gestionnaireRole = Role::where('name', 'gestionnaire')->where('guard_name', 'api')->first();

        if ($gestionnaireRole) {
            $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'api']);

            // Réaffecter tous les gestionnaires → admin
            $userIds = DB::table('model_has_roles')
                ->where('role_id', $gestionnaireRole->id)
                ->where('model_type', 'App\\Models\\User')
                ->pluck('model_id');

            foreach ($userIds as $userId) {
                DB::table('model_has_roles')->updateOrInsert(
                    ['role_id' => $adminRole->id, 'model_type' => 'App\\Models\\User', 'model_id' => $userId],
                );
            }

            DB::table('model_has_roles')->where('role_id', $gestionnaireRole->id)->delete();
            DB::table('role_has_permissions')->where('role_id', $gestionnaireRole->id)->delete();
            $gestionnaireRole->delete();
        }

        // Renommer les emails gestionnaire.dakar → admin.dakar et gestionnaire → admin.commissariat
        DB::table('users')
            ->where('email', 'gestionnaire.dakar@gescrim.sn')
            ->update(['email' => 'admin.dakar@gescrim.sn', 'name' => 'Admin Région Dakar']);

        DB::table('users')
            ->where('email', 'gestionnaire@gescrim.sn')
            ->update(['email' => 'admin.commissariat@gescrim.sn', 'name' => 'Admin Commissariat Central']);

        // Renommer tous les emails gestionnaire{slug}@gescrim.sn → admin{slug}@gescrim.sn
        $gestionnaireUsers = DB::table('users')
            ->where('email', 'like', 'gestionnaire%@gescrim.sn')
            ->get(['id', 'email', 'name']);

        foreach ($gestionnaireUsers as $user) {
            $newEmail = preg_replace('/^gestionnaire/', 'admin', $user->email);
            $newName  = preg_replace('/^Gestionnaire\b/i', 'Admin', $user->name);
            DB::table('users')->where('id', $user->id)->update([
                'email' => $newEmail,
                'name'  => $newName,
            ]);
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Rollback non supporté (emails et rôles ne peuvent pas être restaurés de façon fiable)
    }
};
