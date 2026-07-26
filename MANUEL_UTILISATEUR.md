# Manuel Utilisateur — TERANGA GESCRIM

**Plateforme Nationale de Sécurité Publique — Application Mobile**

| | |
|---|---|
| Version | 1.0 · Juillet 2026 |
| Plateforme | Android / iOS |
| Organisation | Direction de la Sécurité Publique — République du Sénégal |

---

## Table des matières

1. [Présentation de l'application](#1-présentation-de-lapplication)
2. [Connexion et authentification](#2-connexion-et-authentification)
3. [Tableau de bord](#3-tableau-de-bord)
4. [Saisir une infraction](#4-saisir-une-infraction)
5. [Saisir un accident](#5-saisir-un-accident)
6. [Saisir une immigration clandestine](#6-saisir-une-immigration-clandestine)
7. [Enregistrer une amende](#7-enregistrer-une-amende)
8. [Enregistrer un service rémunéré](#8-enregistrer-un-service-rémunéré)
9. [Historique des saisies](#9-historique-des-saisies)
10. [Synchronisation](#10-synchronisation)
11. [Notifications](#11-notifications)
12. [Profil et déconnexion](#12-profil-et-déconnexion)
13. [Mode hors connexion](#13-mode-hors-connexion)

---

## 1. Présentation de l'application

TERANGA GESCRIM est l'application mobile officielle des agents de terrain de la Direction de la Sécurité Publique (DSP) du Sénégal. Elle permet de :

- **Saisir** les incidents criminels et routiers directement sur le terrain
- **Travailler sans connexion** — les données sont sauvegardées localement
- **Synchroniser automatiquement** les données vers le serveur central à la reconnexion
- **Joindre des photos** aux saisies
- **Recevoir des notifications** de la hiérarchie

### Rôles disponibles

| Rôle | Accès |
|------|-------|
| **Agent** | Saisies terrain, historique personnel, synchronisation |
| **Gestionnaire** | Saisies + consultation statistiques régionales + exports |
| **Administrateur** | Accès complet — gestion utilisateurs, paramétrage national |

---

## 2. Connexion et authentification

### 2.1 Première connexion

1. Lancez l'application TERANGA GESCRIM
2. Saisissez votre **adresse email** et votre **mot de passe** fournis par votre administrateur
3. Appuyez sur **Se connecter**

<div align="center">
  <img src="docs/screenshots/connexion.png" alt="Écran de connexion" width="280"/>
</div>

### 2.2 Vérification 2FA (double authentification)

Si la double authentification est activée sur votre compte :

1. Après la connexion, un **code à 6 chiffres** vous est envoyé par email
2. Saisissez ce code dans le champ prévu
3. Appuyez sur **Vérifier**

<div align="center">
  <img src="docs/screenshots/2fa.png" alt="Vérification 2FA" width="280"/>
</div>

> Le code est valable **5 minutes**. Passé ce délai, recommencez la connexion.

> **Sécurité** : après 5 tentatives incorrectes, votre compte est temporairement bloqué pendant 10 minutes.

### 2.3 Appareil non reconnu

Si vous vous connectez depuis un nouvel appareil, une vérification supplémentaire peut être demandée. Contactez votre administrateur si l'accès est refusé.

---

## 3. Tableau de bord

Après connexion, le tableau de bord affiche :

- **5 boutons de saisie rapide** : Infraction · Accident · Immigration · Amende · Service rémunéré
- **Indicateur de synchronisation** : nombre de saisies en attente
- **Indicateur de connexion** : en ligne / hors ligne

---

## 4. Saisir une infraction

1. Depuis le tableau de bord, appuyez sur **Nouvelle infraction**
2. Remplissez les champs :
   - **Type d'infraction** (liste déroulante)
   - **Date et heure** (automatique ou manuel)
   - **Lieu** (texte libre)
   - **Géolocalisation** — appuyez sur l'icône GPS pour capturer automatiquement votre position
   - **Issue** : Constatée / Déférée / Classée
3. Pour ajouter une **victime** : appuyez sur *Ajouter une victime* et remplissez les informations
4. Pour ajouter des **photos** : appuyez sur l'icône appareil photo ou galerie
5. Appuyez sur **Enregistrer**

<div align="center">
  <img src="docs/screenshots/infraction.png" alt="Saisie d'une infraction" width="280"/>
</div>

> La saisie est immédiatement sauvegardée localement, même sans connexion.

---

## 5. Saisir un accident

1. Appuyez sur **Nouvel accident**
2. Remplissez :
   - **Type d'accident** : matériel / corporel / mortel
   - **Date, heure, lieu**
   - **Géolocalisation GPS**
   - **Nombre de véhicules impliqués**
3. Pour ajouter des **victimes** (blessés, tués) : appuyez sur *Ajouter une victime*
4. Ajoutez des **photos** si disponibles
5. Appuyez sur **Enregistrer**

---

## 6. Saisir une immigration clandestine

1. Appuyez sur **Nouvelle immigration**
2. Remplissez :
   - **Date et lieu d'interpellation**
   - **Nombre de personnes** (hommes, femmes, enfants, étrangers, sénégalais)
   - **Zone de départ** et **zone d'arrivée**
3. Appuyez sur **Enregistrer**

<div align="center">
  <img src="docs/screenshots/immigration.png" alt="Saisie immigration clandestine" width="280"/>
</div>

---

## 7. Enregistrer une amende

1. Appuyez sur **Nouvelle amende**
2. Remplissez :
   - **Type** : amende / pièce saisie
   - **Montant**
   - **Description**
   - **Date**
3. Appuyez sur **Enregistrer**

<div align="center">
  <img src="docs/screenshots/amende.png" alt="Enregistrement d'une amende" width="280"/>
</div>

---

## 8. Enregistrer un service rémunéré

1. Appuyez sur **Nouveau service rémunéré**
2. Remplissez les informations du service
3. Appuyez sur **Enregistrer**

<div align="center">
  <img src="docs/screenshots/service-remunere.png" alt="Service rémunéré" width="280"/>
</div>

---

## 9. Historique des saisies

L'écran **Historique** liste toutes vos saisies classées par date.

<div align="center">
  <img src="docs/screenshots/historique.png" alt="Historique des saisies" width="280"/>
</div>

### Filtrer par type
Utilisez les onglets en haut : **Tout · Infractions · Accidents · Immigrations · Amendes · Services**

### Statut de synchronisation
- 🟡 **En attente** : saisie locale, pas encore synchronisée
- ✅ **Synchronisé** : donnée transmise au serveur central

### Supprimer des saisies
1. Appuyez longuement sur une saisie pour activer la multi-sélection
2. Sélectionnez les saisies à supprimer
3. Appuyez sur l'icône de suppression

> Seules les saisies **non synchronisées** peuvent être supprimées.

---

## 10. Synchronisation

### Synchronisation automatique
Dès que l'application détecte une connexion réseau, elle synchronise automatiquement toutes les saisies en attente.

### Synchronisation manuelle
1. Allez sur l'écran **Profil**
2. Appuyez sur **Synchroniser maintenant**
3. L'indicateur affiche la progression

### Ordre de synchronisation
1. Les **photos** sont uploadées en premier
2. Puis les **données textes** (infractions, accidents, etc.)
3. Le statut passe à ✅ **Synchronisé** une fois confirmé par le serveur

---

## 11. Notifications

L'écran **Notifications** affiche les alertes envoyées par la hiérarchie.

<div align="center">
  <img src="docs/screenshots/notifications.png" alt="Notifications" width="280"/>
</div>

### Types de notifications

| Type | Couleur | Signification |
|------|---------|---------------|
| 🔴 URGENCE | Rouge | Action immédiate requise |
| 🟠 ALERTE | Orange | Attention particulière |
| 🟡 AVERTISSEMENT | Jaune | Information importante |
| 🟢 SUCCÈS | Vert | Confirmation positive |
| 🔵 INFO | Bleu | Information générale |

### Filtrer les notifications
Utilisez les boutons de filtre en haut de l'écran pour afficher un type spécifique.

---

## 12. Profil et déconnexion

L'écran **Profil** affiche vos informations personnelles (nom, grade, service affecté), votre rôle dans le système, l'état de synchronisation et le bouton **Se déconnecter**.

<div align="center">
  <img src="docs/screenshots/profil.png" alt="Profil et synchronisation" width="280"/>
</div>

### Déconnexion
1. Appuyez sur **Se déconnecter**
2. Confirmez dans la boîte de dialogue
3. Vous êtes redirigé vers l'écran de connexion

> La déconnexion **ne supprime pas** vos saisies locales non synchronisées.

---

## 13. Mode hors connexion

TERANGA GESCRIM fonctionne **entièrement sans connexion internet**.

| Action | Disponible hors ligne |
|--------|-----------------------|
| Saisir une infraction | ✅ |
| Saisir un accident | ✅ |
| Saisir une immigration | ✅ |
| Enregistrer une amende | ✅ |
| Enregistrer un service rémunéré | ✅ |
| Consulter l'historique | ✅ |
| Prendre des photos | ✅ |
| Synchroniser | ❌ (nécessite une connexion) |
| Recevoir des notifications | ❌ (nécessite une connexion) |

> Les données saisies hors ligne sont **conservées indéfiniment** jusqu'à la prochaine synchronisation.

---

## Aperçu général de l'application

<div align="center">

| Connexion | Vérification 2FA | Saisie infraction |
|:---------:|:----------------:|:-----------------:|
| <img src="docs/screenshots/connexion.png" width="200"/> | <img src="docs/screenshots/2fa.png" width="200"/> | <img src="docs/screenshots/infraction.png" width="200"/> |

| Historique | Amende | Immigration |
|:----------:|:------:|:-----------:|
| <img src="docs/screenshots/historique.png" width="200"/> | <img src="docs/screenshots/amende.png" width="200"/> | <img src="docs/screenshots/immigration.png" width="200"/> |

| Notifications | Service rémunéré | Profil |
|:-------------:|:----------------:|:------:|
| <img src="docs/screenshots/notifications.png" width="200"/> | <img src="docs/screenshots/service-remunere.png" width="200"/> | <img src="docs/screenshots/profil.png" width="200"/> |

</div>

---

## Contacts et support

Pour toute assistance technique, contactez votre responsable de service ou l'administrateur système de la DSP.

---

*© 2026 TERANGA GESCRIM — Direction de la Sécurité Publique, République du Sénégal*  
*Développé par Gallo SALL — CFPT Sénégal-Japon*
