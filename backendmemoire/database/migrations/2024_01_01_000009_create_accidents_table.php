<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Migration pour la gestion des accidents de la circulation
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accidents', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['matériel', 'corporel', 'mortel']);
            $table->date('date');
            $table->string('lieu');
            $table->foreignId('commune_id')->constrained('communes')->onDelete('cascade');
            $table->foreignId('service_id')->constrained('services')->onDelete('cascade');
            $table->string('moyen')->nullable()->comment('Véhicule, scooter, calèche, etc.');
            $table->text('cause_probable')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->text('description')->nullable();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('sync_status', ['pending', 'synced'])->default('synced');
            $table->timestamps();

            $table->index(['date', 'type']);
            $table->index(['commune_id', 'service_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accidents');
    }
};
