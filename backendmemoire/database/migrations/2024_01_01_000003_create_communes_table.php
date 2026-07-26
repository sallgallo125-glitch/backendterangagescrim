<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration pour la gestion des communes
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('communes', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('code')->unique()->nullable();
            $table->foreignId('departement_id')->constrained('departements')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['nom', 'departement_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('communes');
    }
};
