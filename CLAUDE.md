# MT Conseil — Outil de rapports d'audit énergétique

## Stack
Next.js (App Router) + Supabase (Auth courriel/mdp, Postgres 17, Storage). Génération `.docx` et appels Claude (Anthropic) **côté serveur uniquement**.

## Documents projet
Toujours lire ces documents avant de coder :
- @docs/PRD.md — pourquoi et quoi du produit
- @docs/PLAN.md — phases d'implémentation et user stories
- @docs/DESIGN.md — système design et direction visuelle

## Système design
Toujours lire DESIGN.md avant toute décision visuelle ou UI.
Polices, couleurs, espacements et direction esthétique y sont définis.
Ne pas dévier sans validation explicite.
En mode QA, signaler tout code qui ne respecte pas DESIGN.md.

## Conventions
- **L'IA lit et rédige, le code calcule, l'humain confirme.** L'IA ne calcule jamais (R6) et n'invente jamais : un manque → marqueur `[Information manquante : …]` qui bloque la confirmation (R5).
- Chaque bloc a un statut brouillon/confirmé ; seul le confirmé sert aux calculs et à l'export. Modifier du confirmé le repasse « à reconfirmer » et marque « à régénérer » ses dépendances (R1).
- Champ à 3 états : une valeur, « n/d » ou « - » ; vide s'affiche « n/d », « ? » accepté tel quel (R2).
- Numéros de section/tableau/figure/ID équipement calculés à l'affichage et à l'export selon l'ordre d'apparition, jamais stockés en dur (R8).
- Formats FR partout : virgule décimale, espace milliers (74 134 pi²), « $ » après le montant, « (av.tx) » (R9).
- **GJ = valeur maîtresse** pour l'énergie : kWh équiv. gaz = GJ × 277,7778 (jamais 10,53 kWh/m³). Degrés-jours **base 18 °C** pour tous.
- **Saisie des factures à la main** = flux principal ; la lecture IA est réservée aux **PDF** (Phase 7b). Pouvoir calorifique Énergir **paramétrable** (défaut provisoire, par dossier dans `energy_settings`).
- Repo : migrations Supabase additives uniquement, projet lié = **DEV**, toute évolution par branche + PR (jamais sur `main`).

## Jargon métier
- **Dossier** : un bâtiment audité (n° projet `P00412`, client, adresse, type de service) ; alimente le pied de page du rapport.
- **Section 4** : bilan énergétique, calculé à partir des **valeurs normalisées** (12 mois civils) confirmées (factures gaz/élec, tableaux + graphiques, degrés-jours base 18 °C).
- **Factures / normalisation** : une facture couvre une **période** (ex. 15 fév. → 14 mars), pas un mois ; normalisée en **12 mois civils au prorata des jours** (consommation + coût), par compteur puis somme ; **pas de normalisation météo**. Montant av.tx = total ÷ **1,14975** (TPS 5 % + TVQ 9,975 %). Un mois sans facture = **« manquant », jamais estimé** ; le rapport n'écrit que les valeurs **normalisées**.
- **Annexe Optima** : PDF d'un logiciel tiers collé tel quel en fin de rapport — jamais lu ni recalculé par l'app.
