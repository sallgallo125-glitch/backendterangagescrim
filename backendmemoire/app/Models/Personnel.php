<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;
use App\Traits\HasTerritorialScope;

/**
 * Modèle pour le personnel de la DSP.
 * Contient les informations individuelles des agents.
 */
class Personnel extends Model
{
    use HasFactory, Auditable, HasTerritorialScope;

    protected $fillable = [
        'ccap', 'prenom', 'nom', 'grade', 'telephone',
        'anciennete', 'date_entree_corps', 'sexe',
        'situation_matrimoniale', 'date_naissance', 'lieu_naissance',
        'service_id', 'statut', 'sanction', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'date_entree_corps' => 'date',
            'date_naissance' => 'date',
        ];
    }

    // Le personnel appartient à un service
    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    // Le personnel peut être lié à un utilisateur du système
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Médias associés (polymorphique)
    public function media()
    {
        return $this->morphMany(Media::class, 'mediable');
    }

    // ========== Scopes ==========

    public function scopeSearch($query, $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('nom', 'ILIKE', "%{$search}%")
              ->orWhere('prenom', 'ILIKE', "%{$search}%")
              ->orWhere('ccap', 'ILIKE', "%{$search}%");
        });
    }

    public function scopeByStatut($query, $statut)
    {
        return $query->where('statut', $statut);
    }

    public function scopeByService($query, $serviceId)
    {
        return $query->where('service_id', $serviceId);
    }

    public function scopeByGrade($query, $grade)
    {
        return $query->where('grade', $grade);
    }

    // Nom complet
    public function getNomCompletAttribute(): string
    {
        return "{$this->prenom} {$this->nom}";
    }
}
