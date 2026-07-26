# Documentation Technique — TERANGA GESCRIM

**Système National de Gestion des Crimes et Statistiques Policières du Sénégal**

| | |
|---|---|
| Auteur | GALLO SALL |
| Établissement | CFPT Sénégal-Japon |
| Spécialité | Développement d'Applications Mobiles (DAM) |
| Année | 2024 / 2025 |
| Version | 1.0 — Production |

---

## 1. Vue d'ensemble du système

TERANGA GESCRIM est un système national tripartite de gestion des crimes et statistiques policières développé pour la Direction de la Sécurité Publique (DSP) du Sénégal. Il couvre la chaîne complète : saisie terrain hors-ligne → synchronisation batch → supervision et statistiques en temps réel.

### 1.1 Architecture globale

```
Flutter App (agents terrain)
        │  POST /api/sync (batch)
        ▼
Laravel REST API ◄──── React Web Dashboard (superviseurs/admins)
        │
  PostgreSQL DB
```

### 1.2 Composantes du système

| Composante | Technologie | Rôle |
|------------|-------------|------|
| Backend API | Laravel 13.7 + PHP 8.3+ | API REST, auth, RBAC, exports |
| Frontend Web | React 19 + Vite 8 | Dashboard statistiques et administration |
| Application Mobile | Flutter 3.11.5+ | Saisie terrain offline-first |
| Base de données | PostgreSQL 15+ | Stockage centralisé national |

---

## 2. Backend — Laravel 13.7

### 2.1 Dépendances principales

| Package | Rôle |
|---------|------|
| `php-open-source-saver/jwt-auth` | Authentification JWT (TTL 8h) |
| `spatie/laravel-permission` | RBAC — rôles et permissions |
| `spomky-labs/otphp` | 2FA TOTP (RFC 6238) |
| `barryvdh/laravel-dompdf` | Export PDF |
| `maatwebsite/excel` | Export Excel |
| `cloudinary-labs/cloudinary-laravel` | Stockage médias |

### 2.2 Structure du projet

```
backend/
  app/
    Http/
      Controllers/Api/   # AuthController, SyncController, DashboardController...
      Middleware/         # CheckTerritorialAccess, VerifyDeviceSession,
                         #   MobileAgentOnly, SecurityHeaders
    Models/               # User, Infraction, Accident, Victime...
    Services/             # TwoFactorService, DeviceSessionService,
                         #   ScopeAccessService, PDFExportService...
  database/
    migrations/           # Migrations versionnées + index de performance
  routes/api.php
  start.sh                # Entrypoint Railway : migrations + seed + serve
```

### 2.3 Authentification

Le flux d'authentification se déroule en deux étapes obligatoires. Un ticket temporaire (TTL 5 min) lie la première validation au code TOTP.

```
POST /api/auth/login
  → { requires_2fa: true, two_factor_ticket: "uuid" }   ← si 2FA activé

POST /api/auth/2fa/verify
  → { access_token: "eyJ...", expires_in: 28800 }
```

### 2.4 Endpoints données criminelles

| Ressource | Méthode | Endpoint |
|-----------|---------|----------|
| Infractions | GET/POST/PUT/DELETE | `/api/infractions` |
| Accidents | GET/POST/PUT/DELETE | `/api/accidents` |
| Immigrations | GET/POST/PUT/DELETE | `/api/immigrations-clandestines` |
| Amendes | GET/POST/PUT/DELETE | `/api/amendes-pieces-saisies` |
| Services rémunérés | GET/POST/PUT/DELETE | `/api/services-remuneres` |
| Dashboard | GET | `/api/dashboard/stats` |
| Export PDF | GET | `/api/export/{module}/pdf` |

### 2.5 Synchronisation offline — payload batch

```json
POST /api/sync
{
  "infractions":  [{ "local_id": "uuid", "type_infraction_id": 1, "date": "...", ... }],
  "accidents":    [{ "local_id": "uuid", "gravite": "corporel", "lat": 14.7, ... }],
  "amendes":      [{ "local_id": "uuid", "type": "Amende", "montant": 5000, ... }],
  "immigrations": [{ "local_id": "uuid", "nombre_interpellation": 3, ... }],
  "victimes":     [{ "local_id": "uuid", "parent_local_id": "uuid", ... }]
}
```

Réponse : `{ local_id → server_id }` pour mise à jour SQLite mobile.

---

## 3. Frontend Web — React 19

### 3.1 Dépendances principales

| Package | Rôle |
|---------|------|
| React 19.2.6 + Vite 8 | Framework + bundler |
| React Router v7 | Navigation SPA |
| Axios | HTTP client avec refresh transparent |
| Recharts | Graphiques statistiques |
| React Leaflet | Cartographie + clustering |
| Framer Motion | Animations |
| Tailwind CSS v4 | Styles |

### 3.2 Pages principales

