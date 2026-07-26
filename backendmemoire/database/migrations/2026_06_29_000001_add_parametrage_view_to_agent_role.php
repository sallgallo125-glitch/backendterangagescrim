<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

return new class extends Migration
{
    public function up(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $agent = Role::where('name', 'agent')->where('guard_name', 'api')->first();
        if (!$agent) return;

        $permission = Permission::firstOrCreate(
            ['name' => 'parametrage.view', 'guard_name' => 'api']
        );

        if (!$agent->hasPermissionTo($permission)) {
            $agent->givePermissionTo($permission);
        }
    }

    public function down(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $agent = Role::where('name', 'agent')->where('guard_name', 'api')->first();
        $agent?->revokePermissionTo('parametrage.view');
    }
};
