<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration pour les catégories et types d'infractions
return new class extends Migration
{
    public function up(): void
    {
        // Catégories : Crime, Délit, Contravention
        Schema::create('categorie_infractions', function (Blueprint $table) {
            $table->id();
            $table->string('nom')->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Types : arme blanche, arme à feu, vol, etc.
        Schema::create('type_infractions', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->foreignId('categorie_infraction_id')->constrained('categorie_infractions')->onDelete('cascade');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->unique(['nom', 'categorie_infraction_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('type_infractions');
        Schema::dropIfExists('categorie_infractions');
    }
};
