<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Supprimer les doublons éventuels avant d'ajouter la contrainte
        DB::statement('
            DELETE FROM device_sessions
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM device_sessions
                GROUP BY user_id, device_id
            )
        ');

        Schema::table('device_sessions', function (Blueprint $table) {
            // Supprimer l'index simple existant, remplacer par unique
            $table->dropIndex(['user_id', 'device_id']);
            $table->unique(['user_id', 'device_id'], 'device_sessions_user_id_device_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('device_sessions', function (Blueprint $table) {
            $table->dropUnique('device_sessions_user_id_device_id_unique');
            $table->index(['user_id', 'device_id']);
        });
    }
};
