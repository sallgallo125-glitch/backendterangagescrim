<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration pour la gestion du personnel de la DSP
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personnels', function (Blueprint $table) {
            $table->id();
            $table->string('ccap')->unique()->comment('Code Corps/Agent/Personnel');
            $table->string('prenom');
            $table->string('nom');
            $table->string('grade')->nullable();
            $table->string('telephone')->nullable();
            $table->integer('anciennete')->nullable()->comment('Ancienneté en années');
            $table->date('date_entree_corps')->nullable();
            $table->enum('sexe', ['M', 'F']);
            $table->string('situation_matrimoniale')->nullable()->comment('Célibataire, Marié(e), Divorcé(e), Veuf(ve)');
            $table->date('date_naissance')->nullable();
            $table->string('lieu_naissance')->nullable();
            $table->foreignId('service_id')->constrained('services')->onDelete('cascade');
            $table->enum('statut', ['Actif', 'Inactif', 'Mission'])->default('Actif');
            $table->text('sanction')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personnels');
    }
};