| Page | Rôle | Accès |
|------|------|-------|
| Dashboard | KPIs + graphiques + carte | Tous |
| Infractions | Liste, filtres, CRUD | Tous |
| Accidents | Liste, filtres, CRUD | Tous |
| Immigrations | Liste, filtres, CRUD | Tous |
| Utilisateurs | Gestion RBAC | Admin, Gestionnaire |
| Exports | PDF/Excel/Word | Admin, Gestionnaire |
| Audit logs | Journal des actions | Admin, Gestionnaire |

### 3.3 Sécurité frontend

- **Token** : JWT stocké en localStorage (survit à la fermeture d'onglet)
- **Device** : `X-Device-Id` dans tous les headers Axios — identifiant persisté en cookie (1 an)
- **Refresh** : Refresh transparent via `/auth/refresh` avant toute redirection `/login`
- **Cache** : Cache GET isolé par userId, TTL 5 min, vidé au logout
- **Abort** : AbortController sur tous les fetch — évite setState sur composants démontés
- **Lazy** : Lazy loading (React.lazy + Suspense) — seul le code de la page active est chargé
- **Headers** : HSTS, CSP, X-Content-Type-Options, X-Frame-Options configurés dans `vercel.json`

---

## 4. Mobile — Flutter 3.11.5+

### 4.1 Dépendances principales

| Package | Rôle |
|---------|------|
| Dio | HTTP + intercepteurs JWT + refresh |
| Provider | State management |
| sqflite | SQLite local v11 |
| flutter_secure_storage | Stockage sécurisé tokens |
| geolocator | Géolocalisation GPS |
| image_picker | Photos terrain |
| connectivity_plus | Détection réseau |

### 4.2 Providers (state management)

| Provider | Rôle |
|----------|------|
| AuthProvider | Authentification, profil, 2FA |
| SyncProvider | Synchronisation offline → online |
| NotificationProvider | Notifications internes |
| ConnectivityProvider | Détection online/offline |

### 4.3 Base de données SQLite locale (v11)

Migrations versionnées avec try/catch (ALTER TABLE idempotent).  
Index : `idx_victimes_parent ON victimes(parent_local_id, parent_type)`.  
Récupération automatique si DB corrompue.

### 4.4 Écrans principaux

| Écran | Description |
|-------|-------------|
| Login + 2FA | Connexion JWT + vérification TOTP |
| Dashboard | 5 types de saisies rapides |
| Nouvelle infraction | Formulaire + GPS + photos |
| Nouvel accident | Formulaire + victimes + GPS |
| Immigration | Saisie clandestins |
| Historique | Toutes les saisies, 5 types, multi-sélection |
| Profil + Sync | Synchronisation manuelle + état |
| Notifications | Filtres URGENCE/ALERTE/INFO... |

### 4.5 Flux de synchronisation offline-first

```
1. ConnectivityProvider détecte le passage offline → online
2. SyncProvider collecte sync_status = 'pending' dans SQLite
3. Construction payload batch JSON (infractions + accidents + amendes + immigrations + victimes)
4. POST /api/sync avec retry (délai entre tentatives)
5. Réponse : { local_id → server_id } — mise à jour SQLite
6. sync_status = 'synced', server_id + synced_at enregistrés
7. Upload photos (multipart best-effort, AVANT marquage synced)
→ Erreur réseau = silencieuse, donnée locale toujours préservée
```

---

## 5. Base de données — PostgreSQL 15+

### 5.1 Tables principales

| Table | Description |
|-------|-------------|
| users | Comptes DSP (agents, gestionnaires, admins) |
| infractions | Infractions constatées |
| accidents | Accidents de circulation |
| victimes | Victimes liées aux infractions/accidents |
| immigrations_clandestines | Saisies immigration |
| amendes_pieces_saisies | Amendes et pièces |
| services_remuneres | Services rémunérés |
| services | Services DSP (commissariats, brigades...) |
| regions / departements / communes | Découpage territorial |
| device_sessions | Sessions appareils (device tracking) |
| audit_logs | Journal des actions sensibles |
| notifications | Alertes internes |

### 5.2 Index de performance

Migration `2026_06_24_000001_add_performance_indexes` :

- `infractions(issue)`, `infractions(workflow_status)`
- `accidents(workflow_status)`
- `personnels(service_id, statut)`
- `victimes(infraction_id)`, `victimes(accident_id)`

### 5.3 Portée territoriale

```
national
  └── région (14 régions du Sénégal)
        └── département
              └── commune
                    └── service (commissariat)
```

Enforced via `HasTerritorialScope` trait + `ScopeAccessService`. Chaque requête GET passe par `visibleByUser()` — jamais contournable.

---

## 6. Modèle de sécurité

### 6.1 Couches de sécurité

| Couche | Mécanisme |
|--------|-----------|
| Authentification | JWT (8h) + Refresh (14j) |
| Double facteur | TOTP RFC 6238 via `spomky-labs/otphp` |
| Device tracking | SHA-256(User-Agent + Accept-Language + Accept-Encoding) |
| Anti brute-force | 5 échecs / 10 min → blocage |
| RBAC | `spatie/laravel-permission` — 3 rôles actifs |
| Portée territoriale | `CheckTerritorialAccess` middleware |
| Headers sécurité | `SecurityHeaders` middleware (CSP, HSTS, X-Frame-Options) |
| Fichiers médias | Validation magic bytes `finfo()` côté serveur |

### 6.2 Middleware stack (groupe api)

```
auth:api → VerifyDeviceSession → CheckTerritorialAccess → SecurityHeaders
```

### 6.3 Règles RBAC critiques

- `admin` : 2FA non désactivable une fois activée
- Changement de rôle → révocation immédiate de toutes les sessions device
- `gestionnaire` : peut créer uniquement des `agent` (pas d'autres gestionnaires)
- SSL Pinning mobile : SHA-256 configurable via `--dart-define=SSL_PINS` (désactivé en dev)
- Validation MIME fichiers : magic bytes `finfo()` côté serveur (résistant au spoofing extension)

---

## 7. RBAC — Rôles et permissions

### 7.1 Hiérarchie des rôles

```
agent (1)  <  gestionnaire (2)  <  administrateur (3)
```

| Permission | Administrateur | Gestionnaire | Agent |
|------------|:--------------:|:------------:|:-----:|
| Saisir données terrain | ✅ | ✅ | ✅ |
| Consulter statistiques | ✅ | ✅ (région) | ✅ (service) |
| Exporter rapports | ✅ | ✅ | ❌ |
| Gérer utilisateurs | ✅ | ✅ (agents) | ❌ |
| Paramétrage (régions...) | ✅ | ❌ | ❌ |
| Logs d'audit | ✅ | ✅ | ❌ |
| Envoyer notifications | ✅ | ❌ | ❌ |

---

## 8. Performances mesurées en production

### 8.1 Tests de compatibilité

| Plateforme | Résultat |
|------------|----------|
| Android 10+ | ✅ |
| iOS 14+ | ✅ |
| Chrome / Firefox / Edge (web) | ✅ |

### 8.2 Tests backend

- Tests unitaires PHPUnit : TwoFactorService, DeviceSessionService, DateFilterService, ScopeAccessService
- Tests d'intégration Postman : 60+ requêtes avec validation automatique des schémas de réponse
- Tests frontend Vitest 3.2 : 25 tests unitaires (pageCache, stableStringify, usePermissions)

---

## 9. Déploiement

### 9.1 Plateformes de production

| Composante | Plateforme | URL |
|------------|------------|-----|
| Backend API | Railway | `https://backendmemoire-production.up.railway.app` |
| Frontend Web | Vercel | Déployé automatiquement sur push `main` |
| Base de données | PostgreSQL Railway | Volumes persistants |
| Mobile Android | APK Release | `flutter build apk --release` |

### 9.2 Variables d'environnement backend

```env
JWT_SECRET=<clé aléatoire 32+ chars>
JWT_TTL=480              # 8 heures
JWT_REFRESH_TTL=20160    # 14 jours

DB_HOST=<host PostgreSQL Railway>
DB_DATABASE=<nom_base>
DB_USERNAME=<user>
DB_PASSWORD=<mot_de_passe>

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=terangagescrim@gmail.com
MAIL_PASSWORD=<mot_de_passe_application>

APP_ENV=production
APP_URL=https://<backend-railway>.railway.app
```

### 9.3 Variables d'environnement frontend

```env
VITE_API_URL=https://<backend-railway>.railway.app
VITE_APP_NAME=TERANGA GESCRIM
```

### 9.4 Variables build mobile

```bash
flutter build apk --release \
  --dart-define=BASE_URL=https://<backend>.railway.app \
  --dart-define=SSL_PINS=sha256/<empreinte_base64>
```

---

## 10. Export et reporting

7 modules d'export disponibles (PDF / Excel / Word) :

| Module | Formats |
|--------|---------|
| Infractions | PDF, Excel, Word |
| Accidents | PDF, Excel |
| Immigrations clandestines | PDF, Excel |
| Amendes & pièces saisies | PDF, Excel |
| Services rémunérés | PDF |
| Personnel DSP | Excel |
| Statistiques globales | PDF |

Filtres disponibles : `region_id`, `departement_id`, `commune_id`, `service_id`, `date_from`, `date_to`, `annee`.

> Erreur `EMPTY_EXPORT` renvoyée avec `code: 'EMPTY_EXPORT'` si le tableau de résultats est vide — affichage d'un message explicite côté frontend.

---

*Documentation générée — TERANGA GESCRIM v1.0 — GALLO SALL — CFPT Sénégal-Japon 2025/2026*
