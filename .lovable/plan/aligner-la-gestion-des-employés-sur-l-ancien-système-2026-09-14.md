# Aligner la gestion des employés sur l’ancien système

## Objectif
Reproduire fidèlement la structure métier visible dans les fichiers fournis, tout en conservant les employés déjà importés.

## Modifications prévues
- Compléter chaque fiche employé avec : nom, prénom, téléphone, e-mail, CNI, banque, numéro de compte, localité, date d’entrée, date de sortie, niveau d’études, service, profil, responsable, catégorie de personnel et statut.
- Distinguer les employés permanents et non permanents, comme dans les deux contrôleurs fournis.
- Utiliser les statuts de la source : Disponible, En congé, En formation et Inactif.
- Conserver le matricule et le salaire de base déjà présents dans l’application.
- Ajouter le contrat et le dossier administratif, avec fichiers limités à 5 Mo, consultables depuis la liste.
- Permettre à l’administrateur de créer un accès de connexion pour un employé disposant d’une adresse e-mail, sans inscription publique.
- Préserver les cinq employés déjà importés et compléter leurs nouvelles informations avec les valeurs réellement présentes dans le dump lorsque disponibles.

## Organisation de l’écran
- Garder une liste recherchable avec les colonnes essentielles et les actions Modifier, Désactiver/Réactiver, Contrat, Dossier et Créer l’accès.
- Organiser le formulaire par blocs lisibles : identité et contact, affectation, informations bancaires, contrat et dossier.
- Les références Niveau d’études, Service et Profil seront proposées comme listes cohérentes avec les valeurs de l’ancien système.

## Détails techniques
- Étendre la table des employés sans casser les relations existantes avec congés, présences et salaires.
- Créer un espace privé pour les contrats et dossiers ; seuls les utilisateurs autorisés pourront les consulter.
- Adapter la fiche générique Employés et la création sécurisée des comptes.
- Vérifier la création, la modification, les statuts et l’affichage sur ordinateur et mobile.
