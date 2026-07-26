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
            'services_remuneres',
            'immigrations_clandestines',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->time('heure')->nullable()->after('date');
            });
        }
    }

    public function down(): void
    {
        $tables = [
            'infractions',
            'accidents',
            'amendes_pieces_saisies',
            'services_remuneres',
            'immigrations_clandestines',
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('heure');
            });
        }
    }
};
