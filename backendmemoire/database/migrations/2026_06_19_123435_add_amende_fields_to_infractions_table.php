<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('infractions', function (Blueprint $table) {
            $table->decimal('montant_amende', 12, 2)->nullable()->after('description');
            $table->string('plaque_vehicule', 20)->nullable()->after('montant_amende');
        });
    }

    public function down(): void
    {
        Schema::table('infractions', function (Blueprint $table) {
            $table->dropColumn(['montant_amende', 'plaque_vehicule']);
        });
    }
};
