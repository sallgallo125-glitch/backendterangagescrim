<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;
use App\Traits\HasTerritorialScope;

/**
 * Modèle pour les accidents de la circulation.
 */
class Accident extends Model
{
    use HasFactory, Auditable, HasTerritorialScope;

    protected $fillable = [
        'workflow_status', 'local_id',
        'type', 'date', 'heure', 'lieu', 'commune_id', 'service_id',
        'moyen', 'cause_probable', 'latitude', 'longitude',
        'description', 'user_id', 'sync_status',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
        ];
    }

    // ========== Relations ==========

    public function commune()
    {
        return $this->belongsTo(Commune::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Victimes de l'accident
    public function victimes()
    {
        return $this->hasMany(Victime::class);
    }

    // Médias associés
    public function media()
    {
        return $this->morphMany(Media::class, 'mediable');
    }

    // ========== Scopes ==========

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeByService($query, $serviceId)
    {
        return $query->where('service_id', $serviceId);
    }

    public function scopeByCommune($query, $communeId)
    {
        return $query->where('commune_id', $communeId);
    }

    public function scopeByDateRange($query, $from, $to)
    {
        return $query->whereBetween('date', [$from, $to]);
    }

    public function scopePending($query)
    {
        return $query->where('sync_status', 'pending');
    }
}
