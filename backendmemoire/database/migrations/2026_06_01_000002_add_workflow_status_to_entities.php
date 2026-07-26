<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const WORKFLOW_VALUES = ['Brouillon', 'En cours', 'Validé', 'Clôturé', 'Archivé'];

    public function up(): void
    {
        $tables = ['infractions', 'accidents', 'immigrations_clandestines', 'amendes_pieces_saisies'];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->enum('workflow_status', ['Brouillon', 'En cours', 'Validé', 'Clôturé', 'Archivé'])
                  ->default('En cours')
                  ->after('id');
            });
        }
    }

    public function down(): void
    {
        foreach (['infractions', 'accidents', 'immigrations_clandestines', 'amendes_pieces_saisies'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('workflow_status');
            });
        }
    }
};
