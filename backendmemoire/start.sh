#!/bin/sh

echo "=== GESCRIM startup ===" >&2
echo "APP_ENV=${APP_ENV}" >&2
php --version >&2

echo "--- fix storage permissions ---" >&2
mkdir -p /app/storage/framework/cache/data /app/storage/framework/sessions /app/storage/framework/views /app/storage/logs /app/storage/fonts /app/bootstrap/cache
mkdir -p /app/storage/app/public/media
if [ -d /app/storage/app/public/pgdata ]; then
    echo "  Cleaning up stale PostgreSQL data from volume..." >&2
    rm -rf /app/storage/app/public/pgdata /app/storage/app/public/pg_* /app/storage/app/public/PG_VERSION /app/storage/app/public/base /app/storage/app/public/global /app/storage/app/public/postgresql* 2>/dev/null || true
fi
chmod -R 777 /app/storage /app/bootstrap/cache 2>/dev/null || true
php /app/artisan storage:link --force 2>&1 || true

echo "--- setting APP_URL ---" >&2
if [ -n "$RAILWAY_PUBLIC_DOMAIN" ]; then
    export APP_URL="https://${RAILWAY_PUBLIC_DOMAIN}"
    echo "  APP_URL=${APP_URL}" >&2
fi

echo "--- starting PHP server on :${PORT:-8000} (background) ---" >&2
php -d memory_limit=512M -d max_execution_time=60 -S 0.0.0.0:${PORT:-8000} -t /app/public /app/public/router.php &
PHP_PID=$!

# Wait for database to be reachable (max 60s)
echo "--- waiting for database ---" >&2
MAX_TRIES=30
TRIES=0
until php /app/artisan tinker --execute="DB::connection()->getPdo();" 2>/dev/null; do
    TRIES=$((TRIES + 1))
    if [ $TRIES -ge $MAX_TRIES ]; then
        echo "WARNING: DB not reachable after ${MAX_TRIES} retries" >&2
        break
    fi
    echo "  DB not ready, retry $TRIES/$MAX_TRIES..." >&2
    sleep 2
done

echo "--- migrate ---" >&2
php /app/artisan migrate --force 2>&1 || echo "WARNING: migration failed, server starting anyway" >&2

echo "--- clearing expired login locks (>15 min) ---" >&2
php /app/artisan tinker --execute="DB::table('login_attempts')->where('attempted_at','<',now()->subMinutes(15))->delete(); echo 'expired login_attempts cleared';" 2>&1 || true

echo "--- seed (if needed) ---" >&2
ROLE_COUNT=$(php /app/artisan tinker --execute="echo \Spatie\Permission\Models\Role::count();" 2>&1 | grep -oE '[0-9]+' | tail -1)
AGENT_EXISTS=$(php /app/artisan tinker --execute="echo \App\Models\User::where('email','agent@gescrim.sn')->count();" 2>&1 | grep -oE '[0-9]+' | tail -1)
echo "  Roles: '${ROLE_COUNT}', Agent exists: '${AGENT_EXISTS}'" >&2

if [ -z "$ROLE_COUNT" ] || [ "$ROLE_COUNT" = "0" ]; then
    echo "  No roles found — running SubdivisionSeeder..." >&2
    php /app/artisan db:seed --class=SubdivisionSeeder --force 2>&1 || echo "WARN: SubdivisionSeeder failed" >&2
    php /app/artisan db:seed --class=ServiceSeeder --force 2>&1 || echo "WARN: ServiceSeeder failed" >&2
    php /app/artisan db:seed --class=RolePermissionSeeder --force 2>&1 || echo "WARN: RolePermissionSeeder failed" >&2
fi

ADMIN_NATIONAL_EXISTS=$(php /app/artisan tinker --execute="echo \App\Models\User::where('email','admin.national@gescrim.sn')->count();" 2>&1 | grep -oE '[0-9]+' | tail -1)
echo "  Admin national exists: '${ADMIN_NATIONAL_EXISTS}'" >&2

if [ -z "$AGENT_EXISTS" ] || [ "$AGENT_EXISTS" = "0" ]; then
    echo "  Agent user missing — running UserSeeder..." >&2
    php /app/artisan db:seed --class=UserSeeder --force 2>&1 || echo "WARN: UserSeeder failed" >&2
    php /app/artisan db:seed --class=TestUsersSeeder --force 2>&1 || echo "WARN: TestUsersSeeder failed" >&2
    php /app/artisan db:seed --class=InfractionTypeSeeder --force 2>&1 || echo "WARN: InfractionTypeSeeder failed" >&2
    php /app/artisan db:seed --class=DataSeeder --force 2>&1 || echo "WARN: DataSeeder failed" >&2
    php /app/artisan db:seed --class=RealisticDataSeeder --force 2>&1 || echo "WARN: RealisticDataSeeder failed" >&2
    echo "  Seeding done." >&2
