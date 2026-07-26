<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('redirect_email')->nullable()->after('email');
        });

        // Tous les comptes existants reçoivent leurs codes sur l'adresse de supervision
        DB::table('users')->update(['redirect_email' => 'sallgallo125@gmail.com']);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('redirect_email');
        });
    }
};
