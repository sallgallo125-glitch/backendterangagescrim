# 📂 Guide de Test et de Validation de l'API : Swagger UI & Postman

Ce guide fournit une méthodologie complète et pas-à-pas pour tester et valider l'intégralité des routes de l'API **Teranga GESCRIM** (gestion de la criminalité, de la sécurité routière et du personnel de la Direction de la Sécurité Publique du Sénégal) en utilisant deux outils majeurs :
1. 🌐 **Swagger UI** (Interface Web interactive intégrée au backend, idéale pour la démonstration devant le jury).
2. 📥 **Postman** (Collection automatisée et scripts de tests pour le développement).

---

## 🚀 Étape 1 : Préparation et Démarrage du Serveur

Avant de commencer vos tests, assurez-vous que votre serveur backend Laravel et votre base de données PostgreSQL fonctionnent correctement.

1. Ouvrez votre terminal et accédez au dossier du backend :
   ```bash
   cd "/home/genius/Documents/memoire fin d'annee/backendmemoire"
   ```

2. Assurez-vous que votre base de données PostgreSQL est démarrée.
3. Réinitialisez et peuplez la base de données avec les données de test (seeders) pour repartir sur un environnement propre et complet :
   ```bash
   php artisan migrate:fresh --seed
   ```
   *Cela créera automatiquement les subdivisions administratives du Sénégal, les services de police, les infractions types, ainsi que les comptes utilisateurs de test.*

4. **Forcez la génération de la documentation Swagger** si vous avez modifié des annotations dans vos contrôleurs :
   ```bash
   php artisan l5-swagger:generate
   ```

5. Lancez le serveur de développement Laravel :
   ```bash
   php artisan serve
   ```
   Le serveur sera accessible à l'adresse : **`http://127.0.0.1:8000`** (ou `http://localhost:8000`).

---

## 🌐 Étape 2 : Tester l'API avec Swagger UI (Le plus simple et visuel !)

L'API intègre **Swagger UI** dans un magnifique thème sombre (Dark Mode) persistant. C'est l'outil idéal pour votre soutenance de mémoire : il permet de tester en direct toutes vos routes directement depuis votre navigateur web, sans aucune installation tierce !

### 1. Accéder à l'interface
* Ouvrez votre navigateur internet (Chrome, Firefox, etc.).
* Allez à l'adresse suivante : **`http://localhost:8000/api/documentation`**
* Vous verrez s'afficher la documentation complète et interactive de toutes vos routes (Régions, Personnel, Infractions, Accidents, etc.).

### 2. Le flux d'Authentification JWT sur Swagger UI
Comme la majorité des routes de l'API sont sécurisées, elles nécessitent un token JWT. Voici comment vous authentifier sur Swagger en 2 clics :

1. Faites défiler la page jusqu'au groupe **Authentification** et cliquez sur la route **`POST /api/auth/login`** pour l'ouvrir.
2. Cliquez sur le bouton **`Try it out`** (Essayer) tout à droite.
3. Le corps JSON contient déjà des exemples d'identifiants. Assurez-vous d'avoir :
   ```json
   {
     "email": "admin@gescrim.sn",
     "password": "password123"
   }
   ```
4. Cliquez sur le gros bouton bleu **`Execute`**.
5. Regardez la section **`Response body`** en dessous. Vous verrez le JSON de réponse. **Copiez le long token** situé dans le champ `"access_token"` (copiez uniquement la chaîne de caractères, sans les guillemets).
6. Remontez tout en haut de la page Swagger. Cliquez sur le bouton vert **`Authorize`** (cadenas ouvert) situé dans le coin supérieur droit.
7. Dans le champ textuel sous **`bearerAuth (http, Bearer)`**, **collez simplement votre token** (ne tapez *pas* "Bearer " devant, collez uniquement le token propre).
8. Cliquez sur le bouton **`Authorize`**, puis sur **`Close`**. 

*Le cadenas vert est désormais fermé ! Vous êtes connecté pour toute la session de test.*

> [!TIP]
> **Persistance de session** : Swagger est configuré pour sauvegarder votre token en mémoire. Même si vous rafraîchissez votre navigateur, vous resterez connecté et pourrez continuer vos tests sans repasser par l'étape Login !

