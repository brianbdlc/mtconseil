# Plan : Outil de production de rapports d'audit énergétique (MT Conseil)

> PRD source : `docs/PRD.md`
> Projet greenfield au moment du plan : seul le CLI Supabase (`supabase@3.1.0`, projet `mtconseil`, Postgres 17, `supabase/config.toml`) est en place.

## Context

MT Conseil produit ~5 audits/an, chacun ~75 pages, ~1 semaine de rédaction + mise en page refaite à chaque fois, avec des erreurs de cohérence (un même chiffre qui diffère d'un endroit à l'autre). Le PRD décrit un outil web qui produit les parties répétitives dans le gabarit MT Conseil et livre un `.docx` modifiable, selon le principe **l'IA lit et rédige, le code calcule, l'humain confirme**. Le PRD a volontairement laissé la pile technique et le découpage de livraison à ce plan.

Choix validés avec l'utilisateur : **Next.js + Supabase**, IA **Claude (Anthropic)**, **~10 phases fines** en tranches verticales. Le risque n°1 (fidélité du Word au gabarit MT Conseil) est attaqué tôt : la Phase 2 exporte un vrai `.docx` dès la première fiche.

---

## Décisions architecturales

Décisions durables qui s'appliquent à toutes les phases :

- **Stack** : Next.js (App Router) + Supabase (Auth courriel/mot de passe, Postgres 17, Storage). Génération Word et appels Claude **côté serveur uniquement** (Route Handlers / Server Actions). Déploiement type Vercel, environnements séparés local/aperçu/production.
- **IA** : Claude (Anthropic), un seul fournisseur pour vision (lecture factures) et rédaction. Clés jamais exposées au client. Instructions de rédaction **stockées en base** (pas dans le code) et envoyées à chaque requête. Vérification humaine obligatoire sur toute lecture de facture (R5, R6).
- **Génération `.docx`** : bibliothèque côté serveur produisant vrais styles Titre 1/2/3 avec numérotation auto, champs Word pour légendes/numéros de tableau/figure, tableaux Word natifs, images (photos/graphiques). *ponytail : la bibliothèque précise n'est pas figée ici — à valider tôt contre le modèle Word MT Conseil (Phase 2) ; la décision durable est « .docx modifiable à vrais styles », pas l'outil.*
- **Routes** : `/login` ; `/dossiers` (liste firme) ; `/dossiers/[id]` avec onglets (fiches, description, factures, rédaction, annexe, export) ; `/admin` (comptes, permissions, types de section, valeurs par défaut).
- **Schéma (formes, pas détails)** : `profiles` (↔ `auth.users`, rôle `ingenieur|admin`) ; `projects` (numero_projet, client_nom, client_adresse, type_service) ; `equipment_cards` + lignes de tableau + lignes « + Autre » ; `photos` (Storage) ; `building_description` + `zones` ; `section_types` + `section_type_versions` ; `sections` (notes, texte_genere, texte_confirme, statut, hash des sources) ; `invoices` + `invoice_months` ; `optima_annex` ; `report_approvals` ; historique générique `text_versions` (R10).
- **Modèle de champ transversal** : chaque champ = `{ valeur, état(valeur | « n/d » | « - »), estimé:bool }` (R2, R4). Vide → affiché « n/d » ; « ? » accepté tel quel.
- **Statut de bloc** : chaque bloc de données/texte a un statut `brouillon | confirmé` ; seul le confirmé sert aux calculs/rédaction/vérifs/export ; modifier du confirmé → `à reconfirmer` + marque `à régénérer` ce qui en dépend (R1). Autosave (US-48) et indicateur de progression (US-50) sont des fondations posées tôt.
- **Numérotation** : numéros de section/tableau/figure/ID d'équipement **calculés à l'affichage et à l'export** selon l'ordre d'apparition, jamais stockés en dur (R8).
- **Autorisation** : RLS Supabase. Tout utilisateur connecté voit tous les dossiers de la firme et peut les modifier. Admin seulement : comptes, permissions, types de section, approbation. Pas d'inscription libre ; non connecté = rien de visible.
- **Formats** : français (virgule décimale, espace milliers, « $ » après montant, « (av.tx) ») (R9) ; pi² → m² (×0,092903) et tonnes → kW (×3,517, 1 déc.) quand un calcul en a besoin, corrigeable.
- **Contraintes repo** : migrations Supabase **additives uniquement**, projet lié = **DEV**, toute évolution par **branche + PR** (jamais directement sur `main`).

