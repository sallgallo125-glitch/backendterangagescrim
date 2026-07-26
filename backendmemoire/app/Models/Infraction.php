<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;
use App\Traits\HasTerritorialScope;

/**
 * Modèle pour les infractions constatées ou déférées.
 * Supporte la géolocalisation et la synchronisation offline.
 */
class Infraction extends Model
{
    use HasFactory, Auditable, HasTerritorialScope;

    protected $fillable = [
        'workflow_status', 'local_id',
        'type_infraction_id', 'service_id', 'annee', 'date', 'heure', 'lieu',
        'commune_id', 'issue', 'type_drogue', 'unite', 'quantite',
        'latitude', 'longitude', 'description', 'user_id', 'sync_status',
        'montant_amende', 'plaque_vehicule',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'quantite' => 'decimal:2',
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
            'montant_amende' => 'decimal:2',
        ];
    }

    // ========== Relations ==========

    public function typeInfraction()
    {
        return $this->belongsTo(TypeInfraction::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function commune()
    {
        return $this->belongsTo(Commune::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Victimes liées à cette infraction
    public function victimes()
    {
        return $this->hasMany(Victime::class);
    }

    // Médias associés (photos, documents)
    public function media()
    {
        return $this->morphMany(Media::class, 'mediable');
    }

    // ========== Scopes ==========

    public function scopeSearch($query, $search)
    {
        return $query->where('lieu', 'ILIKE', "%{$search}%")
            ->orWhere('description', 'ILIKE', "%{$search}%");
    }

    public function scopeByAnnee($query, $annee)
    {
        return $query->where('annee', $annee);
    }

    public function scopeByService($query, $serviceId)
    {
        return $query->where('service_id', $serviceId);
    }

    public function scopeByCommune($query, $communeId)
    {
        return $query->where('commune_id', $communeId);
    }

    public function scopeByIssue($query, $issue)
    {
        return $query->where('issue', $issue);
    }

    public function scopeByDateRange($query, $from, $to)
    {
        return $query->whereBetween('date', [$from, $to]);
    }

    public function scopePending($query)
    {
        return $query->where('sync_status', 'pending');
    }

    public function scopeSynced($query)
    {
        return $query->where('sync_status', 'synced');
    }
}
