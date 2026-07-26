<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;

/**
 * Modèle pour les types d'infractions (arme blanche, arme à feu, vol, etc.).
 */
class TypeInfraction extends Model
{
    use HasFactory, Auditable;

    protected $table = 'type_infractions';

    protected $fillable = ['nom', 'categorie_infraction_id', 'description'];

    // Un type appartient à une catégorie
    public function categorieInfraction()
    {
        return $this->belongsTo(CategorieInfraction::class);
    }

    // Un type est associé à plusieurs infractions
    public function infractions()
    {
        return $this->hasMany(Infraction::class);
    }
}