### Dépendances externes bloquantes (à obtenir de MT Conseil)
- Modèle Word (polices, couleurs, styles) + logo → **bloque Phase 2**.
- Formules section 4, normalisation, source degrés-jours, facteurs d'émission → **bloque Phase 8**.
- Vraies factures Énergir + Hydro-Québec (12 mois ×2) → **nécessaires pour tester Phase 7**.
- PDF Optima de test → **nécessaire pour Phase 9**.
- Exemples de rapports + notes de visite brutes + cible chiffrée de temps → support de tout le projet.

---

## Phase 1 : Socle — authentification + dossiers

**User stories** : US-1, US-3, US-4, US-5 (+ fondations US-48 autosave, US-50 progression, R11, R12)

### Ce qu'on livre
Connexion courriel/mot de passe avec comptes créés par l'admin (pas d'inscription libre) ; non connecté = rien de visible. Création d'un dossier (4 champs : numéro de projet, client, adresse, type de service) et liste de tous les dossiers de la firme, réouvrables/modifiables depuis téléphone et bureau. RLS en place. Autosave et indicateur de progression posés comme fondations réutilisables.

### Critères d'acceptation
- [ ] L'admin crée un compte ingénieur qui peut ensuite se connecter ; aucune inscription libre possible.
- [ ] Une URL protégée redirige vers `/login` si non connecté.
- [ ] Un dossier créé (4 champs) apparaît dans la liste pour tous les utilisateurs et se rouvre pour édition.
- [ ] La saisie est responsive (téléphone + bureau) et sauvegardée sans action explicite.

## Bloquée par
- Aucune — démarrable immédiatement.

---

## Phase 2 : Première fiche + export Word squelette (tracer bullet clé)

**User stories** : US-6, US-7, US-8 (cœur : ID auto, description, marque/modèle), US-16, US-41 (partiel), US-42, US-43 (+ R1, R2, R8, R9)

### Ce qu'on livre
Dans un dossier, ajouter une fiche d'équipement (gabarit fixe, nouvelle page) avec titre + intro saisis à la main et tableau 1 (champs cœur), champ à 3 états (valeur/« n/d »/« - »), statut brouillon → confirmée, aperçu dans le gabarit. Export d'un `.docx` contenant la/les fiche(s) confirmée(s) avec logo haut-droite, pied de page sur 3 lignes + numéro de page, vrais styles Titre 1/2/3, numéro de section auto (3.x), titres de section vides pour les parties à faire à la main, et table des matières créable en un clic. **Valide tôt le pipeline Word contre le modèle MT Conseil (risque n°1).**

### Critères d'acceptation
- [ ] Une fiche confirmée s'exporte ; le `.docx` s'ouvre dans Word sans erreur.
- [ ] Table des matières générée en un clic ; numéro de section se recalcule à l'ajout/suppression/déplacement.
- [ ] Logo + pied de page présents sur les pages produites ; formats FR appliqués.
- [ ] Titres de section vides insérés pour les parties à compléter à la main (numérotation juste).

## Bloquée par
- Phase 1. (Besoin du modèle Word MT Conseil + logo.)

---

## Phase 3 : Fiche d'équipement complète

**User stories** : US-9, US-10, US-11, US-12, US-13, US-14, US-15 (+ R3, R4)

### Ce qu'on livre
Tableau 2 (refroidissement/chauffage : type, kW, %) avec légende fixe et règle « - » tableau 1 → tableau 2 ; conversion tonnes → kW corrigeable ; unités identiques → ID en plage (« 17-18-19 ») + continuité de la numérotation sur la fiche suivante ; lignes « + Autre » ; « estimé » (astérisque + note modifiable) ; constats/remarques en puces ; 1 à 6 photos (2 par rangée, titre optionnel, réordonnables, supprimables, formats téléphone dont HEIC converti). Tout s'exporte dans la fiche.

### Critères d'acceptation
- [ ] Reproduit les cas du jeu de test : 2 photos, 1 photo, débit estimé, 3 unités identiques, refroidissement « - ».
- [ ] Tonnes → kW correct et corrigeable à la main ; HEIC accepté et affiché.
- [ ] Ordre des photos et lignes « + Autre » persistés et exportés.

## Bloquée par
- Phase 2.

---

## Phase 4 : Description du bâtiment

**User stories** : US-17, US-18, US-19, US-20, US-21

