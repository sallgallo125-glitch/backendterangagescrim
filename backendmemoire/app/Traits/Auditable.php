<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

/**
 * Trait pour la journalisation automatique des actions sur les modèles.
 * Enregistre les créations, modifications et suppressions dans audit_logs.
 */
trait Auditable
{
    // Démarre l'écoute des événements Eloquent au boot du modèle
    public static function bootAuditable(): void
    {
        // Journaliser la création
        static::created(function ($model) {
            self::logAudit('create', $model, null, $model->getAttributes());
        });

        // Journaliser la mise à jour
        static::updated(function ($model) {
            $original = $model->getOriginal();
            $changes = $model->getChanges();
            // Ne pas loguer si rien n'a changé
            if (!empty($changes)) {
                self::logAudit('update', $model, $original, $changes);
            }
        });

        // Journaliser la suppression
        static::deleted(function ($model) {
            self::logAudit('delete', $model, $model->getAttributes(), null);
        });
    }

    /**
     * Crée un enregistrement dans la table audit_logs
     */
    protected static function logAudit(string $action, $model, ?array $oldValues, ?array $newValues): void
    {
        try {
            AuditLog::create([
                'user_id' => Auth::id(),
                'action' => $action,
                'model_type' => get_class($model),
                'model_id' => $model->getKey(),
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'ip_address' => Request::ip(),
                'user_agent' => Request::userAgent(),
            ]);
        } catch (\Exception $e) {
            // Ne pas bloquer l'opération si l'audit échoue
            \Log::error('Audit log error: ' . $e->getMessage());
        }
    }
}
