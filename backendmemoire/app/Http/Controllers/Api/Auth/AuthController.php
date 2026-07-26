<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Api\ApiController;
use App\Mail\PasswordResetMail;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\TwoFactorService;
use App\Services\DeviceSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use OpenApi\Attributes as OA;

class AuthController extends ApiController
{
    use \App\Traits\GeneratesSecurePassword;

    private int $pwdResetExpiry = 10; // minutes

    public function __construct(
        private TwoFactorService    $twoFactor,
        private DeviceSessionService $deviceSession,
    ) {
        $this->middleware('auth:api')->except(['login', 'verify2fa', 'forgotPassword', 'resetPasswordConfirm']);
    }

    // ──────────────────────────────────────────────────────────────
    // LOGIN — Étape 1 : identifiants
    // ──────────────────────────────────────────────────────────────

    #[OA\Post(
        path: "/api/auth/login",
        summary: "Connexion utilisateur (étape 1)",
        tags: ["Authentification"],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["email", "password"],
                properties: [
                    new OA\Property(property: "email", type: "string", format: "email", example: "admin@gescrim.sn"),
                    new OA\Property(property: "password", type: "string", format: "password", example: "password"),
                    new OA\Property(property: "device_id", type: "string", example: "test-device-001"),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Succès — retourne access_token ou requires_2fa"),
            new OA\Response(response: 401, description: "Identifiants incorrects"),
            new OA\Response(response: 422, description: "Erreur de validation"),
        ]
    )]
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email'    => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $ip    = $request->ip() ?? '0.0.0.0';
        $email = $request->email;

        $isMobileClient = $request->header('X-Mobile-Client') === 'flutter';

        // ── Verrouillage (5 échecs en 15 min) ──
        $recentFailures = DB::table('login_attempts')
            ->where('email', $email)
            ->where('success', false)
            ->where('attempted_at', '>=', now()->subMinutes(15))
            ->count();

        if ($recentFailures >= 5) {
            AuditLog::create([
                'user_id'    => null,
                'action'     => 'login_blocked',
                'model_type' => User::class,
                'model_id'   => null,
                'new_values' => ['email' => $email, 'failures' => $recentFailures],
                'ip_address' => $ip,
                'user_agent' => $request->userAgent(),
            ]);
            return $this->errorResponse(
                'Compte temporairement verrouillé suite à trop de tentatives. Réessayez dans 15 minutes.',
                429
            );
        }

        // ── Compte actif + pré-vérification rôle/client avant génération du JWT ──
        $user = User::where('email', $email)->first();
        if ($user && !$user->is_active) {
            return $this->errorResponse('Votre compte est désactivé. Contactez l\'administrateur.', 403);
        }

        $isMobileClient = $request->header('X-Mobile-Client') === 'flutter';
        if ($user) {
            if ($isMobileClient && !$user->hasRole('agent') && $user->email !== 'admingallo@gescrim.sn') {
                return $this->errorResponse('L\'application mobile est réservée aux agents terrain.', 403);
            }
            if (!$isMobileClient && $user->hasRole('agent')) {
                return $this->errorResponse('Les agents terrain doivent utiliser l\'application mobile.', 403);
            }
        }

        // ── Vérification credentials ──
        if (!$token = JWTAuth::attempt($request->only('email', 'password'))) {
            DB::table('login_attempts')->insert([
                'email'        => $email,
                'ip_address'   => $ip,
                'success'      => false,
                'attempted_at' => now(),
            ]);

            AuditLog::create([
                'user_id'    => null,
                'action'     => 'login_failed',
                'model_type' => User::class,
                'model_id'   => null,
                'new_values' => [
                    'email'         => $email,
                    'failures'      => $recentFailures + 1,
                    'captcha_score' => null,
                ],
                'ip_address' => $ip,
                'user_agent' => $request->userAgent(),
            ]);

            $remaining = 4 - $recentFailures;
            $msg = $remaining > 0
                ? "Identifiants incorrects. {$remaining} tentative(s) restante(s) avant verrouillage."
                : 'Identifiants incorrects. Compte verrouillé pour 15 minutes.';

            return $this->errorResponse($msg, 401);
        }

        $user = JWTAuth::setToken($token)->toUser();

        // ── Restriction mobile (garde défensive post-attempt) ──
        if ($isMobileClient && !$user->hasRole('agent') && $user->email !== 'admingallo@gescrim.sn') {
            try { JWTAuth::invalidate($token); } catch (\Throwable) {}
            AuditLog::create([
                'user_id'    => $user->id,
                'action'     => 'mobile_login_denied',
                'model_type' => User::class,
                'model_id'   => $user->id,
                'new_values' => ['email' => $email, 'role' => $user->getRoleNames()->first()],
                'ip_address' => $ip,
                'user_agent' => $request->userAgent(),
            ]);
            return $this->errorResponse('L\'application mobile est réservée aux agents terrain.', 403);
        }

        // ── Restriction web (garde défensive post-attempt) ──
        if (!$isMobileClient && $user->hasRole('agent')) {
            try { JWTAuth::invalidate($token); } catch (\Throwable) {}
            AuditLog::create([
                'user_id'    => $user->id,
                'action'     => 'web_login_denied',
                'model_type' => User::class,
                'model_id'   => $user->id,
                'new_values' => ['email' => $email, 'role' => 'agent', 'reason' => 'web_agent_forbidden'],
                'ip_address' => $ip,
                'user_agent' => $request->userAgent(),
            ]);
            return $this->errorResponse('Les agents terrain doivent utiliser l\'application mobile.', 403);
        }

        // ── 2FA activé : retourner un ticket temporaire, pas de JWT complet ──
        $deviceId = $request->header('X-Device-Id')
            ?? $this->deviceSession->generateDeviceId($request);
        $deviceInfo = $this->deviceSession->verify($user, $request, $deviceId);

        $require2fa = $user->is_2fa_enabled;

        if ($require2fa) {
            // Invalider le token immédiatement — on ne le donne pas encore
            try { JWTAuth::invalidate($token); } catch (\Throwable) {}

            // Envoyer le code OTP par email — fail-open si SMTP injoignable
            try { $this->twoFactor->sendOtp($user); } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('2FA OTP email failed: ' . $e->getMessage());
            }

            // Stocker un ticket de 5 minutes en cache
            $ticket = Str::random(64);
            Cache::put("2fa_ticket:{$ticket}", [
                'user_id'       => $user->id,
                'device_id'     => $deviceId,
                'ip'            => $ip,
                'captcha_score' => null,
            ], now()->addMinutes(5));

            return $this->successResponse([
                'requires_2fa'      => true,
                'two_factor_ticket' => $ticket,
                'email_hint'        => $this->maskEmail($user->email),
            ], 'Un code de vérification a été envoyé à votre adresse email.');
        }

        // ── Pas de 2FA : finaliser la connexion ──
        return $this->finalizeLogin($user, $token, $request, $deviceId);
    }

    // ──────────────────────────────────────────────────────────────
    // VERIFY 2FA — Étape 2 : vérifier le code OTP
    // ──────────────────────────────────────────────────────────────

    public function verify2fa(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'ticket' => 'required|string',
            'code'   => 'required|string|size:6|regex:/^\d{6}$/',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Données invalides.', 422, $validator->errors());
        }

        $ticket    = $request->input('ticket');
        $cacheKey  = "2fa_ticket:{$ticket}";
        $ticketData = Cache::get($cacheKey);

        if (!$ticketData) {
            return $this->errorResponse('Ticket expiré ou invalide. Recommencez la connexion.', 401);
        }

        $user = User::find($ticketData['user_id']);
        if (!$user) {
            return $this->errorResponse('Utilisateur introuvable.', 404);
        }

        // Vérifier que le device_id de l'étape 2 correspond à celui capturé à l'étape 1
        $currentDeviceId = $request->header('X-Device-Id') ?? '';
        if (empty($currentDeviceId) || $currentDeviceId !== ($ticketData['device_id'] ?? '')) {
            AuditLog::create([
                'user_id'    => $user->id,
                'action'     => '2fa_device_mismatch',
                'model_type' => User::class,
                'model_id'   => $user->id,
                'new_values' => ['ticket_device' => $ticketData['device_id'] ?? null],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
            return $this->errorResponse('Appareil non reconnu. Recommencez la connexion.', 401, ['code' => 'DEVICE_MISMATCH']);
        }

        // Compteur d'échecs OTP (5 max en 10 min)
        $otpFailKey = "2fa_fails:{$user->id}";
        $otpFails   = (int) Cache::get($otpFailKey, 0);

        if ($otpFails >= 5) {
            AuditLog::create([
                'user_id'    => $user->id,
                'action'     => '2fa_blocked',
                'model_type' => User::class,
                'model_id'   => $user->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
            return $this->errorResponse('Trop de tentatives OTP. Reconnectez-vous.', 429);
        }

        if (!$this->twoFactor->verify($user, $request->input('code'))) {
            Cache::put($otpFailKey, $otpFails + 1, now()->addMinutes(10));

            AuditLog::create([
                'user_id'    => $user->id,
                'action'     => '2fa_failed',
                'model_type' => User::class,
                'model_id'   => $user->id,
                'new_values' => ['attempts' => $otpFails + 1],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return $this->errorResponse('Code OTP incorrect.', 401);
        }

        // OTP valide : consommer le ticket et le compteur d'échecs
        Cache::forget($cacheKey);
        Cache::forget($otpFailKey);

        // Générer le vrai JWT
        $token = JWTAuth::fromUser($user);

        return $this->finalizeLogin(
            $user,
            $token,
            $request,
            $ticketData['device_id'],
            null,
            true
        );
    }

    // ──────────────────────────────────────────────────────────────
    // LOGOUT
    // ──────────────────────────────────────────────────────────────

    public function logout(Request $request): JsonResponse
    {
        $user = auth()->user();

        // Révoquer uniquement l'appareil courant, pas toutes les sessions
        $deviceId = $request->header('X-Device-Id') ?? $request->cookie('device_id');
        if ($deviceId) {
            $this->deviceSession->revokeCurrent($user, $deviceId);
        }

        AuditLog::create([
            'user_id'    => $user->id,
            'action'     => 'logout',
            'model_type' => User::class,
            'model_id'   => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        auth()->logout();

        return $this->successResponse(null, 'Déconnexion réussie.')
            ->withoutCookie('jwt_token');
    }

    // ──────────────────────────────────────────────────────────────
    // REFRESH
    // ──────────────────────────────────────────────────────────────

    public function refresh(): JsonResponse
    {
        return $this->respondWithToken(auth()->refresh());
    }

    // ──────────────────────────────────────────────────────────────
    // ME
    // ──────────────────────────────────────────────────────────────

    public function me(): JsonResponse
    {
        $user = auth()->user();
        $user->load(['service', 'roles', 'personnel']);

        return $this->successResponse([
            'id'               => $user->id,
            'name'             => $user->name,
            'email'            => $user->email,
            'telephone'        => $user->telephone,
            'is_active'        => $user->is_active,
            'is_2fa_enabled'   => $user->is_2fa_enabled,
            'last_login_at'    => $user->last_login_at,
            'service_id'       => $user->service_id,
            'service'          => $user->service,
            'read_scope_type'  => $user->read_scope_type?->value,
            'read_scope_id'    => $user->read_scope_id,
            'write_scope_type' => $user->write_scope_type?->value,
            'write_scope_id'   => $user->write_scope_id,
            'roles'            => $user->getRoleNames()->map(fn($r) => ['administrateur' => 'admin'][$r] ?? $r)->values(),
            'permissions'      => $user->getAllPermissions()->pluck('name'),
            'personnel'        => $user->personnel,
        ]);
    }

    // ──────────────────────────────────────────────────────────────
    // MOT DE PASSE OUBLIÉ — Étape 1 : demande de réinitialisation
    // ──────────────────────────────────────────────────────────────

    /**
     * POST /api/auth/forgot-password
     * Retrouve le compte et envoie un OTP de réinitialisation.
     * Répond toujours avec un message neutre pour ne pas divulguer si l'email existe.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $ip    = $request->ip() ?? '0.0.0.0';
        $email = $request->input('email');

        // ── Throttle : 3 demandes max par email par heure ──
        $throttleKey = "pwd_reset_throttle:{$email}";
        $attempts    = (int) Cache::get($throttleKey, 0);

        if ($attempts >= 3) {
            AuditLog::create([
                'user_id'    => null,
                'action'     => 'password_reset_throttled',
                'model_type' => User::class,
                'model_id'   => null,
                'new_values' => ['email' => $email],
                'ip_address' => $ip,
                'user_agent' => $request->userAgent(),
            ]);
            // Réponse neutre pour ne pas aider l'énumération
            return $this->successResponse(
                ['email_hint' => $this->maskEmail($email)],
                'Si un compte correspond à cet email, un code de réinitialisation a été envoyé.'
            );
        }

        Cache::put($throttleKey, $attempts + 1, now()->addHour());

        $user = User::where('email', $email)->first();

        // Réponse identique si l'email n'existe pas (anti-énumération)
        if (!$user || !$user->is_active) {
            return $this->successResponse(
                ['email_hint' => $this->maskEmail($email)],
                'Si un compte correspond à cet email, un code de réinitialisation a été envoyé.'
            );
        }

        // ── Cooldown 90s entre deux envois pour ce compte ──
        $cooldownKey = "pwd_reset_cooldown:{$user->id}";
        if (Cache::has($cooldownKey)) {
            return $this->successResponse(
                ['email_hint' => $this->maskEmail($email)],
                'Si un compte correspond à cet email, un code de réinitialisation a été envoyé.'
            );
        }

        // ── Générer et stocker l'OTP de réinitialisation ──
        $code   = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $ticket = Str::random(64);

        Cache::put("pwd_reset_otp:{$user->id}", bcrypt($code), now()->addMinutes($this->pwdResetExpiry));
        Cache::put("pwd_reset_ticket:{$ticket}", $user->id, now()->addMinutes($this->pwdResetExpiry));
        Cache::put($cooldownKey, true, now()->addSeconds(90));

        try {
            $recipient = $user->redirect_email ?? $user->email;
            Mail::to($recipient)->send(new PasswordResetMail($code, $user->name, $this->pwdResetExpiry));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Password reset email failed: ' . $e->getMessage());
        }

        AuditLog::create([
            'user_id'    => $user->id,
            'action'     => 'password_reset_requested',
            'model_type' => User::class,
            'model_id'   => $user->id,
            'new_values' => ['ip' => $ip],
            'ip_address' => $ip,
            'user_agent' => $request->userAgent(),
        ]);

        return $this->successResponse(
            [
                'ticket'     => $ticket,
                'email_hint' => $this->maskEmail($user->email),
            ],
            'Si un compte correspond à cet email, un code de réinitialisation a été envoyé.'
        );
    }

    // ──────────────────────────────────────────────────────────────
    // MOT DE PASSE OUBLIÉ — Étape 2 : confirmation OTP + nouveau MDP
    // ──────────────────────────────────────────────────────────────

    /**
     * POST /api/auth/reset-password-confirm
     */
    public function resetPasswordConfirm(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'ticket'                => 'required|string',
            'code'                  => 'required|string|size:6|regex:/^\d{6}$/',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $ip     = $request->ip() ?? '0.0.0.0';
        $ticket = $request->input('ticket');

        $userId = Cache::get("pwd_reset_ticket:{$ticket}");
        if (!$userId) {
            return $this->errorResponse('Lien de réinitialisation expiré ou invalide. Recommencez la demande.', 401);
        }

        $user = User::find($userId);
        if (!$user || !$user->is_active) {
            return $this->errorResponse('Compte introuvable ou désactivé.', 404);
        }

        // ── Compteur d'échecs OTP (5 max) ──
        $failKey = "pwd_reset_fails:{$userId}";
        $fails   = (int) Cache::get($failKey, 0);

        if ($fails >= 5) {
            Cache::forget("pwd_reset_ticket:{$ticket}");
            Cache::forget("pwd_reset_otp:{$userId}");
            AuditLog::create([
                'user_id'    => $userId,
                'action'     => 'password_reset_blocked',
                'model_type' => User::class,
                'model_id'   => $userId,
                'ip_address' => $ip,
                'user_agent' => $request->userAgent(),
            ]);
            return $this->errorResponse('Trop de tentatives. Recommencez la demande de réinitialisation.', 429);
        }

        $hashedCode = Cache::get("pwd_reset_otp:{$userId}");
        if (!$hashedCode || !password_verify($request->input('code'), $hashedCode)) {
            Cache::put($failKey, $fails + 1, now()->addMinutes($this->pwdResetExpiry));
            return $this->errorResponse('Code incorrect ou expiré.', 401);
        }

        // ── Code valide : réinitialiser le mot de passe ──
        $user->update(['password' => Hash::make($request->input('password'))]);

        // Révoquer toutes les sessions actives (sécurité)
        $this->deviceSession->revokeAll($user);

        // Nettoyer tous les tokens de reset
        Cache::forget("pwd_reset_ticket:{$ticket}");
        Cache::forget("pwd_reset_otp:{$userId}");
        Cache::forget($failKey);
        Cache::forget("pwd_reset_throttle:{$user->email}");

        AuditLog::create([
            'user_id'    => $user->id,
            'action'     => 'password_reset_confirmed',
            'model_type' => User::class,
            'model_id'   => $user->id,
            'new_values' => ['message' => 'Mot de passe réinitialisé via demande self-service'],
            'ip_address' => $ip,
            'user_agent' => $request->userAgent(),
        ]);

        return $this->successResponse(null, 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.');
    }

    // ──────────────────────────────────────────────────────────────
    // RÉINITIALISATION MOT DE PASSE PAR ADMIN
    // ──────────────────────────────────────────────────────────────

    public function adminResetPassword(Request $request, User $target): JsonResponse
    {
        $me = auth()->user();

        if (!$me->hasRole('administrateur')) {
            return $this->errorResponse('Action réservée aux administrateurs.', 403);
        }

        $plainPassword = $this->generateSecurePassword();
        $target->update(['password' => Hash::make($plainPassword)]);

        Mail::to($target->email)->send(new \App\Mail\WelcomeMail(
            userName:      $target->name,
            userEmail:     $target->email,
            plainPassword: $plainPassword,
            role:          $target->getRoleNames()->first() ?? '',
        ));

        AuditLog::create([
            'user_id'    => $me->id,
            'action'     => 'password_reset_by_admin',
            'model_type' => User::class,
            'model_id'   => $target->id,
            'new_values' => ['reset_by' => $me->email],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return $this->successResponse(null, 'Mot de passe réinitialisé. Les nouveaux identifiants ont été envoyés par email à ' . $target->email . '.');
    }

    // ──────────────────────────────────────────────────────────────
    // MODIFIER PROFIL (nom + téléphone)
    // ──────────────────────────────────────────────────────────────

    public function updateProfile(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name'      => 'required|string|max:255',
            'telephone' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $user = auth()->user();
        $user->update($validator->validated());

        AuditLog::create([
            'user_id'    => $user->id,
            'action'     => 'profile_updated',
            'model_type' => User::class,
            'model_id'   => $user->id,
            'new_values' => ['name' => $user->name],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return $this->successResponse([
            'name'      => $user->name,
            'telephone' => $user->telephone,
        ], 'Profil mis à jour avec succès.');
    }

    // ──────────────────────────────────────────────────────────────
    // CHANGER MOT DE PASSE
    // ──────────────────────────────────────────────────────────────

    public function changePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Erreur de validation', 422, $validator->errors());
        }

        $user = auth()->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return $this->errorResponse('Le mot de passe actuel est incorrect.', 400);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        AuditLog::create([
            'user_id'    => $user->id,
            'action'     => 'password_changed',
            'model_type' => User::class,
            'model_id'   => $user->id,
            'new_values' => ['message' => 'Mot de passe modifié'],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return $this->successResponse(null, 'Mot de passe modifié avec succès.');
    }

    // ──────────────────────────────────────────────────────────────
    // 2FA — Activation / Désactivation
    // ──────────────────────────────────────────────────────────────

    /**
     * POST /api/auth/2fa/setup
     * Envoie un code OTP par email pour confirmer l'activation du 2FA.
     */
    public function setup2fa(Request $request): JsonResponse
    {
        $user = auth()->user();

        if ($user->is_2fa_enabled) {
            return $this->errorResponse('La double authentification est déjà activée.', 409);
        }

        try { $this->twoFactor->sendOtp($user); } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('2FA setup OTP email failed: ' . $e->getMessage());
        }

        return $this->successResponse([
            'email_hint' => $this->maskEmail($user->email),
        ], 'Un code de vérification a été envoyé à votre adresse email.');
    }

    /**
     * POST /api/auth/2fa/enable
     * Confirme le code reçu par email et active le 2FA.
     */
    public function enable2fa(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|size:6|regex:/^\d{6}$/',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Code invalide.', 422, $validator->errors());
        }

        $user = auth()->user();

        if (!$this->twoFactor->verify($user, $request->input('code'))) {
            return $this->errorResponse('Code incorrect ou expiré.', 401);
        }

        $this->twoFactor->enable($user);

        AuditLog::create([
            'user_id'    => $user->id,
            'action'     => '2fa_enabled',
            'model_type' => User::class,
            'model_id'   => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return $this->successResponse(null, 'Double authentification activée avec succès.');
    }

    /**
     * POST /api/auth/revoke-all-sessions/{target}
     * Permet à un admin de déconnecter toutes les sessions d'un compte (compte compromis).
     */
    public function adminRevokeAllSessions(Request $request, User $target): JsonResponse
    {
        $me = auth()->user();

        if (!$me->hasRole('administrateur')) {
            return $this->errorResponse('Action réservée aux administrateurs.', 403);
        }

        $this->deviceSession->revokeAll($target);

        AuditLog::create([
            'user_id'    => $me->id,
            'action'     => 'sessions_revoked_by_admin',
            'model_type' => User::class,
            'model_id'   => $target->id,
            'new_values' => ['revoked_by' => $me->email, 'target' => $target->email],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return $this->successResponse(null, 'Toutes les sessions de ' . $target->name . ' ont été révoquées.');
    }

    /**
     * POST /api/auth/2fa/admin-disable/{target}
     * La désactivation de la 2FA est interdite pour tous les utilisateurs.
     */
    public function adminDisable2fa(Request $request, User $target): JsonResponse
    {
        return $this->errorResponse('La double authentification est obligatoire et ne peut pas être désactivée.', 403);
    }

    /** POST /api/auth/2fa/disable — désactivation interdite */
    public function disable2fa(Request $request): JsonResponse
    {
        return $this->errorResponse('La double authentification est obligatoire et ne peut pas être désactivée.', 403);
    }

    // ──────────────────────────────────────────────────────────────
    // HELPERS PRIVÉS
    // ──────────────────────────────────────────────────────────────

    // ──────────────────────────────────────────────────────────────
    // DÉBLOCAGE COMPTE VERROUILLÉ PAR ADMIN
    // ──────────────────────────────────────────────────────────────

    /**
     * POST /api/auth/unlock/{target}
     * Efface les tentatives échouées pour débloquer immédiatement un compte verrouillé.
     */
    public function adminUnlockAccount(Request $request, User $target): JsonResponse
    {
        $me = auth()->user();

        if (!$me->hasRole('administrateur')) {
            return $this->errorResponse('Action réservée aux administrateurs.', 403);
        }

        DB::table('login_attempts')
            ->where('email', $target->email)
            ->where('success', false)
            ->where('attempted_at', '>=', now()->subMinutes(15))
            ->delete();

        AuditLog::create([
            'user_id'    => $me->id,
            'action'     => 'account_unlocked_by_admin',
            'model_type' => User::class,
            'model_id'   => $target->id,
            'new_values' => ['unlocked_by' => $me->email, 'target' => $target->email],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return $this->successResponse(null, 'Compte de ' . $target->name . ' débloqué avec succès.');
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email);
        $masked = substr($local, 0, 2) . str_repeat('*', max(strlen($local) - 2, 3));
        return $masked . '@' . $domain;
    }

    private function finalizeLogin(
        User    $user,
        string  $token,
        Request $request,
        string  $deviceId,
        ?float  $captchaScore = null,
        bool    $via2fa = false
    ): JsonResponse {
        $ip = $request->ip() ?? '0.0.0.0';

        // Enregistrer la session device
        $this->deviceSession->register($user, $request, $deviceId);

        // Journaliser le login
        DB::table('login_attempts')->insert([
            'email'        => $user->email,
            'ip_address'   => $ip,
            'success'      => true,
            'attempted_at' => now(),
        ]);

        $user->update(['last_login_at' => now()]);

        AuditLog::create([
            'user_id'    => $user->id,
            'action'     => $via2fa ? '2fa_success' : 'login',
            'model_type' => User::class,
            'model_id'   => $user->id,
            'new_values' => array_filter([
                'captcha_score' => $captchaScore,
                'device_id'     => $deviceId,
                'via_2fa'       => $via2fa ?: null,
            ]),
            'ip_address' => $ip,
            'user_agent' => $request->userAgent(),
        ]);

        return $this->respondWithToken($token, $user, $deviceId);
    }

    protected function respondWithToken(string $token, ?User $userModel = null, ?string $deviceId = null): JsonResponse
    {
        $user   = $userModel ?? auth()->user();

        $user->load('service');

        $isMobile = request()->header('X-Mobile-Client') === 'flutter';

        // Mobile : token longue durée (30 jours) pour éviter les déconnexions automatiques.
        // Le mobile ne doit déconnecter l'utilisateur que sur action explicite (bouton déconnexion).
        if ($isMobile && $user) {
            $mobileTtl = 60 * 24 * 30; // 30 jours en minutes
            // Override le TTL pour ce token spécifique
            JWTAuth::factory()->setTTL($mobileTtl);
            $token = JWTAuth::claims(['mob' => true])->fromUser($user);
            $ttlSec = $mobileTtl * 60;
        } else {
            $ttlSec = config('jwt.ttl') * 60;
        }

        $responseData = [
            'access_token' => $token,
            'token_type'   => 'bearer',
            'expires_in'   => $ttlSec,
            'device_id'    => $deviceId,
        ];
        $roleMap = ['administrateur' => 'admin'];
        $responseData['user'] = [
            'id'               => $user->id,
            'name'             => $user->name,
            'email'            => $user->email,
            'service_id'       => $user->service_id,
            'service'          => $user->service,
            'read_scope_type'  => $user->read_scope_type?->value,
            'read_scope_id'    => $user->read_scope_id,
            'write_scope_type' => $user->write_scope_type?->value,
            'write_scope_id'   => $user->write_scope_id,
            'is_2fa_enabled'   => $user->is_2fa_enabled,
            'roles'            => $user->getRoleNames()->map(fn($r) => $roleMap[$r] ?? $r)->values(),
        ];

        $response = $this->successResponse($responseData, 'Connexion réussie.');

        $isProduction = config('app.env') === 'production';
        // SameSite=None requis pour les requêtes cross-origin (frontend hébergé séparément)
        // SameSite=None exige Secure=true en production
        $sameSite = $isProduction ? 'None' : 'Lax';

        $response->cookie(
            'jwt_token',
            $token,
            config('jwt.ttl'),
            '/',
            null,
            $isProduction,  // Secure
            true,           // HttpOnly
            false,
            $sameSite
        );

        if ($deviceId) {
            $response->cookie(
                'device_id',
                $deviceId,
                60 * 24 * 365,
                '/',
                null,
                $isProduction,  // Secure
                false,          // lisible par JS
                false,
                $sameSite
            );
        }

        return $response;
    }
}
