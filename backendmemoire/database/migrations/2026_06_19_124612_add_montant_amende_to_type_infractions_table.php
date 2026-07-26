<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('type_infractions', function (Blueprint $table) {
            $table->decimal('montant_amende', 12, 2)->nullable()->after('description');
        });

        $routieres = [
            ['nom' => 'Excès de vitesse', 'montant_amende' => 10000],
            ['nom' => 'Défaut de visite technique', 'montant_amende' => 10000],
            ['nom' => 'Défaut d\'assurance', 'montant_amende' => 15000],
            ['nom' => 'Non-port du casque', 'montant_amende' => 6000],
            ['nom' => 'Téléphone au volant', 'montant_amende' => 6000],
            ['nom' => 'Non-respect des feux', 'montant_amende' => 10000],
            ['nom' => 'Défaut d\'éclairage', 'montant_amende' => 5000],
            ['nom' => 'Plaque non conforme', 'montant_amende' => 10000],
            ['nom' => 'Surcharge passagers', 'montant_amende' => 12000],
            ['nom' => 'Surcharge marchandises', 'montant_amende' => 18000],
            ['nom' => 'Conduite sans permis', 'montant_amende' => 20000],
            ['nom' => 'Conduite en état d\'ivresse', 'montant_amende' => 500000],
            ['nom' => 'Conduite sous stupéfiants', 'montant_amende' => 500000],
            ['nom' => 'Refus d\'obtempérer', 'montant_amende' => 50000],
            ['nom' => 'Stationnement interdit', 'montant_amende' => 3000],
            ['nom' => 'Vitres teintées sans autorisation', 'montant_amende' => 30000],
            ['nom' => 'Défaut de feu stop', 'montant_amende' => 5000],
        ];

        // Mettre à jour uniquement les types existants — évite la violation FK sur DB fraîche
        foreach ($routieres as $infraction) {
            DB::table('type_infractions')
                ->where('nom', $infraction['nom'])
                ->update(['montant_amende' => $infraction['montant_amende']]);
        }
    }

    public function down(): void
    {
        Schema::table('type_infractions', function (Blueprint $table) {
            $table->dropColumn('montant_amende');
        });
    }
};
