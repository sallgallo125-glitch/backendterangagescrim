<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'infractions',
            'accidents',
            'amendes_pieces_saisies',
            'immigrations_clandestines',
            'services_remuneres',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->string('local_id', 36)->nullable()->unique()->after('id');
            });
        }
    }

    public function down(): void
    {
        $tables = [
            'infractions',
            'accidents',
            'amendes_pieces_saisies',
            'immigrations_clandestines',
            'services_remuneres',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('local_id');
            });
        }
    }
};
