<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('amendes_pieces_saisies', function (Blueprint $table) {
            $table->unsignedBigInteger('commune_id')->nullable()->after('service_id');
            $table->string('lieu')->nullable()->after('commune_id');
            $table->string('plaque_immatriculation')->nullable()->after('lieu');
            $table->foreign('commune_id')->references('id')->on('communes')->nullOnDelete();
        });

        Schema::table('services_remuneres', function (Blueprint $table) {
            $table->unsignedBigInteger('commune_id')->nullable()->after('service_id');
            $table->foreign('commune_id')->references('id')->on('communes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('amendes_pieces_saisies', function (Blueprint $table) {
            $table->dropForeign(['commune_id']);
            $table->dropColumn(['commune_id', 'lieu', 'plaque_immatriculation']);
        });

        Schema::table('services_remuneres', function (Blueprint $table) {
            $table->dropForeign(['commune_id']);
            $table->dropColumn('commune_id');
        });
    }
};
