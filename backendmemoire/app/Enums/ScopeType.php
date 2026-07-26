<?php

namespace App\Enums;

/**
 * Enum définissant les niveaux de périmètre territorial.
 * Utilisé pour les champs read_scope_type et write_scope_type des utilisateurs.
 *
 * Hiérarchie : national > region > departement > commune > service
 */
enum ScopeType: string
{
    case NATIONAL = 'national';
    case REGION = 'region';
    case DEPARTEMENT = 'departement';
    case COMMUNE = 'commune';
    case SERVICE = 'service';

    /**
     * Retourne le niveau hiérarchique (plus le nombre est élevé, plus le scope est large).
     */
    public function level(): int
    {
        return match ($this) {
            self::SERVICE => 1,
            self::COMMUNE => 2,
            self::DEPARTEMENT => 3,
            self::REGION => 4,
            self::NATIONAL => 5,
        };
    }

    /**
     * Vérifie si ce scope est supérieur ou égal à un autre dans la hiérarchie.
     */
    public function isAtLeast(ScopeType $other): bool
    {
        return $this->level() >= $other->level();
    }

    /**
     * Libellé en français pour l'affichage.
     */
    public function label(): string
    {
        return match ($this) {
            self::NATIONAL => 'National',
            self::REGION => 'Région',
            self::DEPARTEMENT => 'Département',
            self::COMMUNE => 'Commune',
            self::SERVICE => 'Service',
        };
    }
}
