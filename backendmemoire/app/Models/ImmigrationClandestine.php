<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;
use App\Traits\HasTerritorialScope;

/**
 * Modèle pour les données de l'immigration clandestine.
 * Inclut la géolocalisation des zones de départ et d'arrivée.
 */
class ImmigrationClandestine extends Model
{
    use HasFactory, Auditable, HasTerritorialScope;

    protected $table = 'immigrations_clandestines';

    protected $fillable = [
        'workflow_status', 'local_id',
        'nombre_interpellation', 'date', 'heure', 'service_id',
        'nombre_hommes', 'nombre_femmes', 'nombre_enfants',
        'nombre_maries', 'nombre_celibataires',
        'nombre_senegalais', 'nombre_etrangers',
        'zone_depart', 'zone_depart_lat', 'zone_depart_lng',
        'zone_arrivee_prevue', 'zone_arrivee_lat', 'zone_arrivee_lng',
        'user_id', 'sync_status',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'zone_depart_lat' => 'decimal:8',
            'zone_depart_lng' => 'decimal:8',
            'zone_arrivee_lat' => 'decimal:8',
            'zone_arrivee_lng' => 'decimal:8',
        ];
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function media()
    {
        return $this->morphMany(Media::class, 'mediable');
    }

    // ========== Scopes ==========

    public function scopeByService($query, $serviceId)
    {
        return $query->where('service_id', $serviceId);
    }

    public function scopeByDateRange($query, $from, $to)
    {
        return $query->whereBetween('date', [$from, $to]);
    }

    // Nombre total de personnes interpellées
    public function getNombreTotalAttribute(): int
    {
        return $this->nombre_hommes + $this->nombre_femmes + $this->nombre_enfants;
    }
}
