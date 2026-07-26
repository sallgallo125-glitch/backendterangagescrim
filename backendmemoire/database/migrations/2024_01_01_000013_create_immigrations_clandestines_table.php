<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration pour la gestion des données de l'immigration clandestine
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('immigrations_clandestines', function (Blueprint $table) {
            $table->id();
            $table->integer('nombre_interpellation');
            $table->date('date');
            $table->foreignId('service_id')->constrained('services')->onDelete('cascade');
            $table->integer('nombre_hommes')->default(0);
            $table->integer('nombre_femmes')->default(0);
            $table->integer('nombre_enfants')->default(0);
            $table->integer('nombre_maries')->default(0);
            $table->integer('nombre_celibataires')->default(0);
            $table->integer('nombre_senegalais')->default(0);
            $table->integer('nombre_etrangers')->default(0);
            $table->string('zone_depart')->nullable();
            $table->decimal('zone_depart_lat', 10, 8)->nullable();
            $table->decimal('zone_depart_lng', 11, 8)->nullable();
            $table->string('zone_arrivee_prevue')->nullable();
            $table->decimal('zone_arrivee_lat', 10, 8)->nullable();
            $table->decimal('zone_arrivee_lng', 11, 8)->nullable();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index(['date', 'service_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('immigrations_clandestines');
    }
};
