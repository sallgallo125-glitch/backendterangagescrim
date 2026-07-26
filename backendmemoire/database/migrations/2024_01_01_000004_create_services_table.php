<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration pour la gestion des services de la DSP (CC, CA, PP, CU, CS)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->enum('type', ['CC', 'CA', 'PP', 'CU', 'CS'])->comment('Commissariat Central, Commissariat Arrondissement, Poste de Police, Commissariat Urbain, Commissariat Spécial');
            $table->foreignId('commune_id')->constrained('communes')->onDelete('cascade');
            $table->string('adresse')->nullable();
            $table->string('telephone')->nullable();
            $table->string('email')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
