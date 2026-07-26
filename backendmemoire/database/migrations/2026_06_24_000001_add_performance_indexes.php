<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('infractions', function (Blueprint $table) {
            $table->index('issue');
            $table->index('workflow_status');
        });

        Schema::table('accidents', function (Blueprint $table) {
            $table->index('workflow_status');
        });

        Schema::table('personnels', function (Blueprint $table) {
            $table->index(['service_id', 'statut']);
        });

        Schema::table('victimes', function (Blueprint $table) {
            $table->index('infraction_id');
            $table->index('accident_id');
        });
    }

    public function down(): void
    {
        Schema::table('infractions', function (Blueprint $table) {
            $table->dropIndex(['issue']);
            $table->dropIndex(['workflow_status']);
        });

        Schema::table('accidents', function (Blueprint $table) {
            $table->dropIndex(['workflow_status']);
        });

        Schema::table('personnels', function (Blueprint $table) {
            $table->dropIndex(['service_id', 'statut']);
        });

        Schema::table('victimes', function (Blueprint $table) {
            $table->dropIndex(['infraction_id']);
            $table->dropIndex(['accident_id']);
        });
    }
};
