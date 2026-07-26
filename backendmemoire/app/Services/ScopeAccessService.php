<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use App\Enums\ScopeType;
use App\Models\Commune;
use App\Models\Service;
use Illuminate\Database\Eloquent\Builder;

/**
 * Service centralisé gérant la logique des compétences territoriales.
 * Détermine ce qu'un utilisateur a le droit de lire et d'écrire en fonction de son affectation.
 */
class ScopeAccessService
{
    /**
     * Vérifie si l'utilisateur peut lire un modèle donné (consultation).
     */
    public function canRead(User $user, Model $model): bool
    {
        return $this->hasAccess($user, $model, 'read');
    }

    /**
     * Vérifie si l'utilisateur peut écrire dans un modèle donné (création, modif, suppression).
     */
    public function canWrite(User $user, Model $model): bool
    {
        return $this->hasAccess($user, $model, 'write');
    }

    /**
     * Logique principale de vérification territoriale.
     */
    protected function hasAccess(User $user, Model $model, string $action): bool
    {
        $scopeType = $action === 'write' ? $user->write_scope_type : $user->read_scope_type;
        $scopeId = $action === 'write' ? $user->write_scope_id : $user->read_scope_id;

        // Scope non configuré : refus par sécurité
        if ($scopeType === null) {
            return false;
        }

        // Si scope est national, il a accès à tout
        if ($scopeType === ScopeType::NATIONAL) {
            return true;
        }

        // Extraire la commune ou le service du modèle
        $communeId = $this->extractCommuneId($model);
        $serviceId = $this->extractServiceId($model);

        // Si le modèle n'est rattaché à aucun territoire spécifique, on refuse par sécurité (ou on accepte selon la règle)
        if (!$communeId && !$serviceId) {
            // Exceptions pour les entités globales non territoriales
            return false;
        }

        return $this->checkTerritorialAccess($scopeType, $scopeId, $communeId, $serviceId);
    }

    /**
     * Vérifie l'accès à une commune spécifique.
     */
    public function canAccessCommune(User $user, int $communeId, string $action = 'write'): bool
    {
        $scopeType = $action === 'write' ? $user->write_scope_type : $user->read_scope_type;
        $scopeId = $action === 'write' ? $user->write_scope_id : $user->read_scope_id;

        if ($scopeType === ScopeType::NATIONAL) {
            return true;
        }

        return $this->checkTerritorialAccess($scopeType, $scopeId, $communeId, null);
    }

    /**
     * Vérifie qu'un agent peut synchroniser un incident dans une commune donnée.
     * Règle : l'incident doit être dans la même région que le service de l'agent.
     * Un agent patrouille dans plusieurs communes de sa région — pas au-delà.
     */
    public function canSyncInCommune(User $user, int $communeId): bool
    {
        if ($user->write_scope_type === ScopeType::NATIONAL) {
            return true;
        }

        // Résoudre la région de l'agent via son service
        $agentService = $user->service_id ? Service::find($user->service_id) : null;
        if (!$agentService || !$agentService->commune_id) {
            return true; // service sans commune configurée → ne pas bloquer
        }
        $agentCommune = Commune::with('departement.region')->find($agentService->commune_id);
        if (!$agentCommune || !$agentCommune->departement) return true;
        $agentRegionId = $agentCommune->departement->region_id;

        // Vérifier que la commune de l'incident est dans la même région
        $incidentCommune = Commune::with('departement')->find($communeId);
        if (!$incidentCommune || !$incidentCommune->departement) return true;

        return $incidentCommune->departement->region_id === $agentRegionId;
    }

    /**
     * Vérifie l'accès à un service spécifique.
     */
    public function canAccessService(User $user, int $serviceId, string $action = 'write'): bool
    {
        $scopeType = $action === 'write' ? $user->write_scope_type : $user->read_scope_type;
        $scopeId = $action === 'write' ? $user->write_scope_id : $user->read_scope_id;

        if ($scopeType === ScopeType::NATIONAL) {
            return true;
        }

        return $this->checkTerritorialAccess($scopeType, $scopeId, null, $serviceId);
    }

    /**
     * Résout l'appartenance territoriale.
     */
    protected function checkTerritorialAccess(ScopeType $scopeType, ?int $scopeId, ?int $communeId, ?int $serviceId): bool
    {
        if ($scopeType === ScopeType::SERVICE) {
            // Accès direct via serviceId
            if ($serviceId) {
                return $scopeId === $serviceId;
            }
            // Accès via communeId : vérifier que le service de l'agent appartient à cette commune
            if ($communeId) {
                $service = Service::find($scopeId);
                return $service && $service->commune_id === $communeId;
            }
            return false;
        }

        // Résoudre la commune si on n'a que le service
        if (!$communeId && $serviceId) {
            $service = Service::find($serviceId);
            $communeId = $service ? $service->commune_id : null;
        }

        if (!$communeId) return false;

        if ($scopeType === ScopeType::COMMUNE) {
            return $scopeId === $communeId;
        }

        $commune = Commune::find($communeId);
        if (!$commune) return false;

        if ($scopeType === ScopeType::DEPARTEMENT) {
            return $scopeId === $commune->departement_id;
        }

        if ($scopeType === ScopeType::REGION) {
            $departement = $commune->departement;
            if (!$departement) return false;
            return $scopeId === $departement->region_id;
        }

        return false;
    }

    /**
     * Applique le filtre de lecture sur une requête (Query Scope).
     */
    public function applyReadScope(Builder $query, User $user): Builder
    {
        return $this->applyScope($query, $user->read_scope_type, $user->read_scope_id);
    }

    /**
     * Applique le filtre d'écriture sur une requête (Query Scope).
     */
    public function applyWriteScope(Builder $query, User $user): Builder
    {
        return $this->applyScope($query, $user->write_scope_type, $user->write_scope_id);
    }

