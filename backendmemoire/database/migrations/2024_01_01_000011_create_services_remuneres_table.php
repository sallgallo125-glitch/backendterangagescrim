<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration pour la gestion des services rémunérés
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services_remuneres', function (Blueprint $table) {
            $table->id();
            $table->string('libelle');
            $table->foreignId('service_id')->constrained('services')->onDelete('cascade');
            $table->date('date');
            $table->decimal('montant', 12, 2);
            $table->text('description')->nullable();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index(['date', 'service_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services_remuneres');
    }
};
