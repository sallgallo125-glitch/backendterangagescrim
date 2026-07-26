# Teranga GESCRIM — Backend API Laravel

> Système de Gestion de la Criminalité et de la Délinquance  
> Direction de la Sécurité Publique (DSP) — Sénégal

---

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| Backend | Laravel 13 (PHP 8.5) |
| Base de données | PostgreSQL |
| Authentification | JWT (`php-open-source-saver/jwt-auth`) |
| Permissions | Spatie Laravel Permission |
| Export PDF | DomPDF (`barryvdh/laravel-dompdf`) |

---

## Prérequis

- PHP >= 8.2
- Composer
- PostgreSQL >= 14
- Extension PHP : `pdo_pgsql`, `pgsql`

---

## Installation

### 1. Cloner le dépôt
```bash
git clone <repo-url> backendmemoire
cd backendmemoire
```

### 2. Installer les dépendances
```bash
composer install
```

### 3. Copier et configurer l'environnement
```bash
cp .env.example .env
php artisan key:generate
php artisan jwt:secret
```

Éditer `.env` et renseigner les paramètres de la base de données :
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=teranga_gescrim
DB_USERNAME=postgres
DB_PASSWORD=votre_mot_de_passe
```

### 4. Créer la base de données PostgreSQL
```bash
sudo -u postgres psql -c "CREATE USER teranga WITH PASSWORD 'password123';"
sudo -u postgres psql -c "CREATE DATABASE teranga_gescrim OWNER teranga;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE teranga_gescrim TO teranga;"
```

Ou si vous êtes connecté en tant que postgres :
```bash
psql -U postgres -c "CREATE DATABASE teranga_gescrim;"
```

### 5. Exécuter les migrations et seeders
```bash
php artisan migrate
php artisan db:seed
```

### 6. Démarrer le serveur de développement
```bash
php artisan serve
```

L'API sera disponible sur : `http://localhost:8000/api`

---

## Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Super Admin | admin@gescrim.sn | password123 |
| Admin | admin.dsp@gescrim.sn | password123 |
| Superviseur | superviseur@gescrim.sn | password123 |
| Agent | agent@gescrim.sn | password123 |

---

## Documentation API

### Authentification

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@gescrim.sn",
  "password": "password123"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Connexion réussie.",
  "data": {
    "access_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": { "id": 1, "name": "Admin Principal", "roles": ["super_admin"] }
  }
}
```

Toutes les requêtes suivantes nécessitent le header :
```http
Authorization: Bearer <access_token>
```

---

## Endpoints API (98 routes)

### 🔐 Authentification
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Connexion → JWT |
| POST | `/api/auth/logout` | Déconnexion |
| POST | `/api/auth/refresh` | Rafraîchir le token |
| GET | `/api/auth/me` | Profil connecté |
| POST | `/api/auth/change-password` | Changer mot de passe |

### 🗺️ Subdivisions Administratives
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/regions` | Liste des régions |
| GET | `/api/regions/all` | Toutes (sans pagination) |
| GET/POST/PUT/DELETE | `/api/regions/{id}` | CRUD région |
| GET | `/api/departements` | Liste des départements |
| GET | `/api/communes` | Liste des communes |
| GET | `/api/services` | Liste des services DSP |

### 👮 Personnel DSP
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/personnels` | Liste filtrée du personnel |
| POST | `/api/personnels` | Créer un agent |
| GET/PUT/DELETE | `/api/personnels/{id}` | CRUD agent |

**Filtres disponibles :** `?search=`, `?statut=Actif`, `?service_id=`, `?grade=`

### ⚠️ Infractions
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/infractions` | Liste filtrée |
| POST | `/api/infractions` | Saisir une infraction |
| GET/PUT/DELETE | `/api/infractions/{id}` | CRUD infraction |
| GET | `/api/categories-infractions` | Catégories |
| GET | `/api/types-infractions` | Types |

**Filtres :** `?annee=`, `?service_id=`, `?commune_id=`, `?issue=`, `?date_from=&date_to=`, `?sync_status=pending`

> ⚠️ **Règle métier** : La modification d'une infraction est bloquée après 1 minute pour les agents (autorisée pour admin/super_admin)

