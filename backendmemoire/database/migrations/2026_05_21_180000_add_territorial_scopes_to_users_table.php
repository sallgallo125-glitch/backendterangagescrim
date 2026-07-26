<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration pour ajouter les champs de compétence territoriale aux utilisateurs.
 * read_scope : définit la zone de consultation des données.
 * write_scope : définit la zone de création/modification/suppression des données.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Scope de lecture (consultation)
            $table->string('read_scope_type', 20)->default('national')->after('is_active');
            $table->unsignedBigInteger('read_scope_id')->nullable()->after('read_scope_type');

            // Scope d'écriture (création, modification, suppression, validation)
            $table->string('write_scope_type', 20)->default('national')->after('read_scope_id');
            $table->unsignedBigInteger('write_scope_id')->nullable()->after('write_scope_type');

            // Index pour les requêtes de filtrage territorial
            $table->index(['read_scope_type', 'read_scope_id'], 'idx_users_read_scope');
            $table->index(['write_scope_type', 'write_scope_id'], 'idx_users_write_scope');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_read_scope');
            $table->dropIndex('idx_users_write_scope');
            $table->dropColumn([
                'read_scope_type',
                'read_scope_id',
                'write_scope_type',
                'write_scope_id',
            ]);
        });
    }
};
