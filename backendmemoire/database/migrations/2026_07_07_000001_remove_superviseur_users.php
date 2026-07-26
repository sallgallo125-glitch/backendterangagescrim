<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->whereIn('email', ['superviseur@gescrim.sn', 'superviseurdakar@gescrim.sn'])
            ->delete();
    }

    public function down(): void {}
};