### Ce qu'on livre
Page « Description du bâtiment » en blocs (le bâtiment, zones, alimentation en énergie) ; zones illimitées (nom, superficie pi², étages, usage) réordonnables/supprimables ; photo du bâtiment (Figure 1) ; avertissement **non bloquant** si somme des zones ≠ superficie totale (case « écart voulu » + note) ; confirmation (superficie brute totale obligatoire, autres champs remplis ou « n/d »/« - »). Exportée dans le Word.

### Critères d'acceptation
- [ ] Description confirmée exportée avec Figure 1.
- [ ] Avertissement d'écart s'affiche sans empêcher de continuer ; case « écart voulu » le lève.
- [ ] Superficie brute totale obligatoire pour confirmer.

## Bloquée par
- Phase 2 (pipeline export).

---

## Phase 5 : Moteur de rédaction IA — types de section + génération

**User stories** : US-22, US-23, US-24, US-25, US-26, US-29, US-30, US-50 (+ R5, R10)

### Ce qu'on livre
Écran admin des types de section (titre, emplacement, instructions de rédaction, case notes, actif/inactif) sans redéploiement, avec historique d'instructions + rollback (US-30). Case de notes par section (US-22). « J'ai terminé la saisie » → choix des sections à rédiger (toutes cochées par défaut), éléments ignorés faute de confirmation listés (US-23). Génération Claude (titre, paragraphes, sous-titres, listes) à partir des **seules données confirmées + notes**, dans le ton MT Conseil (US-24). Édition libre puis confirmation → texte repris tel quel (US-25). Marqueur « [Information manquante : …] » qui **bloque la confirmation** (US-26/R5). Indicateur de progression pendant l'appel IA (US-50). Types rédigés de départ : Humidification, Contrôles, Électricité, Sommaire du site, Analyse du bilan.

### Critères d'acceptation
- [ ] L'admin ajoute/modifie/désactive un type de section sans déploiement ; rollback d'instructions ramène une version antérieure (qui/quand).
- [ ] Une section se génère depuis données confirmées + notes uniquement ; une section avec marqueur « [Information manquante] » ne peut pas être confirmée.
- [ ] Texte édité puis confirmé est exporté tel quel ; « Sommaire du site » n'est disponible que si la description est confirmée.

## Bloquée par
- Phase 2 (données confirmées + export) ; Phase 4 pour « Sommaire du site ».

---

## Phase 6 : Dépendances, régénération & versions

**User stories** : US-27, US-28, US-46, US-49 (+ R1 propagation)

### Ce qu'on livre
Suivi des dépendances source → section : quand une donnée source confirmée change, la section passe « à régénérer » sans écraser le texte modifié sans accord (US-27) ; une section confirmée affiche « données modifiées depuis la confirmation » et exige une reconfirmation **avant export** (US-28). Généralisation du statut brouillon/confirmé + « à régénérer » à tous les blocs (US-46). Historique de versions (qui/quand) + rollback sur les textes (US-49).

### Critères d'acceptation
- [ ] Modifier une donnée source marque les sections dépendantes « à régénérer » / « données modifiées ».
- [ ] L'export est bloqué tant qu'une section confirmée reste en « données modifiées » ; le texte édité n'est jamais remplacé sans confirmation.
- [ ] Rollback restaure une version antérieure avec auteur et date.

## Bloquée par
- Phase 5.

---

## Phase 7 : Factures — ingestion + lecture IA

**User stories** : US-31, US-32, US-33 (+ R5, R11)

### Ce qu'on livre
Téléversement des factures de l'année de référence (gaz naturel + électricité, 12 mois/source). Lecture Claude (vision) proposant par mois (jours, consommation, coût av.tx) + niveau de confiance, **facture affichée à côté** pour vérifier. Correction / saisie manuelle d'un mois illisible ou absent puis confirmation ; seules les données confirmées servent ; un mois sans facture reste « manquant » et n'est **jamais estimé**.

### Critères d'acceptation
- [ ] Upload de 12 factures par source ; la lecture propose valeurs + confiance avec la facture à côté.
- [ ] Un mois corrigé puis confirmé est verrouillé comme source ; un mois manquant reste « manquant ».
- [ ] Taux de valeurs lues exactement mesuré sur le jeu de test.

## Bloquée par
- Phase 1. (Nécessite de vraies factures Énergir/Hydro-Québec pour tester.)

---

## Phase 8 : Section 4 — calculs, tableaux, graphiques, textes

**User stories** : US-34, US-35, US-36, US-37, US-38 (+ R6, R7)

