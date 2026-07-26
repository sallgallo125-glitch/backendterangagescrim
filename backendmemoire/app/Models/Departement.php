<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

/**
 * Modèle pour les départements.
 */
class Departement extends Model
{
    use HasFactory, Auditable;

    protected $fillable = ['nom', 'code', 'region_id'];

    // Un département appartient à une région
    public function region()
    {
        return $this->belongsTo(Region::class);
    }

    // Un département contient plusieurs communes
    public function communes()
    {
        return $this->hasMany(Commune::class);
    }

    public function scopeSearch($query, $search)
    {
        return $query->where('nom', 'ILIKE', "%{$search}%");
    }

    public function scopeByRegion($query, $regionId)
    {
        return $query->where('region_id', $regionId);
    }
}
