# Backend GESCRIM

Lire d'abord le fichier de référence commun aux trois projets :
`/home/genius/Documents/memoire fin d'annee/CLAUDE.md`

Ce fichier contient l'architecture globale, les règles de sécurité critiques (2FA, device tracking, RBAC, portée territoriale) et les conventions à respecter obligatoirement.

---

## Spécifique backend

- Laravel 13.7, PHP 8.3+, PostgreSQL
- JWT : `php-open-source-saver/jwt-auth`
- RBAC : `spatie/laravel-permission`
- Docs : OpenAPI/Swagger — maintenir la documentation à jour après tout ajout d'endpoint
- Ne jamais modifier les migrations existantes — créer une nouvelle migration à la place
