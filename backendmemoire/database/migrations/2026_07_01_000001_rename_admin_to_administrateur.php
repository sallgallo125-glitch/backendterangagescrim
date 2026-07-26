<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

return new class extends Migration
{
    public function up(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $oldRole = Role::where('name', 'admin')->where('guard_name', 'api')->first();

        if ($oldRole) {
            $newRole = Role::firstOrCreate(['name' => 'administrateur', 'guard_name' => 'api']);
            $newRole->syncPermissions(Permission::all());

            // Réaffecter tous les utilisateurs admin → administrateur
            $userIds = DB::table('model_has_roles')
                ->where('role_id', $oldRole->id)
                ->where('model_type', 'App\\Models\\User')
                ->pluck('model_id');

            foreach ($userIds as $userId) {
                DB::table('model_has_roles')->updateOrInsert(
                    ['role_id' => $newRole->id, 'model_type' => 'App\\Models\\User', 'model_id' => $userId],
                );
            }

            DB::table('model_has_roles')->where('role_id', $oldRole->id)->delete();
            DB::table('role_has_permissions')->where('role_id', $oldRole->id)->delete();
            $oldRole->delete();
        }

        // Renommer emails admin.* → administrateur.*
        DB::table('users')
            ->where('email', 'admin@gescrim.sn')
            ->update(['name' => 'Administrateur National']);

        // Les comptes admin.dakar et admin.commissariat deviennent des gestionnaires régionaux
        $gestionnaireRole = Role::firstOrCreate(['name' => 'gestionnaire', 'guard_name' => 'api']);

        $adminDakar = DB::table('users')->where('email', 'admin.dakar@gescrim.sn')->first();
        if ($adminDakar) {
            DB::table('users')->where('id', $adminDakar->id)->update([
                'email' => 'gestionnaire.dakar@gescrim.sn',
                'name'  => 'Gestionnaire Région Dakar',
            ]);
            DB::table('model_has_roles')
                ->where('model_type', 'App\\Models\\User')
                ->where('model_id', $adminDakar->id)
                ->delete();
            DB::table('model_has_roles')->insert([
                'role_id'    => $gestionnaireRole->id,
                'model_type' => 'App\\Models\\User',
                'model_id'   => $adminDakar->id,
            ]);
            DB::table('users')->where('id', $adminDakar->id)->update([
                'read_scope_type'  => 'region',
                'write_scope_type' => 'region',
                'service_id'       => null,
            ]);
        }

        // admin.commissariat → agent (un gestionnaire de commissariat reste agent)
        $adminCommissariat = DB::table('users')->where('email', 'admin.commissariat@gescrim.sn')->first();
        if ($adminCommissariat) {
            DB::table('users')->where('id', $adminCommissariat->id)->update([
                'email' => 'agent.commissariat@gescrim.sn',
                'name'  => 'Agent Commissariat Central',
            ]);
            $agentRole = Role::where('name', 'agent')->where('guard_name', 'api')->first();
            if ($agentRole) {
                DB::table('model_has_roles')
                    ->where('model_type', 'App\\Models\\User')
                    ->where('model_id', $adminCommissariat->id)
                    ->delete();
                DB::table('model_has_roles')->insert([
                    'role_id'    => $agentRole->id,
                    'model_type' => 'App\\Models\\User',
                    'model_id'   => $adminCommissariat->id,
                ]);
            }
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void {}
};
