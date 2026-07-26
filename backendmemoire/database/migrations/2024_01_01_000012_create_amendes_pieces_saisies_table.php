<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration pour la gestion des amendes forfaitaires et pièces saisies
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('amendes_pieces_saisies', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['Amende', 'Pièce saisie']);
            $table->foreignId('service_id')->constrained('services')->onDelete('cascade');
            $table->date('date');
            $table->decimal('montant', 12, 2);
            $table->text('description')->nullable();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index(['date', 'type', 'service_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('amendes_pieces_saisies');
    }
};