### 3. Tester une route (Exemple : Lister le Personnel)
1. Ouvrez le groupe **Personnel** et cliquez sur **`GET /api/personnels`**.
2. Cliquez sur **`Try it out`**.
3. Saisissez éventuellement un filtre (par exemple tapez `Actif` dans le champ `statut` ou `Lieutenant` dans le champ `grade`) ou laissez tous les paramètres vides.
4. Cliquez sur **`Execute`**.
5. Swagger enverra la requête avec votre token d'authentification automatiquement injecté dans les en-têtes et vous affichera la liste du personnel de la DSP en base de données !

---

## 📥 Étape 3 : Tester l'API avec Postman (Pour l'automatisation)

Si vous préférez tester via Postman pour des scénarios de requêtes enchaînées :

1. Ouvrez l'application **Postman**.
2. Dans le coin supérieur gauche, cliquez sur le bouton **Import**.
3. Choisissez **Files** ou glissez-deposez le fichier suivant situé dans votre dossier de projet :
   `backendmemoire/Teranga_GESCRIM_API_Collection.json`
4. Postman va détecter une collection nommée **Teranga GESCRIM API**. Cliquez sur **Import** pour valider.

---

## 🔑 Étape 4 : Fonctionnement Automatique du Token JWT dans Postman

L'API est sécurisée par des tokens JWT. Pour vous éviter d'avoir à copier-coller manuellement le token d'authentification après chaque connexion dans Postman, la collection a été configurée avec de l'**automatisation intelligente** :

1. **Variables de Collection** :
   La collection possède deux variables pré-configurées :
   * `base_url` : Définie par défaut sur `http://localhost:8000`.
   * `token` : Reçoit le token JWT actif.

2. **Authentification Globale** :
   Tous les dossiers et toutes les requêtes de la collection héritent de l'authentification de type **Bearer Token** configurée au niveau supérieur de la collection. Ils utilisent la variable `{{token}}`.

3. **Script de Login Automatique** :
   La requête **`01. Authentification > Login (Connexion)`** contient un script exécuté après la réponse (*Post-response Tests*).
   Ce script extrait automatiquement le token JWT de la réponse réussie et met à jour la variable `token` de la collection :
   ```javascript
   var response = pm.response.json();
   if (response.success && response.data && response.data.access_token) {
       pm.collectionVariables.set("token", response.data.access_token);
       console.log("=== TOKEN JWT ENREGISTRÉ DANS LA COLLECTION ===");
   }
   ```

> [!TIP]
> **Comment démarrer vos tests ?**
> Il vous suffit d'exécuter la requête **Login** une seule fois au début de votre session de test ! Toutes les autres requêtes (Régions, Personnel, Infractions, Accidents, etc.) seront automatiquement authentifiées sans aucune action de votre part.

---

## 👤 Étape 4 : Comptes de Test et Rôles Disponibles

Grâce au `UserSeeder.php`, plusieurs comptes utilisateurs sont configurés avec des rôles et des niveaux d'accès différents. Vous pouvez modifier le corps (payload) de la requête **Login** pour tester les restrictions de sécurité (Spatie Permissions) :

