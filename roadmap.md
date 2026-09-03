# CNAC MURIMA W'ISANGI — Feuille de route

## Contexte
Reconstruction moderne du progiciel CodeIgniter fourni (`application.zip`) en application web
React / TanStack Start + Lovable Cloud, entièrement en français.

## Import des données source — BLOQUÉ
L'archive `application.zip` (et les archives imbriquées `administration.zip`, `communaute.zip`,
`projets.zip`) ne contient **que du code PHP** : aucun fichier `.sql`, dump MySQL, `.csv`, `.json`
ou export tableur. `application/config/database.php` ne contient que la structure de connexion.
Aucune donnée réelle n'a donc été importée et **aucune donnée fictive n'a été fabriquée**.
Le schéma est prêt à recevoir un import : chaque table métier possède une colonne `legacy_id`
unique permettant de préserver les anciennes clés et relations.
À fournir pour débloquer : un dump `mysqldump` ou des exports CSV par table.

## Fait
- [x] Analyse de l'archive et cartographie des modules
- [x] Activation de Lovable Cloud
- [x] Schéma relationnel (RH, données, stock, charroi, communauté, mobile money, projets, suivi, archives)
- [x] RLS + rôles (`admin`, `gestionnaire`, `agent`), profils auto-créés
- [x] Registre de modules et pages CRUD génériques
- [x] Écran de connexion, coquille applicative, navigation latérale par groupes
- [x] Tableau de bord opérationnel (stock, carburant, véhicules, alertes, tendances)
- [x] Rapports et statistiques
- [x] Compte administrateur initial advaxen@gmail.com avec tous les droits
- [x] Suppression de l'option publique « Créer un compte » (connexion e-mail/mot de passe uniquement)

## À venir
- [ ] Import des données réelles dès réception d'un dump/export exploitable
- [ ] Gestion des utilisateurs et rôles depuis l'interface (admin)
