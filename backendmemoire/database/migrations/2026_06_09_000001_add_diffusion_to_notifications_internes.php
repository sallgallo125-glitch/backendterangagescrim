<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications_internes', function (Blueprint $table) {
            // Étendu : support success/error en plus de alert/info/warning
            $table->string('type', 20)->default('info')->change();

            // Mode de diffusion : global, role, region, departement, commune, service, user
            $table->string('diffusion_type', 20)->default('user')->after('canal');

            // Identifiant de la cible (role_name, region_id, dept_id, commune_id, service_id)
            $table->string('target_id', 100)->nullable()->after('diffusion_type');

            // Qui a envoyé la notification
            $table->foreignId('sender_id')->nullable()->constrained('users')->nullOnDelete()->after('target_id');

            $table->index(['diffusion_type', 'target_id']);
            $table->index('sender_id');
        });
    }

    public function down(): void
    {
        Schema::table('notifications_internes', function (Blueprint $table) {
            $table->dropIndex(['diffusion_type', 'target_id']);
            $table->dropIndex(['sender_id']);
            $table->dropForeign(['sender_id']);
            $table->dropColumn(['diffusion_type', 'target_id', 'sender_id']);
        });
    }
};
