<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationInterne extends Model
{
    use HasFactory;

    protected $table = 'notifications_internes';

    protected $fillable = [
        'user_id',
        'sender_id',
        'titre',
        'message',
        'type',
        'is_read',
        'canal',
        'diffusion_type',
        'target_id',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
        ];
    }

    // ========== Relations ==========

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    // ========== Scopes ==========

    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeByCanal($query, $canal)
    {
        return $query->where('canal', $canal);
    }
}