| Rôle | Adresse Email | Mot de passe | Description |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@gescrim.sn` | `password123` | Accès total sur tout le système. |
| **Admin DSP** | `admin.dsp@gescrim.sn` | `password123` | Administration des utilisateurs, rapports globaux. |
| **Superviseur**| `superviseur@gescrim.sn`| `password123` | Gestion et validation des données d'un service spécifique. |
| **Agent** | `agent@gescrim.sn` | `password123` | Saisie terrain d'infractions, d'accidents (Dakar). |
| **Agent Mbour**| `agent.mbour@gescrim.sn`| `password123` | Saisie terrain d'infractions, d'accidents (Mbour). |

---

## 📂 Étape 5 : Liste Détaillée des Routes et URLs de Chaque Élément

Voici l'inventaire complet de toutes les routes de l'API Teranga GESCRIM. Toutes les requêtes (sauf le Login) requièrent le header `Authorization: Bearer {{token}}` et le header `Accept: application/json`.

---

### 1️⃣ Authentification (`api/auth/...`)

Ce module gère la session utilisateur avec JWT.

| Description | Méthode | Route API | URL Postman Complète | Body JSON (Exemple / Requis) |
| :--- | :---: | :--- | :--- | :--- |
| **1. Connexion (Login)** | `POST` | `/api/auth/login` | `{{base_url}}/api/auth/login` | `{"email": "admin@gescrim.sn", "password": "password123"}` |
| **2. Profil de l'utilisateur** | `GET` | `/api/auth/me` | `{{base_url}}/api/auth/me` | *Aucun (Récupère rôles/permissions Spatie)* |
| **3. Rafraîchir le token** | `POST` | `/api/auth/refresh` | `{{base_url}}/api/auth/refresh` | *Aucun (Génère un nouveau JWT actif)* |
| **4. Changer de mot de passe**| `POST` | `/api/auth/change-password`| `{{base_url}}/api/auth/change-password`| `{"current_password": "...", "new_password": "...", "new_password_confirmation": "..."}` |
| **5. Déconnexion (Logout)** | `POST` | `/api/auth/logout` | `{{base_url}}/api/auth/logout` | *Aucun (Invalide le token dans la DB)* |

---

### 2️⃣ Subdivisions Administratives & Régionales

Ces tables servent de structure géographique et administrative de base pour toute la DSP.

#### 📌 Régions (`api/regions/...`)
* **Lister les Régions (Paginé)**
  * **Méthode** : `GET`
  * **URL** : `{{base_url}}/api/regions` (Paramètres optionnels : `?per_page=15`)
* **Toutes les Régions (Sans pagination)**
  * **Méthode** : `GET`
  * **URL** : `{{base_url}}/api/regions/all` *(Utilisé pour peupler les sélecteurs du frontend)*
* **Détail d'une Région**
  * **Méthode** : `GET`
  * **URL** : `{{base_url}}/api/regions/{id}` (Exemple : `{{base_url}}/api/regions/1`)
* **Créer une Région**
  * **Méthode** : `POST`
  * **URL** : `{{base_url}}/api/regions`
  * **Body** : `{"nom": "Dakar", "code": "DK"}`
* **Modifier une Région**
  * **Méthode** : `PUT`
  * **URL** : `{{base_url}}/api/regions/{id}`
  * **Body** : `{"nom": "Dakar Plateau", "code": "DKP"}`
* **Supprimer une Région**
  * **Méthode** : `DELETE`
  * **URL** : `{{base_url}}/api/regions/{id}`

#### 📌 Départements (`api/departements/...`)
* **Lister les Départements (Paginé)** : `GET` `{{base_url}}/api/departements`
* **Tous les Départements (Sans pagination)** : `GET` `{{base_url}}/api/departements/all`
* **Détail d'un Département** : `GET` `{{base_url}}/api/departements/{id}`
* **Créer un Département**
  * **Méthode** : `POST`
  * **URL** : `{{base_url}}/api/departements`
  * **Body** : `{"nom": "Dakar", "region_id": 1}`
* **Modifier un Département** : `PUT` `{{base_url}}/api/departements/{id}` | Body : `{"nom": "Pikine", "region_id": 1}`
* **Supprimer un Département** : `DELETE` `{{base_url}}/api/departements/{id}`

#### 📌 Communes (`api/communes/...`)
* **Lister les Communes (Paginé)** : `GET` `{{base_url}}/api/communes`
* **Toutes les Communes (Sans pagination)** : `GET` `{{base_url}}/api/communes/all`
* **Détail d'une Commune** : `GET` `{{base_url}}/api/communes/{id}`
* **Créer une Commune**
  * **Méthode** : `POST`
  * **URL** : `{{base_url}}/api/communes`
  * **Body** : `{"nom": "Plateau", "departement_id": 1}`
* **Modifier une Commune** : `PUT` `{{base_url}}/api/communes/{id}`
* **Supprimer une Commune** : `DELETE` `{{base_url}}/api/communes/{id}`

#### 📌 Services DSP (Commissariats, Brigades) (`api/services/...`)
* **Lister les Services (Paginé)** : `GET` `{{base_url}}/api/services`
* **Tous les Services (Sans pagination)** : `GET` `{{base_url}}/api/services/all`
* **Détail d'un Service** : `GET` `{{base_url}}/api/services/{id}`
* **Créer un Service**
  * **Méthode** : `POST`
  * **URL** : `{{base_url}}/api/services`
  * **Body** : `{"nom": "Commissariat Central de Dakar", "commune_id": 1, "telephone": "+221 33 800 00 00", "type": "Commissariat"}`
* **Modifier un Service** : `PUT` `{{base_url}}/api/services/{id}`
* **Supprimer un Service** : `DELETE` `{{base_url}}/api/services/{id}`

---

### 3️⃣ Gestion du Personnel (`api/personnels/...`)

Ce module gère le personnel de la Direction de la Sécurité Publique.

* **Lister le Personnel**
  * **Méthode** : `GET`
  * **URL** : `{{base_url}}/api/personnels`
  * **Filtres (Query Params)** : `?per_page=15`, `?search=Ndiaye`, `?statut=Actif`, `?service_id=1`, `?grade=Lieutenant`
* **Détail d'un Personnel**
  * **Méthode** : `GET`
  * **URL** : `{{base_url}}/api/personnels/{id}`
* **Créer un Personnel**
  * **Méthode** : `POST`
  * **URL** : `{{base_url}}/api/personnels`
  * **Body** :
    ```json
    {
      "ccap": "PERS999",
      "prenom": "Awa",
      "nom": "Ndiaye",
      "grade": "Lieutenant",
      "telephone": "+221 77 987 65 43",
      "anciennete": 5,
      "date_entree_corps": "2021-03-10",
      "sexe": "F",
      "situation_matrimoniale": "Marié",
      "date_naissance": "1992-07-15",
      "lieu_naissance": "Dakar",
      "service_id": 1,
      "statut": "Actif"
    }
    ```
* **Modifier un Personnel**
  * **Méthode** : `PUT`
  * **URL** : `{{base_url}}/api/personnels/{id}`
  * **Body** : *Champs modifiables à envoyer de façon optionnelle*
* **Supprimer un Personnel**
  * **Méthode** : `DELETE`
  * **URL** : `{{base_url}}/api/personnels/{id}`

---

### 4️⃣ Catégories & Types d'Infractions

Définit le référentiel pénal des infractions.

#### 📌 Catégories d'Infractions (`api/categories-infractions/...`)
* **Lister les Catégories** : `GET` `{{base_url}}/api/categories-infractions`
* **Créer une Catégorie** : `POST` `{{base_url}}/api/categories-infractions` | Body : `{"libelle": "Atteintes aux personnes", "code": "ATT_PERS"}`
* **Modifier une Catégorie** : `PUT` `{{base_url}}/api/categories-infractions/{id}`
* **Supprimer une Catégorie** : `DELETE` `{{base_url}}/api/categories-infractions/{id}`

#### 📌 Types d'Infractions (`api/types-infractions/...`)
* **Lister les Types d'Infractions** : `GET` `{{base_url}}/api/types-infractions`
* **Créer un Type** : `POST` `{{base_url}}/api/types-infractions` | Body : `{"libelle": "Homicide volontaire", "code": "HOM_VOL", "categorie_infraction_id": 1}`
* **Modifier un Type** : `PUT` `{{base_url}}/api/types-infractions/{id}`
* **Supprimer un Type** : `DELETE` `{{base_url}}/api/types-infractions/{id}`

---

### 5️⃣ Infractions (`api/infractions/...`)

Cœur fonctionnel de la saisie d'infractions pour les policiers sur la voie publique.

* **Lister les Infractions enregistrées**
  * **Méthode** : `GET`
  * **URL** : `{{base_url}}/api/infractions`
  * **Filtres (Query Params)** : `?annee=2026`, `?service_id=1`, `?commune_id=1`, `?issue=Constatée`, `?type_infraction_id=2`, `?date_from=2026-01-01`, `?date_to=2026-12-31`, `?sync_status=synced`, `?search=Sandaga`
* **Détail d'une Infraction**
  * **Méthode** : `GET`
  * **URL** : `{{base_url}}/api/infractions/{id}`
* **Enregistrer une Infraction**
  * **Méthode** : `POST`
  * **URL** : `{{base_url}}/api/infractions`
  * **Body** :
    ```json
    {
      "type_infraction_id": 1,
      "service_id": 1,
      "annee": 2026,
      "date": "2026-05-17",
      "lieu": "Rond-point Sandaga, Dakar",
      "commune_id": 1,
      "issue": "Constatée",
      "latitude": 14.6928,
      "longitude": -17.4467,
      "description": "Usage de téléphone au volant constaté lors d'un contrôle de routine."
    }
    ```
* **Modifier une Infraction (Règle de la minute)**
  * **Méthode** : `PUT`
  * **URL** : `{{base_url}}/api/infractions/{id}`
  * **Body** : `{"lieu": "Nouvel emplacement", "description": "Modifiée..."}`
* **Supprimer une Infraction**
  * **Méthode** : `DELETE`
  * **URL** : `{{base_url}}/api/infractions/{id}`

---

### 6️⃣ Accidents de la Circulation (`api/accidents/...`)

* **Lister les Accidents**
  * **Méthode** : `GET`
  * **URL** : `{{base_url}}/api/accidents`
  * **Filtres (Query Params)** : `?type=corporel`, `?service_id=1`, `?commune_id=1`, `?date_from=2026-05-01`, `?date_to=2026-05-31`
* **Détail d'un Accident**
  * **Méthode** : `GET`
  * **URL** : `{{base_url}}/api/accidents/{id}`
* **Enregistrer un Accident**
  * **Méthode** : `POST`
  * **URL** : `{{base_url}}/api/accidents`
  * **Body** :
    ```json
    {
      "type": "corporel",
      "date": "2026-05-17",
      "lieu": "Autoroute à péage, km 12",
      "commune_id": 1,
      "service_id": 1,
      "moyen": "Véhicule de tourisme contre scooter",
      "cause_probable": "Excès de vitesse",
      "latitude": 14.7228,
      "longitude": -17.4567,
      "description": "Collision arrière."
    }
    ```
* **Modifier un Accident**
  * **Méthode** : `PUT`
  * **URL** : `{{base_url}}/api/accidents/{id}`
* **Supprimer un Accident**
  * **Méthode** : `DELETE`
  * **URL** : `{{base_url}}/api/accidents/{id}`

---

### 7️⃣ Victimes & Impliqués (`api/victimes/...`)

* **Lister les Victimes**
  * **Méthode** : `GET`
  * **URL** : `{{base_url}}/api/victimes`
  * **Filtres (Query Params)** : `?infraction_id=1`, `?accident_id=1`, `?nationalite=Sénégalaise`
* **Détail d'une Victime**
  * **Méthode** : `GET`
  * **URL** : `{{base_url}}/api/victimes/{id}`
* **Enregistrer une Victime**
  * **Méthode** : `POST`
  * **URL** : `{{base_url}}/api/victimes`
  * **Body** :
    ```json
    {
      "nom": "Diop",
      "prenom": "Modou",
      "no_cin_passeport": "1234567890123",
      "sexe": "M",
      "age": 34,
      "nationalite": "Sénégalaise",
      "accident_id": 1,
      "infraction_id": null
    }
    ```
    *Note : Doit impérativement être lié à un accident ou à une infraction.*
* **Modifier une Victime** : `PUT` `{{base_url}}/api/victimes/{id}`
* **Supprimer une Victime** : `DELETE` `{{base_url}}/api/victimes/{id}`

---

### 8️⃣ Immigrations Clandestines (`api/immigrations-clandestines/...`)

Enregistre les données stratégiques de lutte contre l'émigration clandestine par voie maritime.

* **Lister les Interpellations**
  * **Méthode** : `GET`
  * **URL** : `{{base_url}}/api/immigrations-clandestines`
  * **Filtres (Query Params)** : `?service_id=1`, `?date_from=2026-01-01`, `?date_to=2026-12-31`
* **Détail d'une Interpellation**
  * **Méthode** : `GET`
  * **URL** : `{{base_url}}/api/immigrations-clandestines/{id}`
* **Enregistrer une Interpellation**
  * **Méthode** : `POST`
  * **URL** : `{{base_url}}/api/immigrations-clandestines`
  * **Body** :
    ```json
    {
      "nombre_interpellation": 45,
      "date": "2026-05-17",
      "service_id": 1,
      "nombre_hommes": 30,
      "nombre_femmes": 10,
      "nombre_enfants": 5,
      "nombre_maries": 15,
      "nombre_celibataires": 30,
      "nombre_senegalais": 35,
      "nombre_etrangers": 10,
      "zone_depart": "Mbour",
      "zone_depart_lat": 14.4128,
      "zone_depart_lng": -16.9667,
      "zone_arrivee_prevue": "Iles Canaries",
      "zone_arrivee_lat": 28.2916,
      "zone_arrivee_lng": -16.6291
    }
    ```
* **Modifier une Interpellation** : `PUT` `{{base_url}}/api/immigrations-clandestines/{id}`
* **Supprimer une Interpellation** : `DELETE` `{{base_url}}/api/immigrations-clandestines/{id}`

---

### 9️⃣ Finances : Amendes & Services Rémunérés

#### 📌 Services Rémunérés (`api/services-remuneres/...`)
* **Lister les Services Rémunérés** : `GET` `{{base_url}}/api/services-remuneres`
* **Détail d'une Prestation** : `GET` `{{base_url}}/api/services-remuneres/{id}`
* **Créer une Prestation**
  * **Méthode** : `POST`
  * **URL** : `{{base_url}}/api/services-remuneres`
  * **Body** : `{"libelle": "Sécurisation Grand Théâtre", "service_id": 1, "date": "2026-05-17", "montant": 750000, "description": "Sécurisation spectacle."}`
* **Modifier une Prestation** : `PUT` `{{base_url}}/api/services-remuneres/{id}`
* **Supprimer une Prestation** : `DELETE` `{{base_url}}/api/services-remuneres/{id}`

#### 📌 Amendes & Pièces Saisies (`api/amendes-pieces-saisies/...`)
* **Lister les Amendes** : `GET` `{{base_url}}/api/amendes-pieces-saisies` (Filtres : `?type=Amende`, `?service_id=1`)
* **Détail d'un enregistrement** : `GET` `{{base_url}}/api/amendes-pieces-saisies/{id}`
* **Créer un enregistrement**
  * **Méthode** : `POST`
  * **URL** : `{{base_url}}/api/amendes-pieces-saisies`
  * **Body** : `{"type": "Amende", "service_id": 1, "date": "2026-05-17", "montant": 6000, "description": "Amende défaut permis."}`
* **Modifier un enregistrement** : `PUT` `{{base_url}}/api/amendes-pieces-saisies/{id}`
* **Supprimer un enregistrement** : `DELETE` `{{base_url}}/api/amendes-pieces-saisies/{id}`

---

### 🔟 Administration & Rôles Spatie (`api/users`, `api/roles`)

#### 📌 Utilisateurs (`api/users/...`)
* **Lister les Comptes Utilisateurs** : `GET` `{{base_url}}/api/users` (Filtres : `?search=`, `?service_id=`, `?is_active=1`)
* **Détail d'un Utilisateur** : `GET` `{{base_url}}/api/users/{id}`
* **Créer un Compte**
  * **Méthode** : `POST`
  * **URL** : `{{base_url}}/api/users`
  * **Body** : `{"name": "Chef Brigade Mbour", "email": "chef.mbour@gescrim.sn", "password": "password123", "telephone": "+221 77 400 00 11", "service_id": 2, "role": "superviseur", "is_active": true}`
* **Modifier un Compte** : `PUT` `{{base_url}}/api/users/{id}` (Permet de modifier le rôle Spatie, le statut actif/inactif, etc.)
* **Supprimer un Compte** : `DELETE` `{{base_url}}/api/users/{id}` (Impossible de supprimer son propre compte connecté !)

#### 📌 Rôles Spatie (`api/roles/...`)
* **Lister les Rôles existants**
  * **Méthode** : `GET`
  * **URL** : `{{base_url}}/api/roles` *(Retourne les rôles : `super_admin`, `admin`, `superviseur`, `agent`)*

---

### 1️⃣1️⃣ Notifications Internes (`api/notifications/...`)

* **Lister ses Notifications** : `GET` `{{base_url}}/api/notifications` (Filtres : `?is_read=false`, `?type=alert`)
* **Nombre de Notifications Non Lues** : `GET` `{{base_url}}/api/notifications/unread-count`
* **Marquer une Notification comme Lue** : `PUT` `{{base_url}}/api/notifications/{id}/read`
* **Marquer Toutes ses Notifications comme Lues** : `PUT` `{{base_url}}/api/notifications/read-all`
* **Diffuser une Notification (Réservé Admin)**
  * **Méthode** : `POST`
  * **URL** : `{{base_url}}/api/notifications/send`
  * **Body** : `{"user_id": 1, "titre": "Alerte Sécurité", "message": "Consignes de patrouille renforcées.", "type": "alert", "canal": "ecran"}`

---

### 1️⃣2️⃣ Dashboard & Statistiques Décisionnelles (`api/dashboard/...`)

Ces routes fournissent les données pré-calculées pour le dashboard graphique de la Direction DSP.

* **Statistiques Globales (KPIs)** : `GET` `{{base_url}}/api/dashboard/stats` *(Renvoie le total d'infractions, d'accidents, de blessés, de décès, d'amendes)*
* **Infractions par Région (Données Cartographiques)** : `GET` `{{base_url}}/api/dashboard/infractions-par-region`
* **Accidents par Type** : `GET` `{{base_url}}/api/dashboard/accidents-par-type` *(Répartition : corporel, matériel, mortel)*
* **Tendances Mensuelles** : `GET` `{{base_url}}/api/dashboard/tendances-mensuelles` *(Évolution chronologique de l'année en cours)*
* **Infractions par Type** : `GET` `{{base_url}}/api/dashboard/infractions-par-type` *(Top des infractions commises)*
* **Répartition du Personnel par Service** : `GET` `{{base_url}}/api/dashboard/personnel-par-service`

---

### 1️⃣3️⃣ Exports & Synchronisation Offline

#### 📌 Exports et Imports de Sauvegardes (`api/export/...`)
* **Exporter Infractions en PDF** : `GET` `{{base_url}}/api/export/infractions/pdf`
* **Exporter Infractions en CSV** : `GET` `{{base_url}}/api/export/infractions/csv`
* **Exporter Accidents en PDF** : `GET` `{{base_url}}/api/export/accidents/pdf`
* **Exporter Accidents en CSV** : `GET` `{{base_url}}/api/export/accidents/csv`
* **Importer Données Backup JSON** : `POST` `{{base_url}}/api/export/import/json` | Body : `{"data": [...]}`

#### 📌 Synchronisation Hors-ligne (Offline Gateway) (`api/sync/...`)
* **Batch Sync (Envoi Groupé Mobile)**
  * **Méthode** : `POST`
  * **URL** : `{{base_url}}/api/sync/batch`
  * **Body** : `{"infractions": [...], "accidents": [...]}` *(Reçoit les tableaux d'éléments créés localement sur mobile en zone blanche)*
* **Vérifier le statut de synchro** : `GET` `{{base_url}}/api/sync/status`

#### 📌 Logs d'Audit de Sécurité (`api/audit-logs/...`)
* **Lister les logs d'Audit** : `GET` `{{base_url}}/api/audit-logs`
* **Détail d'une action loggée** : `GET` `{{base_url}}/api/audit-logs/{id}`

---

---

## 🛠️ Résolution des Problèmes Fréquents (Troubleshooting)

### 🔴 Erreur `401 Unauthorized` sur toutes les routes
**Cause** : Votre token JWT a expiré (durée par défaut : 60 minutes) ou vous n'avez pas encore effectué de requête de connexion.
**Solution** : Allez dans le dossier **01. Authentification**, sélectionnez la requête **Login (Connexion)** et cliquez sur **Send**. Le token se mettra à jour automatiquement et toutes les autres routes refonctionneront immédiatement.

### 🔴 Erreur `403 Forbidden`
**Cause** : Vous essayez de modifier une ressource en tant qu'agent terrain alors que le délai réglementaire d'une minute est expiré, ou vous essayez d'accéder à une route réservée aux administrateurs (ex. gestion des utilisateurs ou logs d'audit).
**Solution** : Connectez-vous avec le compte `admin@gescrim.sn` dans la requête **Login**, puis réessayez.

### 🔴 Erreur `422 Unprocessable Entity`
**Cause** : Des données obligatoires manquent dans le corps de votre requête JSON, ou des clés étrangères (comme `service_id` ou `commune_id`) font référence à des identifiants (IDs) inexistants en base de données.
**Solution** : Lisez le message retourné par l'API dans l'onglet **Response** de Postman. Il vous indiquera précisément quel champ pose problème (ex. *"Le type d'infraction sélectionné n'existe pas"*).

---

💡 *Ce tutoriel et la collection associée vous garantissent une couverture de test de 100% de votre backend, validant ainsi la robustesse technique et la sécurité de votre travail de fin d'études devant votre jury.*
