<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('victimes', function (Blueprint $table) {
            $table->string('adresse')->nullable()->after('nationalite');
            $table->string('telephone')->nullable()->after('adresse');
            $table->string('contact_urgence_nom')->nullable()->after('telephone');
            $table->string('contact_urgence_telephone')->nullable()->after('contact_urgence_nom');
            $table->enum('gravite_blessures', ['Légère', 'Grave', 'Critique', 'Indemne'])->nullable()->after('contact_urgence_telephone');
            $table->string('etat_medical')->nullable()->after('gravite_blessures');
            $table->boolean('statut_deces')->default(false)->after('etat_medical');
            $table->text('observations')->nullable()->after('statut_deces');
        });
    }

    public function down(): void
    {
        Schema::table('victimes', function (Blueprint $table) {
            $table->dropColumn([
                'adresse', 'telephone',
                'contact_urgence_nom', 'contact_urgence_telephone',
                'gravite_blessures', 'etat_medical',
                'statut_deces', 'observations',
            ]);
        });
    }
};
