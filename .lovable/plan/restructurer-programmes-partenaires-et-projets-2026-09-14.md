# Restructurer Programmes, Partenaires et Projets

## Résultat attendu
- Regrouper la gestion dans une page « Projets & partenariats » avec trois onglets principaux : Programmes, Partenaires et Projets.
- Reproduire la logique source : un programme porte ses objectifs et son état ; un partenaire porte ses coordonnées, sa localisation et l’objet de collaboration ; un projet dépend d’un programme et d’un partenaire.
- Faire de chaque projet un dossier opérationnel avec son budget initial, son budget restant, sa période, son chef de projet, son document, ses participants et ses activités.
- Depuis la liste des projets, proposer les actions « Participants », « Activités » et « Clôturer » sans encombrer le menu latéral.

## Parcours de gestion
1. Créer un programme avec nom, objectifs, description et statut.
2. Créer un partenaire avec nom, site web, contact, localisation, objet de collaboration et logo.
3. Créer un projet en sélectionnant obligatoirement le programme, le partenaire et le chef de projet, puis renseigner objectifs, description, budget, période et document.
4. Ouvrir un projet pour affecter des employés comme participants.
5. Créer des activités uniquement pour les participants du projet, avec responsable, libellé, engagement, budget alloué et période.
6. Calculer le budget restant à partir des activités et afficher clairement l’état d’avancement du projet.

## Accès et données
- Conserver les autorisations séparées existantes pour Programmes, Partenaires et Projets, tout en présentant une seule rubrique visuelle.
- Les participants et activités héritent de l’accès au module Projets et ne créent pas de nouvelles entrées dans le menu.
- Étendre la base existante sans fabriquer de données ; les tables actuellement vides restent vides jusqu’à la saisie réelle.
- Conserver les anciennes adresses des trois modules en les redirigeant vers le bon onglet.

## Détails techniques
- Enrichir les tables Programmes, Partenaires et Projets avec les champs réellement présents dans les fichiers fournis.
- Ajouter les tables relationnelles Participants et Activités avec clés étrangères, droits d’accès et suppression en cascade liée au projet.
- Ajouter un espace privé pour les documents de projet, logos partenaires et engagements d’activité.
- Construire une vue dédiée réutilisant les listes et formulaires existants, avec une fiche projet détaillée pour Participants et Activités.
- Vérifier la création en cascade, les calculs de budget, la recherche, les documents et l’affichage ordinateur/mobile.