### 🚗 Accidents de la Circulation
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/accidents` | Liste avec filtres |
| POST | `/api/accidents` | Enregistrer un accident |
| GET/PUT/DELETE | `/api/accidents/{id}` | CRUD |

**Filtres :** `?type=matériel`, `?service_id=`, `?commune_id=`, `?date_from=&date_to=`

### 🏦 Données Financières
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET/POST/PUT/DELETE | `/api/services-remuneres` | Services rémunérés |
| GET/POST/PUT/DELETE | `/api/amendes-pieces-saisies` | Amendes et pièces saisies |

### 🌍 Immigration Clandestine
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET/POST/PUT/DELETE | `/api/immigrations-clandestines` | Gestion immigrations |

### 📊 Dashboard & Statistiques
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/dashboard/stats?annee=2025` | KPIs globaux |
| GET | `/api/dashboard/infractions-par-region` | Par région |
| GET | `/api/dashboard/accidents-par-type` | Par type |
| GET | `/api/dashboard/tendances-mensuelles` | Tendances mensuelles |
| GET | `/api/dashboard/infractions-par-type` | Par catégorie/type |
| GET | `/api/dashboard/personnel-par-service` | Effectifs par service |

### 📥 Export / Import
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/export/infractions/pdf` | PDF infractions |
| GET | `/api/export/infractions/csv` | CSV infractions |
| GET | `/api/export/accidents/pdf` | PDF accidents |
| GET | `/api/export/accidents/csv` | CSV accidents |
| POST | `/api/export/import/json` | Import JSON |

### 📡 Synchronisation Offline
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/sync/batch` | Sync par lot depuis mobile |
| GET | `/api/sync/status` | État de synchronisation |

**Format batch :**
```json
{
  "infractions": [...],
  "accidents": [...]
}
```

### 🔔 Notifications
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/notifications` | Mes notifications |
| GET | `/api/notifications/unread-count` | Nombre non lues |
| PUT | `/api/notifications/{id}/read` | Marquer comme lue |
| PUT | `/api/notifications/read-all` | Tout marquer lu |
| POST | `/api/notifications/send` | Envoyer (admin) |

### 👥 Utilisateurs & Rôles
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/users` | Liste des utilisateurs |
| POST | `/api/users` | Créer un utilisateur |
| GET/PUT/DELETE | `/api/users/{id}` | CRUD |
| GET | `/api/roles` | Liste des rôles |

### 📋 Audit Logs
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/audit-logs` | Journaux d'actions |
| GET | `/api/audit-logs/{id}` | Détail log |

---

## Format de réponse standardisé

### Succès
```json
{
  "success": true,
  "message": "Opération réussie",
  "data": { ... }
}
```

### Succès paginé
```json
{
  "success": true,
  "message": "Données récupérées",
  "data": [...],
  "meta": {
    "current_page": 1,
    "last_page": 10,
    "per_page": 15,
    "total": 150
  }
}
```

### Erreur
```json
{
  "success": false,
  "message": "Erreur de validation",
  "errors": {
    "email": ["L'email est obligatoire."]
  }
}
```

---

## Rôles et Permissions

| Permission | super_admin | admin | superviseur | agent |
|-----------|:-----------:|:-----:|:-----------:|:-----:|
| Gestion utilisateurs | ✅ | ✅ | 👁️ | ❌ |
| CRUD Infractions | ✅ | ✅ | 👁️ | ✅* |
| CRUD Accidents | ✅ | ✅ | 👁️ | ✅* |
| Paramétrage | ✅ | ✅ | 👁️ | ❌ |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Export PDF/CSV | ✅ | ✅ | ✅ | ❌ |
| Audit logs | ✅ | ✅ | ✅ | ❌ |

> *Les agents peuvent créer et modifier dans la première minute

---

## Structure du projet

```
backendmemoire/
├── app/
│   ├── Http/Controllers/Api/     # 15 contrôleurs
│   ├── Models/                   # 14 modèles Eloquent
│   └── Traits/Auditable.php      # Journalisation auto
├── database/
│   ├── migrations/               # 17 migrations
│   └── seeders/                  # 6 seeders (données réelles Sénégal)
├── resources/views/exports/      # Templates PDF
└── routes/api.php                # 98 routes API
```

---

## Commandes utiles

```bash
# Rafraîchir la base de données avec les données de test
php artisan migrate:fresh --seed

# Lister toutes les routes
php artisan route:list --path=api

# Vider les caches
php artisan cache:clear && php artisan config:clear

# Démarrer en mode développement
php artisan serve --port=8000
```
