<?php

namespace App\Traits;

use App\Services\ScopeAccessService;
use Illuminate\Database\Eloquent\Builder;

/**
 * Trait à appliquer aux modèles nécessitant un filtrage territorial.
 */
trait HasTerritorialScope
{
    /**
     * Restreint les résultats aux données lisibles par l'utilisateur courant.
     */
    public function scopeVisibleByUser(Builder $query, $user = null): Builder
    {
        $user = $user ?? auth()->user();
        if (!$user) return $query; // En mode console sans authentification

        $scopeService = app(ScopeAccessService::class);
        return $scopeService->applyReadScope($query, $user);
    }

    /**
     * Restreint les résultats aux données modifiables par l'utilisateur courant.
     */
    public function scopeWritableByUser(Builder $query, $user = null): Builder
    {
        $user = $user ?? auth()->user();
        if (!$user) return $query;

        $scopeService = app(ScopeAccessService::class);
        return $scopeService->applyWriteScope($query, $user);
    }
}
