<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration pour la gestion des infractions
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('infractions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('type_infraction_id')->constrained('type_infractions')->onDelete('cascade');
            $table->foreignId('service_id')->constrained('services')->onDelete('cascade');
            $table->integer('annee');
            $table->date('date');
            $table->string('lieu');
            $table->foreignId('commune_id')->constrained('communes')->onDelete('cascade');
            $table->enum('issue', ['Constatée', 'Déférée'])->default('Constatée');
            $table->string('type_drogue')->nullable()->comment('cocaïne, chanvre, etc.');
            $table->string('unite')->nullable()->comment('kilo, cornet, etc.');
            $table->decimal('quantite', 10, 2)->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->text('description')->nullable();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade')->comment('Agent qui a saisi');
            $table->enum('sync_status', ['pending', 'synced'])->default('synced')->comment('Statut de synchronisation offline');
            $table->timestamps();

            $table->index(['date', 'commune_id']);
            $table->index(['annee', 'service_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('infractions');
    }
};
