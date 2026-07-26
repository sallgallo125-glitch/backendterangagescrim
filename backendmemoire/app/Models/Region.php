<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

/**
 * Modèle pour les régions administratives du Sénégal.
 */
class Region extends Model
{
    use HasFactory, Auditable;

    protected $fillable = ['nom', 'code'];

    // Une région contient plusieurs départements
    public function departements()
    {
        return $this->hasMany(Departement::class);
    }

    // Scope pour filtrer par nom
    public function scopeSearch($query, $search)
    {
        return $query->where('nom', 'ILIKE', "%{$search}%");
    }
}
