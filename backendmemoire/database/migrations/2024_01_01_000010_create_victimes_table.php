<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration pour la gestion des victimes et impliqués
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('victimes', function (Blueprint $table) {
            $table->id();
            $table->string('nom')->nullable();
            $table->string('prenom')->nullable();
            $table->string('no_cin_passeport')->nullable();
            $table->enum('sexe', ['M', 'F'])->nullable();
            $table->integer('age')->nullable();
            $table->enum('nationalite', ['Sénégalaise', 'Étrangère'])->default('Sénégalaise');
            $table->foreignId('infraction_id')->nullable()->constrained('infractions')->onDelete('cascade');
            $table->foreignId('accident_id')->nullable()->constrained('accidents')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('victimes');
    }
};
