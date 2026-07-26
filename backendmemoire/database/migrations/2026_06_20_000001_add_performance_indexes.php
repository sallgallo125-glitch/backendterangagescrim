<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $indexes = [
            'login_attempts'  => [['email', 'attempted_at'], 'login_attempts_email_attempted_at_index'],
            'audit_logs'      => [['user_id', 'action'],     'audit_logs_user_id_action_index'],
            'infractions'     => [['user_id'],               'infractions_user_id_index'],
        ];

        foreach ($indexes as $table => [$cols, $name]) {
            $exists = collect(\DB::select("SELECT indexname FROM pg_indexes WHERE tablename = ? AND indexname = ?", [$table, $name]))->isNotEmpty();
            if (!$exists) {
                Schema::table($table, function (Blueprint $t) use ($cols) {
                    $t->index($cols);
                });
            }
        }
    }

    public function down(): void
    {
        Schema::table('login_attempts', function (Blueprint $table) {
            $table->dropIndex(['email', 'attempted_at']);
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'action']);
        });

        Schema::table('infractions', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
        });
    }
};
