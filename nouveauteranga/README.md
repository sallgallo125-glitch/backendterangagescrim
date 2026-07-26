# TERANGA GESCRIM — Dashboard Web

Interface d'administration et de supervision pour le système GESCRIM.  
Développée en React 19 + Vite 8 + Tailwind CSS v4.

---

## Stack technique

| Technologie | Version | Rôle |
|-------------|---------|------|
| React | 19.2.6 | Framework UI |
| Vite | 8 | Bundler / Dev server |
| Tailwind CSS | v4 | Styles |
| React Router | v7 | Navigation |
| Axios | latest | Requêtes HTTP vers l'API |
| Recharts | latest | Graphiques statistiques |
| React Leaflet | latest | Cartographie interactive |
| Framer Motion | latest | Animations |
| Lucide React | latest | Icônes |

---

## Prérequis

- Node.js >= 18
- npm >= 9
- L'API backend doit être accessible (voir `backend/README.md`)

---

## Installation

### 1. Installer les dépendances

```bash
cd frontend
npm install
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
```

Éditer `.env` :

```env
VITE_API_URL=http://localhost:8000/api
```

En production (Railway) :

```env
VITE_API_URL=https://votre-backend.up.railway.app/api
```

### 3. Lancer en développement

```bash
npm run dev
```

L'application sera disponible sur : `http://localhost:5173`

### 4. Build de production

```bash
npm run build
npm run preview
```

---

## Déploiement (Vercel)

Le projet est configuré pour un déploiement automatique sur Vercel via `vercel.json`.

```bash
vercel --prod
```

Les headers de sécurité CSP sont définis dans `vercel.json` et couvrent :
- `connect-src` : l'API Railway + Cloudinary
- `img-src` : Railway + Cloudinary
- `font-src` : Google Fonts

---

## Rôles et accès

| Fonctionnalité | Admin | Gestionnaire | Agent |
|----------------|:-----:|:------------:|:-----:|
| Tableau de bord statistiques | ✅ | ✅ | ✅ |
| Consulter les saisies | ✅ | ✅ (région) | ✅ (service) |
| Valider / rejeter saisies | ✅ | ✅ | ❌ |
| Exporter rapports | ✅ | ✅ | ❌ |
| Gérer les utilisateurs | ✅ | ❌ | ❌ |
| Configurer les services | ✅ | ❌ | ❌ |
| Journal d'audit | ✅ | ✅ | ❌ |

---

## Authentification

Le flux d'authentification suit deux étapes :

1. `POST /api/auth/login` → si 2FA activé, retourne `requires_2fa: true` + `two_factor_ticket`
2. `POST /api/auth/2fa/verify` → vérifie le code TOTP avec le ticket

Le token JWT est stocké dans `localStorage`. Un header `X-Device-Id` (SHA-256 fingerprint) est envoyé sur chaque requête. Le refresh est transparent sur 401 via `refreshPromise` partagée (sans race condition).

---

## Structure du projet

```
frontend/
├── src/
│   ├── components/       # Composants réutilisables (Toast, Modal, Pagination…)
│   ├── pages/            # Pages par fonctionnalité
│   ├── hooks/            # usePermissions, useAuth…
│   ├── services/         # Appels API Axios
│   └── utils/            # Helpers
├── public/
├── index.html
├── vite.config.js
└── vercel.json
```
