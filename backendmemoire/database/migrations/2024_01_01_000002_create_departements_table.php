<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration pour la gestion des départements
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departements', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('code')->unique();
            $table->foreignId('region_id')->constrained('regions')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['nom', 'region_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('departements');
    }
};
