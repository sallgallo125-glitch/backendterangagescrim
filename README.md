# Conception et réalisation d'un logiciel de gestion des effectifs et des statistiques de la criminalité et de la délinquance au Sénégal pour la Direction de la Sécurité Publique

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Laravel](https://img.shields.io/badge/Laravel-13.7-red)
![Flutter](https://img.shields.io/badge/Flutter-3.11.5-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Statut](https://img.shields.io/badge/statut-actif-brightgreen)
![Licence](https://img.shields.io/badge/licence-Propriétaire-orange)

> Plateforme nationale de sécurité publique permettant aux agents de la Direction de la Sécurité Publique (DSP) du Sénégal de saisir, synchroniser et analyser les données criminelles et routières en temps réel — sur mobile terrain ou via un tableau de bord web.

---

## Table des matières

- [Aperçu](#aperçu)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Structure du projet](#structure-du-projet)
- [API Reference](#api-reference)
- [Tests](#tests)
- [Déploiement](#déploiement)
- [Licence](#licence)

---

## Aperçu

TERANGA GESCRIM est un système d'information national conçu pour la Direction de la Sécurité Publique du Sénégal. Il résout un besoin concret : permettre aux agents de police et de gendarmerie de saisir les incidents (infractions, accidents, immigration clandestine, amendes) directement sur le terrain via une application mobile, même sans connexion internet, puis de synchroniser automatiquement les données vers une base centrale consultable par les responsables via un tableau de bord web analytique.

<div align="center">
  <img src="docs/screenshots/connexion.png" alt="Écran de connexion TERANGA GESCRIM" width="340"/>
</div>

<br/>

<div align="center">

| Vérification 2FA | Nouvelle infraction | Historique des saisies |
|:-:|:-:|:-:|
| <img src="docs/screenshots/2fa.png" width="210"/> | <img src="docs/screenshots/infraction.png" width="210"/> | <img src="docs/screenshots/historique.png" width="210"/> |

| Amende & Saisie | Immigration clandestine | Profil & Synchronisation |
|:-:|:-:|:-:|
| <img src="docs/screenshots/amende.png" width="210"/> | <img src="docs/screenshots/immigration.png" width="210"/> | <img src="docs/screenshots/profil.png" width="210"/> |

| Notifications | Service rémunéré | |
|:-:|:-:|:-:|
| <img src="docs/screenshots/notifications.png" width="210"/> | <img src="docs/screenshots/service-remunere.png" width="210"/> | |

</div>

---

## Fonctionnalités

- **Authentification sécurisée** — JWT (8h) + 2FA TOTP par email + Device Tracking (SHA-256)
- **RBAC à 3 niveaux** — Admin (accès total), Gestionnaire (portée régionale), Agent (portée service)
- **Portée territoriale** — national → région → département → commune → service DSP
- **5 types de saisies mobiles** — Infractions, Accidents & victimes, Immigration clandestine, Amendes & pièces saisies, Services rémunérés
- **Mode offline complet** — saisie locale SQLite, synchronisation batch automatique au retour en ligne
- **Upload de photos** — prise de vue ou galerie, stockage Cloudinary, URL permanentes
- **Tableau de bord analytique** — KPIs, graphiques mensuels, carte Leaflet avec clustering et heatmap
- **Export multi-format** — PDF, Excel, Word avec filtres géographiques (7 modules)
- **Notifications internes** — alertes URGENCE, ALERTE, AVERTISSEMENT, SUCCÈS, INFO
- **Audit log** — chaque action sensible tracée (IP, payload, utilisateur, horodatage)
- **Gestion du personnel DSP** — fiches agents, matricule CCAP, statut actif/inactif

---

## Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Application mobile | Flutter + Dart | 3.11.5+ |
| Frontend web | React + Vite | 19.2.6 + Vite 8 |
| Backend API | Laravel + PHP | 13.7 + PHP 8.3+ |
| Base de données | PostgreSQL | 16 |
| Auth | JWT (`php-open-source-saver/jwt-auth`) | TTL 8h |
| 2FA | TOTP (`spomky-labs/otphp`) | RFC 6238 |
| RBAC | `spatie/laravel-permission` | — |
| Cartes | React Leaflet + leaflet.heat | 1.9.4 |
| Graphiques | Recharts | — |
| Stockage médias | Cloudinary | SDK PHP v3 |
| CI/CD backend | Railway | — |
| CI/CD frontend | Vercel | — |
| HTTP mobile | Dio + SSL Pinning | — |
| État mobile | Provider | — |
| Stockage local | SQLite (`sqflite`) | v11 |

---

## Prérequis

Avant de commencer, assurez-vous d'avoir installé :

**Backend**
- [PHP](https://php.net) 8.3 ou supérieur
- [Composer](https://getcomposer.org) v2
- [PostgreSQL](https://postgresql.org) 14 ou supérieur
- [Git](https://git-scm.com)

**Frontend web**
- [Node.js](https://nodejs.org) v18 ou supérieur
- [npm](https://npmjs.com) v9 ou supérieur

**Application mobile**
- [Flutter SDK](https://docs.flutter.dev/get-started/install) 3.11.5 ou supérieur
- Android Studio ou Xcode (pour les émulateurs)

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/BTS-DAM2/Projet-GalloSALL.git
cd Projet-GalloSALL
```

### 2. Backend Laravel

```bash
cd backend

# Installer les dépendances PHP
composer install

# Copier le fichier d'environnement
cp .env.example .env

# Générer la clé d'application et le secret JWT
php artisan key:generate
php artisan jwt:secret

# Exécuter les migrations et les seeds
php artisan migrate --seed

# Lier le stockage public
php artisan storage:link
```

### 3. Frontend React

```bash
cd frontend

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env
```

### 4. Application mobile Flutter

```bash
cd mobile

# Récupérer les dépendances Dart
flutter pub get
```

---

## Configuration

### Backend — `backend/.env`

| Variable | Description | Exemple |
|---|---|---|
| `DB_HOST` | Hôte PostgreSQL | `localhost` |
| `DB_DATABASE` | Nom de la base | `gescrim` |
| `DB_USERNAME` | Utilisateur PostgreSQL | `postgres` |
| `DB_PASSWORD` | Mot de passe PostgreSQL | `secret` |
| `JWT_SECRET` | Clé secrète JWT (auto-générée) | `php artisan jwt:secret` |
| `JWT_TTL` | Durée de vie du token (minutes) | `480` |
| `MAIL_USERNAME` | Adresse SMTP pour envoi OTP | `terangagescrim@gmail.com` |
| `MAIL_PASSWORD` | Mot de passe application Gmail | `xxxx xxxx xxxx xxxx` |
| `CLOUDINARY_URL` | URL complète Cloudinary | `cloudinary://key:secret@cloud` |
| `FILESYSTEM_DISK` | Disque de stockage médias | `cloudinary` |

### Frontend — `frontend/.env`

| Variable | Description | Exemple |
|---|---|---|
| `VITE_API_URL` | URL de l'API backend | `https://backendmemoire-production.up.railway.app` |

> **Ne jamais committer les fichiers `.env` dans Git !**
> Vérifiez que `.env` est bien présent dans `.gitignore`.

---

## Utilisation

### Lancer le backend

```bash
cd backend

php artisan serve
# → http://localhost:8000
```

### Lancer le frontend web

```bash
cd frontend

# Mode développement (rechargement automatique)
npm run dev
# → http://localhost:5173

# Build production
npm run build
```

### Lancer l'application mobile

```bash
cd mobile

# Sur émulateur ou appareil connecté
flutter run

# Build APK release
flutter build apk --release
# → build/app/outputs/flutter-apk/app-release.apk
```

---

## Structure du projet

```
Projet-GalloSALL/
├── backend/                        # API REST Laravel
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/        # Contrôleurs API (Infractions, Auth, Export...)
│   │   │   └── Middleware/         # Auth JWT, RBAC, Device Tracking, CSP
│   │   ├── Models/                 # Modèles Eloquent (Infraction, Accident...)
│   │   └── Services/               # TwoFactorService, DeviceSessionService, ScopeAccessService
│   ├── database/
│   │   ├── migrations/             # Migrations PostgreSQL
│   │   └── seeders/                # Données initiales (régions, rôles, admin)
│   ├── routes/
│   │   └── api.php                 # Toutes les routes API
│   ├── storage/api-docs/           # Spécification OpenAPI 3.0
│   ├── start.sh                    # Script de démarrage Railway
│   └── .env.example
│
├── frontend/                       # Tableau de bord React
│   ├── src/
│   │   ├── components/             # Composants réutilisables (Modal, Toast, Pagination...)
│   │   ├── pages/                  # Pages (Dashboard, Infractions, Accidents, Carte...)
│   │   ├── hooks/                  # usePermissions, useAuth, useMediaUpload
│   │   └── services/               # Appels API Axios avec refresh token transparent
│   ├── vercel.json                 # Config déploiement + headers sécurité CSP
│   └── .env.example
│
├── mobile/                         # Application Flutter terrain
│   ├── lib/
│   │   ├── core/
│   │   │   ├── network/            # ApiClient Dio + SSL Pinning + refresh deadlock-safe
│   │   │   └── utils/              # PhotoStorage, SecureStore, AppConstants
│   │   ├── providers/              # AuthProvider, SyncProvider, NotificationProvider
│   │   ├── screens/                # Saisies (5 types), Historique, Profil, Notifications
│   │   └── models/                 # Modèles locaux + mapping SQLite
│   └── pubspec.yaml
│
└── docs/
    └── screenshots/                # Captures d'écran de l'application mobile
```

---

## API Reference

L'API complète est documentée selon la spécification **OpenAPI 3.0** disponible dans `backend/storage/api-docs/api-docs.json`.

**URL de base :** `https://backendmemoire-production.up.railway.app`

Toutes les routes (sauf `/api/auth/login`) requièrent le header :
```
Authorization: Bearer <token>
```

### POST /api/auth/login

Connexion utilisateur — retourne un token JWT ou déclenche le flux 2FA.

**Body (JSON) :**
```json
{
  "email": "agent.dakar@dsp.sn",
  "password": "motdepasse",
  "device_id": "sha256_empreinte_appareil_64_caracteres"
}
```

**Réponse succès — sans 2FA (200) :**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 28800
  }
}
```

**Réponse — 2FA activé (200) :**
```json
{
  "requires_2fa": true,
  "two_factor_ticket": "uuid-du-ticket-ttl-5min"
}
```

### POST /api/infractions

Enregistrer une infraction (supporte le mode offline via `sync_status: "pending"`).

**Body (JSON) :**
```json
{
  "type_infraction_id": 2,
  "service_id": 1,
  "annee": 2026,
  "date": "2026-07-15",
  "lieu": "Marché Sandaga, Dakar",
  "commune_id": 1,
  "issue": "Constatée",
  "latitude": 14.6928,
  "longitude": -17.4467,
  "sync_status": "synced"
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "message": "Infraction enregistrée avec succès",
  "data": { "id": 42 }
}
```

### POST /api/sync/batch

Synchronisation batch des saisies offline depuis le mobile Flutter.

```json
{
  "infractions": [ { "..." : "..." } ],
  "accidents": [],
  "immigrations": [],
  "amendes": [],
  "services_remuneres": []
}
```

> La documentation complète (subdivisions, personnel, accidents, immigration, dashboard, exports, notifications, audit logs) est disponible dans `backend/storage/api-docs/api-docs.json`.

---

## Tests

Les tests ont été réalisés avec **Postman** à partir de la collection officielle incluse dans le dépôt.

```bash
# 1. Ouvrir Postman → Import
#    Sélectionner : backend/Teranga_GESCRIM_API_Collection.json

# 2. Configurer la variable d'environnement
#    base_url = https://backendmemoire-production.up.railway.app

# 3. Exécuter Login pour obtenir le token automatiquement
#    Dossier 01. Authentification → Login (Connexion) → Send

# 4. Parcourir les modules dans l'ordre ou utiliser Collection Runner
```

**Résultats — 51 cas de tests, 11 modules, 100 % de réussite :**

| Module | Tests | Résultat |
|---|:-:|:-:|
| Authentification | 6 | ✅ |
| Subdivisions administratives | 10 | ✅ |
| Personnel | 5 | ✅ |
| Infractions | 8 | ✅ |
| Accidents & Victimes | 6 | ✅ |
| Immigration clandestine | 5 | ✅ |
| Amendes & Services rémunérés | 6 | ✅ |
| Utilisateurs & Rôles | 6 | ✅ |
| Notifications | 5 | ✅ |
| Dashboard & Exports | 6 | ✅ |
| Audit & Synchronisation | 4 | ✅ |

---

## Déploiement

### Backend — Railway

```bash
# Les variables d'environnement sont définies dans le dashboard Railway.
# start.sh s'exécute automatiquement au démarrage du conteneur :
#   php artisan migrate --force
#   php artisan db:seed --force
#   php artisan storage:link
#   php artisan config:cache
#   php artisan serve --host=0.0.0.0 --port=$PORT
```

URL de production : `https://backendmemoire-production.up.railway.app`

### Frontend — Vercel

```bash
# Connecter le dépôt GitHub à Vercel.
# Définir VITE_API_URL dans les variables d'environnement Vercel.
# Vercel détecte Vite automatiquement et exécute : npm run build
# Les headers CSP sont configurés dans frontend/vercel.json.
```

### Application mobile — APK Android

```bash
cd mobile

# Build APK release signé (keystore configuré dans android/key.properties)
flutter build apk --release

# Fichier généré :
# build/app/outputs/flutter-apk/app-release.apk
```

---

## Licence

Ce projet est propriétaire. Tous droits réservés — Direction de la Sécurité Publique, République du Sénégal.

Développé dans le cadre d'un mémoire de fin d'études **BTS Développement d'Applications Mobiles (DAM) 2026** par **Gallo SALL**.

---

*© 2026 Teranga GESCRIM — Direction de la Sécurité Publique, République du Sénégal*