### Ce qu'on livre
Le **code** calcule totaux, moyennes, %, GES, intensités et degrés-jours base 18 °C à partir des données confirmées (R6). 5 tableaux (jamais coupés entre deux pages) + 5 graphiques (A gaz+DJ, B élec+DJ, C énergie empilée+DJ, D anneau coûts, E circulaire énergie ; orange gaz / bleu foncé élec) insérés en images (US-35). Textes à modèle fixe remplis par l'app (intros, phrases d'annonce, 4.3.1/4.3.2) avec avertissement si un chiffre ne correspond plus (US-36/R7). L'IA rédige l'analyse 4.3 à partir des chiffres + notes (US-37). Avertissements non bloquants de cohérence (jours ≠ 365/366, mois manquant/double/mal ordonné, chevauchement, aberrant, total ≠ somme, % ≠ 100, chiffre texte ≠ tableau) (US-38). Exportée dans le Word.

### Critères d'acceptation
- [ ] Reproduit la section 4 du rapport de référence (mêmes valeurs et mise en page) **sans ses erreurs** (367 jours, mois mal nommés au tableau 3, chiffres de texte ≠ tableaux).
- [ ] 5 graphiques aux bonnes couleurs ; 5 tableaux jamais coupés ; source de données unique (un chiffre = une donnée).
- [ ] Avertissements de cohérence s'affichent sans bloquer.

## Bloquée par
- Phase 7 (données confirmées) ; Phases 5–6 (rédaction + cohérence source→texte) ; Phase 2 (export). **Bloqueur externe : formules/normalisation/degrés-jours/facteurs d'émission à obtenir de MT Conseil.**

---

## Phase 9 : Annexe Optima

**User stories** : US-39, US-40

### Ce qu'on livre
Téléversement du PDF Optima ; rendu des pages en **images pleine page**, orientation d'origine, **sans logo ni pied de page MT Conseil** ; vignettes + nombre de pages visibles avant export ; annexe collée telle quelle en dernière partie du Word.

### Critères d'acceptation
- [ ] L'annexe est visuellement identique à l'original ; pas de logo/pied de page MT Conseil sur ces pages.
- [ ] Vignettes et nombre de pages visibles avant l'export.

## Bloquée par
- Phase 2 (pipeline export). (Nécessite un PDF Optima de test.)

---

## Phase 10 : Assemblage final, permissions, checklist & approbation

**User stories** : US-2, US-41 (assemblage complet), US-44, US-45

### Ce qu'on livre
Export d'un `.docx` complet assemblant description + fiches + textes confirmés + section 4 + annexe dans l'ordre du rapport (page titre, TdM, intro, description, systèmes électromécaniques, référence énergétique, améliorations/mesures/conclusion, annexe), avec titres de section vides pour les parties à la main. Checklist pré-export de ce qui manque (fiche brouillon, texte non confirmé, description non confirmée, données non confirmées, PDF Optima absent) empêchant d'exporter du non-confirmé (US-44). Permissions fines par l'admin (qui touche/approuve quoi) (US-2). Approbation admin : approuver/refuser avec commentaires ou correction directe + statut d'approbation visible dans le dossier (US-45).

### Critères d'acceptation
- [ ] Un dossier complet produit un seul `.docx` assemblé dans le bon ordre, numérotation continue sur tout le rapport.
- [ ] La checklist bloque l'export tant qu'un bloc non confirmé reste.
- [ ] L'admin approuve/refuse avec commentaires ; le statut d'approbation s'affiche ; les permissions restreignent les actions.

## Bloquée par
- Phases 3, 4, 6, 8, 9 (tout le contenu exportable).

---

## Vérification (fil conducteur)

- **Par phase** : dérouler la tranche de bout en bout dans l'app déployée (saisie → confirmation → rendu/export), pas seulement les tests.
- **Jalon Phase 2** : ouvrir le `.docx` produit dans Word réel, générer la TdM en un clic, comparer logo/pied de page/styles au modèle MT Conseil → valide le risque n°1 avant d'investir dans le reste.
- **Jalon final** : rejouer le jeu de test complet et comparer le `.docx` au rapport de référence (fiches, description, section 4, annexe) — mêmes valeurs, même mise en page, **sans reproduire ses erreurs** ; vérifier qu'aucun contenu non confirmé ne sort et que tout manque est signalé par « [Information manquante : …] ».
- **Mesures** : taux de lecture des factures (Phase 7) ; temps de production avant/après avec Luis (cible à fixer).
