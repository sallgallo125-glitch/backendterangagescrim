<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Modèle polymorphique pour les médias (photos, documents).
 * Peut être associé à n'importe quelle entité (infraction, accident, personnel).
 */
class Media extends Model
{
    protected $table = 'media';

    protected $fillable = [
        'mediable_type', 'mediable_id', 'filename', 'path', 'mime_type', 'size', 'driver', 'url',
    ];

    // Relation polymorphique
    public function mediable()
    {
        return $this->morphTo();
    }
}
