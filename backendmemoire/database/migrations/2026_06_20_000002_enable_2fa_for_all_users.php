<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->update([
            'is_2fa_enabled'          => true,
            'two_factor_confirmed_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('users')->update([
            'is_2fa_enabled'          => false,
            'two_factor_confirmed_at' => null,
        ]);
    }
};
