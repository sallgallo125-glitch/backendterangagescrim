# Frontend Web GESCRIM

Lire d'abord le fichier de référence commun aux trois projets :
`/home/genius/Documents/memoire fin d'annee/CLAUDE.md`

Ce fichier contient l'architecture globale, les règles de sécurité critiques (2FA, device tracking, RBAC, portée territoriale) et les conventions à respecter obligatoirement.

---

## Spécifique frontend

- React 19.2.6 + Vite 8, Tailwind CSS v4
- Le flux 2FA est géré dans `Login.jsx` — tout changement doit préserver l'étape `two_factor_ticket`
- `X-Device-Id` header envoyé sur chaque requête API (stocké localStorage + cookie)
- Ne pas importer de bibliothèques CSS supplémentaires — utiliser Tailwind uniquement
