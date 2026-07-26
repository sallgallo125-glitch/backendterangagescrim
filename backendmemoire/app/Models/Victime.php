<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasTerritorialScope;
use App\Models\Media;

/**
 * Modèle pour les victimes et impliqués dans les infractions et accidents.
 */
class Victime extends Model
{
    use HasFactory, HasTerritorialScope;

    protected $fillable = [
        'nom', 'prenom', 'no_cin_passeport', 'sexe',
        'age', 'nationalite', 'infraction_id', 'accident_id',
        'adresse', 'telephone',
        'contact_urgence_nom', 'contact_urgence_telephone',
        'gravite_blessures', 'etat_medical',
        'statut_deces', 'observations',
    ];

    protected $casts = [
        'statut_deces' => 'boolean',
    ];

    // La victime peut être liée à une infraction
    public function infraction()
    {
        return $this->belongsTo(Infraction::class);
    }

    // La victime peut être liée à un accident
    public function accident()
    {
        return $this->belongsTo(Accident::class);
    }

    public function media()
    {
        return $this->morphMany(Media::class, 'mediable');
    }

    // Nom complet
    public function getNomCompletAttribute(): string
    {
        return trim("{$this->prenom} {$this->nom}");
    }
}
