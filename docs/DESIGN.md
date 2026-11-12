# Design System — MT Conseil

## Product Context
- **Quoi** : Outil web interne de production de rapports d'audit énergétique. L'ingénieur crée un dossier par bâtiment, y saisit des données denses (fiches d'équipement, factures, zones), confirme chaque bloc, laisse l'IA rédiger des premiers jets, puis exporte un `.docx` qu'il termine à la main.
- **Pour qui** : Ingénieurs de MT Conseil (saisie terrain + finalisation bureau) et l'administrateur (Luis, le directeur) qui approuve les rapports et gère les paramètres.
- **Espace** : Outil métier technique (audit / énergie / ingénierie), cabinet technique québécois. Pile Next.js + Supabase.
- **Type** : Outil interne data-dense (formulaires longs, tableaux fidèles à un gabarit Word, système d'états omniprésent).
- **Memorable thing** : « Sérieux, solide et carré. »

## Aesthetic Direction
- **Direction** : Industrial / Utilitarian raffiné — fonction d'abord, structure visible, zéro décor inutile. L'esthétique d'un instrument de mesure, pas d'un SaaS grand public.
- **Décoration** : Minimal — la typographie et la grille font tout le travail. Pas de grain, pas de texture : un ingénieur fixe cet écran des heures.
- **Mood** : Instrument de précision. Carré, structuré, confiant. On sait toujours ce qui est confirmé et ce qui ne l'est pas.
- **Références** : Aucune (travail à partir de la connaissance design, contraintes de marque fortes fournies par l'utilisateur).

## Typography
- **Display/Hero** : Cabinet Grotesk — géométrique, trapu, « carré ». Un cabinet technique, pas une startup. (Volontairement ni Inter ni Space Grotesk.)
- **Body** : Geist — workhorse honnête, lisible à 12 px, pensé pour les interfaces denses et le français.
- **Data/Tables** : Geist avec `font-variant-numeric: tabular-nums` — chiffres alignés (74 134 pi², 12,50 $, décimales).
- **Code/Valeurs techniques** : Geist Mono — IDs d'équipement (`17-18-19`), n° de projet (`P00412`), valeurs mesurées. Même famille que Geist = cohérence.
- **Loading** : Cabinet Grotesk via Fontshare (`api.fontshare.com`) ; Geist et Geist Mono via Google Fonts. En production Next.js, préférer `next/font` (self-host) pour Geist/Geist Mono et self-host Cabinet Grotesk.
- **Scale** : 12 / 14 / 16 / 20 / 24 / 32 / 40 px (pas de hero géant — c'est un outil, pas une landing).

## Color
- **Approche** : Restrained — la couleur signale, ne décore jamais. L'amber n'apparaît que là où il y a une action ou une attention requise.
- **Primary** : `#F8B436` (amber) — action primaire **et** « attention / à faire » (unifiés : bouton « Confirmer », badge « à régénérer », alerte « données modifiées »). Hover `#E09E1F`, tint de fond `#FEF3DC`.
- **Secondary** : `#142439` (navy quasi-noir) — texte, en-têtes, sidebar, structure, boutons secondaires. Variante claire `#223650`.
- **Neutrals** : `#FFFFFF` → `#F6F7F9` → `#ECEEF2` → `#D7DCE3` → `#AEB6C2` → `#6B7687` → `#3A4556` → `#142439` → `#000000` (gris froids teintés navy, lightest → darkest).
- **Semantic** : success/confirmé `#1C7A52` (tint `#E2F2EA`), warning/à-régénérer `#B57E00` sur tint `#FEF3DC` (famille amber), error/bloquant `#C0392B` (tint `#FBE9E7`), info `#2B5B8C` (tint `#E4EEF6`).
- **Règle de discipline** : amber = « à faire », vert = « fait », rouge = « bloque l'export ». Bouton primaire = amber plein + **texte navy** (blanc sur amber interdit, illisible).
- **Dark mode** : Light-first (outil de jour, terrain + bureau). Tokens prêts pour le dark (navy devient la surface de base, amber reste l'accent, neutres inversés) ; pas une exigence de première livraison.

## Spacing
- **Base** : 4 px.
- **Densité** : Dense mais respirante — tableaux compacts, formulaires confortables, cibles tactiles ≥ 44 px pour la saisie terrain.
- **Scale** : 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)

## Layout
- **Approche** : Grid-disciplined — colonnes strictes, alignement prévisible. App shell : sidebar (navigation du dossier : fiches, bâtiment, factures, annexe) + header (contexte du dossier, utilisateur).
- **Grid** : Desktop 12 colonnes ; formulaires sur 1–2 colonnes ; tableaux pleine largeur. Téléphone : 1 colonne (saisie terrain).
- **Max content width** : ~1200 px pour les formulaires ; tableaux pleine largeur du conteneur.
- **Border radius** : sm:2px, md:4px, lg:6px, full:9999px (carré — jamais de bulle).

## Motion
- **Approche** : Minimal-fonctionnel — uniquement ce qui aide à comprendre un changement d'état (brouillon → confirmé), l'enregistrement automatique, et la barre de progression pendant les appels IA / la génération Word (US-50). Zéro chorégraphie.
- **Easing** : enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration** : micro(50–100ms) court(150–250ms) moyen(250–400ms) long(400–700ms)

## Decisions Log
| Date | Décision | Rationale |
|------|----------|-----------|
| 2026-11-11 | Création initiale | /design — outil interne data-dense d'audit énergétique ; memorable « sérieux, solide et carré » ; marque amber #F8B436 / navy #142439 / accents B&N ; amber unifié action+attention, langage d'états navy/vert/rouge ; Cabinet Grotesk + Geist + Geist Mono ; mockup preview = fiche d'équipement. |