    /**
     * Construction de la requête filtrée selon le scope territorial.
     */
    protected function applyScope(Builder $query, ?ScopeType $scopeType, ?int $scopeId): Builder
    {
        // Scope non configuré : seul un agent sans scope est bloqué — tout autre rôle voit tout
        if ($scopeType === null) {
            $user = auth()->user();
            if ($user && $user->hasRole('agent')) {
                return $query->whereRaw('1 = 0');
            }
            return $query;
        }

        if ($scopeType === ScopeType::NATIONAL) {
            return $query;
        }

        $model = $query->getModel();
        $table = $model->getTable();

        // Modèles avec service_id (priorité au service)
        if (\Schema::hasColumn($table, 'service_id')) {
            if ($scopeType === ScopeType::SERVICE) {
                $user = auth()->user();
                if ($user && $user->hasRole('agent') && \Schema::hasColumn($table, 'user_id')) {
                    return $query->where($table . '.user_id', $user->id);
                }
                return $query->where($table . '.service_id', $scopeId);
            }
            
            // Si le scope est plus large qu'un service, on filtre sur la commune associée au service ou directement sur le modèle
            if (\Schema::hasColumn($table, 'commune_id')) {
                return $this->filterByCommuneScope($query, $table . '.commune_id', $scopeType, $scopeId);
            } else {
                // Utiliser une jointure sur services
                return $query->whereHas('service', function ($q) use ($scopeType, $scopeId) {
                    $this->filterByCommuneScope($q, 'services.commune_id', $scopeType, $scopeId);
                });
            }
        } 
        
        // Modèles avec commune_id
        if (\Schema::hasColumn($table, 'commune_id')) {
            return $this->filterByCommuneScope($query, $table . '.commune_id', $scopeType, $scopeId);
        }

        // Cas des modèles imbriqués (ex: Victime liée à Infraction ou Accident)
        if (method_exists($model, 'infraction') && method_exists($model, 'accident')) {
            return $query->where(function ($q) use ($scopeType, $scopeId) {
                $q->whereHas('infraction', function ($sq) use ($scopeType, $scopeId) {
                    $this->applyScope($sq, $scopeType, $scopeId);
                })->orWhereHas('accident', function ($sq) use ($scopeType, $scopeId) {
                    $this->applyScope($sq, $scopeType, $scopeId);
                });
            });
        }

        // Par défaut, retourner une requête vide si impossible de déterminer le scope
        return $query->whereRaw('1 = 0');
    }

    /**
     * Applique les filtres de territoire sur une colonne commune_id.
     * Les enregistrements avec commune_id NULL (saisies terrain sans commune précise)
     * sont rattachés via leur service_id — on les inclut si le service est dans le territoire.
     */
    protected function filterByCommuneScope(Builder $query, string $communeColumn, ScopeType $scopeType, int $scopeId): Builder
    {
        $table = explode('.', $communeColumn)[0];
        $isServiceContext = ($table === 'services');

        if ($scopeType === ScopeType::COMMUNE) {
            if ($isServiceContext) {
                return $query->where($communeColumn, $scopeId);
            }
            return $query->where(function ($q) use ($communeColumn, $scopeId) {
                $q->where($communeColumn, $scopeId)
                  ->orWhere(function ($q2) use ($communeColumn, $scopeId) {
                      $q2->whereNull($communeColumn)
                         ->whereHas('service', fn($s) => $s->where('commune_id', $scopeId));
                  });
            });
        }

        if ($scopeType === ScopeType::DEPARTEMENT) {
            if ($isServiceContext) {
                return $query->whereHas('commune', fn($c) => $c->where('departement_id', $scopeId));
            }
            return $query->where(function ($q) use ($communeColumn, $scopeId) {
                $q->whereHas('commune', fn($c) => $c->where('departement_id', $scopeId))
                  ->orWhere(function ($q2) use ($communeColumn, $scopeId) {
                      $q2->whereNull($communeColumn)
                         ->whereHas('service.commune', fn($c) => $c->where('departement_id', $scopeId));
                  });
            });
        }

        if ($scopeType === ScopeType::REGION) {
            if ($isServiceContext) {
                return $query->whereHas('commune.departement', fn($d) => $d->where('region_id', $scopeId));
            }
            return $query->where(function ($q) use ($communeColumn, $scopeId) {
                $q->whereHas('commune.departement', fn($d) => $d->where('region_id', $scopeId))
                  ->orWhere(function ($q2) use ($communeColumn, $scopeId) {
                      $q2->whereNull($communeColumn)
                         ->whereHas('service.commune.departement', fn($d) => $d->where('region_id', $scopeId));
                  });
            });
        }

        return $query;
    }

    /**
     * Helpers pour extraire la commune/service d'un modèle arbitraire.
     */
    protected function extractCommuneId(Model $model): ?int
    {
        if (array_key_exists('commune_id', $model->getAttributes())) return $model->commune_id;

        if (array_key_exists('infraction_id', $model->getAttributes()) && $model->infraction) {
            return $model->infraction->commune_id;
        }
        if (array_key_exists('accident_id', $model->getAttributes()) && $model->accident) {
            return $model->accident->commune_id;
        }

        return null;
    }

    protected function extractServiceId(Model $model): ?int
    {
        if (array_key_exists('service_id', $model->getAttributes())) return $model->service_id;

        if (array_key_exists('infraction_id', $model->getAttributes()) && $model->infraction) {
            return $model->infraction->service_id;
        }
        if (array_key_exists('accident_id', $model->getAttributes()) && $model->accident) {
            return $model->accident->service_id;
        }

        return null;
    }
}
