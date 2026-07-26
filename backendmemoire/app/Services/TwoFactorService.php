<?php

namespace App\Services;

use App\Mail\OtpMail;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

class TwoFactorService
{
    private int $expiresInMinutes = 5;
    private int $codeLength       = 6;

    /**
     * Générer un code OTP à 6 chiffres, le stocker en cache et l'envoyer par email.
     * Retourne false si un envoi récent est déjà en cours (cooldown 60s) pour éviter le spam.
     */
    public function sendOtp(User $user): bool
    {
        $cooldownKey = "otp_cooldown:{$user->id}";
        $codeKey     = $this->cacheKey($user->id);

        // Cooldown actif ET un code valide existe déjà → pas de renvoi
        if (Cache::has($cooldownKey) && Cache::has($codeKey)) {
            return false;
        }

        $code = $this->generateCode();

        Cache::put($codeKey, bcrypt($code), now()->addMinutes($this->expiresInMinutes));
        Cache::put($cooldownKey, true, now()->addSeconds(30));

        $recipient = $user->redirect_email ?? $user->email;
        Mail::to($recipient)->send(new OtpMail($code, $user->name, $this->expiresInMinutes));

        return true;
    }

    /**
     * Vérifier le code OTP saisi par l'utilisateur.
     */
    public function verify(User $user, string $code): bool
    {
        $hashed = Cache::get($this->cacheKey($user->id));

        if (!$hashed) {
            return false; // expiré ou jamais envoyé
        }

        if (!password_verify($code, $hashed)) {
            return false;
        }

        // Consommer le code (usage unique)
        Cache::forget($this->cacheKey($user->id));
        return true;
    }

    /**
     * Activer le 2FA pour un utilisateur (flag en base uniquement).
     * L'email est déjà vérifié — pas besoin de secret TOTP.
     */
    public function enable(User $user): void
    {
        $user->update([
            'is_2fa_enabled'          => true,
            'two_factor_secret'       => null,
            'two_factor_confirmed_at' => now(),
        ]);
    }

    /**
     * La désactivation de la 2FA est interdite par politique de sécurité.
     * Cette méthode lève une exception si appelée.
     */
    public function disable(User $user): void
    {
        throw new \RuntimeException('La désactivation de la 2FA est interdite.');
    }

    private function generateCode(): string
    {
        return str_pad((string) random_int(0, 999999), $this->codeLength, '0', STR_PAD_LEFT);
    }

    private function cacheKey(int $userId): string
    {
        return "otp_code:{$userId}";
    }
}
