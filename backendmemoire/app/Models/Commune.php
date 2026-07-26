<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

/**
 * Modèle pour les communes.
 */
class Commune extends Model
{
    use HasFactory, Auditable;

    protected $fillable = ['nom', 'code', 'departement_id'];

    // Une commune appartient à un département
    public function departement()
    {
        return $this->belongsTo(Departement::class);
    }

    // Une commune possède plusieurs services
    public function services()
    {
        return $this->hasMany(Service::class);
    }

    // Accéder à la région via le département
    public function region()
    {
        return $this->hasOneThrough(Region::class, Departement::class, 'id', 'id', 'departement_id', 'region_id');
    }

    public function scopeSearch($query, $search)
    {
        return $query->where('nom', 'ILIKE', "%{$search}%");
    }

    public function scopeByDepartement($query, $departementId)
    {
        return $query->where('departement_id', $departementId);
    }
}
