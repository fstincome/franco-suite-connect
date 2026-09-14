# Recentrer la gestion des salaires

## Objectif
Retirer toute donnée salariale de la fiche Employé et reconstruire un espace Paie autonome, fidèle aux écrans et calculs du système source.

## Ce qui sera construit
- Retirer « Salaire de base » du formulaire et de la liste Employés, sans supprimer les dossiers RH existants.
- Remplacer l’écran Salaires générique par un espace dédié avec trois vues :
  - **Paramétrage des salaires** : employé, état civil, nombre d’enfants et salaire de base.
  - **Détails de calcul** : SB, indemnité de déplacement (ID), indemnité de logement (IL), allocations familiales (AF), salaire brut, INSS, mutuelle, déductions, revenu net imposable, IPR, salaire net à payer et montant supporté.
  - **Fiches mensuelles** : mois/année, document, auteur, dernier modificateur et statut.
- Reprendre les formules du contrôleur source lors de la création ou modification d’un salaire, avec aperçu immédiat avant enregistrement.
- Mettre en place le circuit mensuel **Soumis → Révisé → Validé → Payé**, avec possibilité d’annulation et historique des actions.
- Générer une fiche mensuelle seulement si elle n’existe pas déjà pour la période, puis permettre sa consultation.

## Données et sécurité
- Faire évoluer le schéma Paie dans Lovable Cloud avec des relations vers Employés et Utilisateurs, contraintes d’unicité et règles d’accès.
- Importer strictement les données réelles trouvées dans le dump : 1 paramétrage salarial, 1 détail calculé, 2 paiements mensuels et 2 références de fiches PDF.
- Conserver les anciens identifiants et les liens PDF source ; signaler clairement un document devenu indisponible au lieu d’en fabriquer un.
- Réserver les données salariales aux utilisateurs autorisés à l’onglet Salaires ; l’employé ne verra pas automatiquement les salaires des autres.

## Vérifications
- Vérifier les montants importés et les formules avec l’exemple réel de 500 000 FBu donnant 775 400 FBu net.
- Tester la création, le recalcul, la recherche, les changements de statut et la consultation d’une fiche mensuelle.
- Vérifier que la fiche Employé ne montre plus aucune information salariale sur ordinateur et mobile.

## Détails techniques
- Tables dédiées prévues : paramétrage salarial, détails de paie et fiches mensuelles ; migrations avec droits et politiques d’accès dans le même script.
- Écran Paie spécialisé plutôt que le formulaire générique, afin de rendre les calculs lisibles et non modifiables manuellement.
- Les sigles seront accompagnés de leur libellé complet dans l’interface.
