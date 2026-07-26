<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Créer le rôle gestionnaire s'il n'existe pas
        $role = DB::table('roles')->where('name', 'gestionnaire')->where('guard_name', 'api')->first();
        if (!$role) {
            DB::table('roles')->insert([
                'name'       => 'gestionnaire',
                'guard_name' => 'api',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Attribuer les permissions au rôle gestionnaire
        $gestionnairRole = DB::table('roles')->where('name', 'gestionnaire')->where('guard_name', 'api')->first();

        $gestionnairesPermissions = [
            'users.view', 'users.create', 'users.update',
            'personnels.view', 'personnels.create', 'personnels.update', 'personnels.delete',
            'infractions.view', 'infractions.create', 'infractions.update', 'infractions.delete',
            'accidents.view', 'accidents.create', 'accidents.update', 'accidents.delete',
            'victimes.view', 'victimes.create', 'victimes.update', 'victimes.delete',
            'services-remuneres.view', 'services-remuneres.create', 'services-remuneres.update', 'services-remuneres.delete',
            'amendes.view', 'amendes.create', 'amendes.update', 'amendes.delete',
            'immigrations.view', 'immigrations.create', 'immigrations.update', 'immigrations.delete',
            'parametrage.view',
            'dashboard.view',
            'export.pdf', 'export.csv', 'import.data',
            'audit.view',
            'notifications.send',
        ];

        foreach ($gestionnairesPermissions as $permName) {
            $perm = DB::table('permissions')->where('name', $permName)->where('guard_name', 'api')->first();
            if ($perm && $gestionnairRole) {
                $exists = DB::table('role_has_permissions')
                    ->where('permission_id', $perm->id)
                    ->where('role_id', $gestionnairRole->id)
                    ->exists();
                if (!$exists) {
                    DB::table('role_has_permissions')->insert([
                        'permission_id' => $perm->id,
                        'role_id'       => $gestionnairRole->id,
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        $role = DB::table('roles')->where('name', 'gestionnaire')->where('guard_name', 'api')->first();
        if ($role) {
            DB::table('role_has_permissions')->where('role_id', $role->id)->delete();
            DB::table('model_has_roles')->where('role_id', $role->id)->delete();
            DB::table('roles')->where('id', $role->id)->delete();
        }
    }
};
