<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

/**
 * Modèle pour les catégories d'infractions (Crime, Délit, Contravention).
 */
class CategorieInfraction extends Model
{
    use HasFactory, Auditable;

    protected $table = 'categorie_infractions';

    protected $fillable = ['nom', 'description'];

    // Une catégorie contient plusieurs types d'infractions
    public function typeInfractions()
    {
        return $this->hasMany(TypeInfraction::class);
    }
}