elif [ -z "$ADMIN_NATIONAL_EXISTS" ] || [ "$ADMIN_NATIONAL_EXISTS" = "0" ]; then
    echo "  admin.national@gescrim.sn missing — running TestUsersSeeder..." >&2
    php /app/artisan db:seed --class=TestUsersSeeder --force 2>&1 || echo "WARN: TestUsersSeeder failed" >&2
    echo "  TestUsersSeeder done." >&2
else
    echo "  All users exist, skipping full seed." >&2
fi

PERSONNEL_COUNT=$(php /app/artisan tinker --execute="echo \App\Models\Personnel::count();" 2>&1 | grep -oE '[0-9]+' | tail -1)
echo "  Personnel count: '${PERSONNEL_COUNT}'" >&2
if [ -z "$PERSONNEL_COUNT" ] || [ "$PERSONNEL_COUNT" = "0" ]; then
    echo "  No personnel/services-remuneres found — running RealisticDataSeeder..." >&2
    php /app/artisan db:seed --class=RealisticDataSeeder --force 2>&1 || echo "WARN: RealisticDataSeeder failed" >&2
fi

echo "--- clear OTP cooldown cache ---" >&2
php /app/artisan cache:clear 2>&1 || echo "WARN: cache:clear failed" >&2

echo "--- unlock expired login locks (>15 min only) ---" >&2
php /app/artisan tinker --execute="DB::table('login_attempts')->where('attempted_at','<',now()->subMinutes(15))->delete(); echo 'expired login_attempts cleared';" 2>&1 || true

echo "--- ensure test accounts exist with correct password ---" >&2
php /app/artisan tinker --execute="
use App\Models\User;
use Illuminate\Support\Facades\Hash;
\$accounts = [
    ['email' => 'admin@gescrim.sn', 'name' => 'Administrateur',  'role' => 'administrateur', 'scope' => 'national', 'scope_id' => null, 'service_id' => null],
    ['email' => 'agent@gescrim.sn', 'name' => 'Agent Terrain',   'role' => 'agent',          'scope' => 'service',  'scope_id' => 1,    'service_id' => 1],
];
foreach (\$accounts as \$a) {
    \$u = User::firstOrCreate(['email' => \$a['email']], [
        'name' => \$a['name'], 'password' => Hash::make('password123'),
        'telephone' => '+221 77 000 00 09', 'is_active' => true,
        'is_2fa_enabled' => true, 'two_factor_confirmed_at' => now(),
        'service_id' => \$a['service_id'],
        'read_scope_type' => \$a['scope'], 'read_scope_id' => \$a['scope_id'],
        'write_scope_type' => \$a['scope'], 'write_scope_id' => \$a['scope_id'],
    ]);
    \$u->syncRoles([\$a['role']]);
    echo 'OK: ' . \$a['email'] . PHP_EOL;
}
" 2>&1 || echo "WARN: test accounts ensure failed" >&2

echo "--- syncing role permissions ---" >&2
php /app/artisan db:seed --class=RolePermissionSeeder --force 2>&1 || echo "WARN: RolePermissionSeeder failed" >&2

echo "--- enabling 2FA for all users (sauf compte demo soutenance) ---" >&2
php /app/artisan tinker --execute="\App\Models\User::where('email', '!=', 'admingallo@gescrim.sn')->update(['is_2fa_enabled' => true, 'two_factor_confirmed_at' => now()]);" 2>&1 || echo "WARN: 2FA enable failed" >&2

echo "--- ensure compte demo soutenance (admingallo@gescrim.sn, sans 2FA) ---" >&2
php /app/artisan tinker --execute="
use App\Models\User;
use App\Models\Service;
use Illuminate\Support\Facades\Hash;
\$service = Service::where('nom', 'like', '%Golf Sud%')->first();
\$serviceId = \$service ? \$service->id : 1;
\$scopeId   = \$service ? \$service->id : 1;
\$u = User::updateOrCreate(
    ['email' => 'admingallo@gescrim.sn'],
    [
        'name'                   => 'Gallo Admin',
        'password'               => Hash::make('passer123'),
        'telephone'              => '+221 77 000 00 00',
        'is_active'              => true,
        'is_2fa_enabled'         => false,
        'two_factor_confirmed_at'=> null,
        'service_id'             => \$serviceId,
        'read_scope_type'        => 'national',
        'read_scope_id'          => null,
        'write_scope_type'       => 'national',
        'write_scope_id'         => null,
    ]
);
\$u->syncRoles(['administrateur']);
echo 'OK: admingallo@gescrim.sn (service: ' . \$serviceId . ' - ' . (\$service ? \$service->nom : 'fallback id=1') . ', 2FA: off)' . PHP_EOL;
" 2>&1 || echo "WARN: compte admingallo failed" >&2


echo "--- caching config ---" >&2
php /app/artisan config:clear 2>&1 || true
php /app/artisan route:clear 2>&1 || true
php /app/artisan view:clear 2>&1 || true
php /app/artisan config:cache 2>&1 || echo "WARN: config:cache failed" >&2
php /app/artisan view:cache 2>&1 || echo "WARN: view:cache failed" >&2

echo "--- init complete, PHP server already running (PID $PHP_PID) ---" >&2
wait $PHP_PID
