# PRD — Outil de production de rapports d'audit énergétique (MT Conseil)

## Problème

MT Conseil réalise environ 5 audits énergétiques et 12 plans et devis par année. Un audit rapporte en moyenne environ 25 000 $ et davantage que les plans et devis. Pour chaque audit, un ingénieur visite le bâtiment, saisit des données, puis rédige et met en page un rapport d'environ 75 pages. Selon le directeur (Luis de la Cruz), l'entrée des données prend 1 à 2 jours et la rédaction du rapport final environ 5 jours (« une semaine facile ») ; il refait aussi la mise en page à chaque audit (logo, placement).

Luis n'a jamais refusé d'audit, mais il manque de temps pour prospecter, développer l'entreprise et ses outils. Les rapports contiennent des erreurs de cohérence : un même chiffre diffère d'un endroit à l'autre. Gagner du temps sur la production des audits libérerait du temps pour d'autres projets.

## Solution

Un outil web où l'ingénieur crée un dossier par bâtiment, y saisit ses données (équipements, bâtiment, factures), confirme chaque étape, laisse l'IA rédiger certains textes, puis obtient un rapport Word complet qu'il termine à la main.

Principe central : **l'IA lit et rédige, le code calcule, l'humain confirme.** L'app produit automatiquement les parties répétitives (fiches d'équipement, description du bâtiment, section de consommation, annexe) dans le même gabarit que les rapports existants de MT Conseil, rédige des premiers jets de texte que l'ingénieur modifie et confirme, évite les erreurs de cohérence grâce à une source de données unique et à des vérifications, et livre un fichier Word modifiable que l'ingénieur complète à la main pour ce que l'app ne génère pas encore.

## Utilisateur cible

**Ingénieur** (plusieurs possibles) : employé de MT Conseil qui visite le bâtiment, saisit les données sur le terrain depuis son téléphone (photos, variables), puis finalise le rapport sur ordinateur. Compte individuel. Voit tous les dossiers de la firme, peut modifier le travail des autres et produire un rapport.

**Administrateur** (Luis, le directeur) : fait tout ce que fait l'ingénieur, et en plus crée les comptes, règle les permissions (qui touche et approuve quoi), gère les types de section et leurs instructions de rédaction, gère les valeurs par défaut, et approuve tout rapport. Quand il refuse un rapport, il peut le renvoyer avec des commentaires ou le corriger lui-même.

Contexte d'usage : terrain (téléphone, réseau parfois faible, téléversement de photos) et bureau (ordinateur, finalisation), avec le même compte et les mêmes données.

## User Stories

**Comptes et dossiers**
- US-1 : En tant qu'administrateur, je veux créer les comptes des ingénieurs, afin que personne ne s'inscrive librement.
- US-2 : En tant qu'administrateur, je veux régler les permissions (qui touche et approuve quoi), afin de contrôler qui fait quoi.
- US-3 : En tant qu'utilisateur, je veux me connecter par courriel et mot de passe, afin d'accéder à mes dossiers ; sans connexion je ne vois rien.
- US-4 : En tant qu'ingénieur, je veux créer un dossier avec numéro de projet, nom du client, adresse du client et type de service, afin d'alimenter le pied de page de chaque page du rapport.
- US-5 : En tant qu'ingénieur, je veux voir la liste des dossiers de toute la firme, afin de reprendre ou modifier le travail en cours.

**Fiches d'équipement**
- US-6 : En tant qu'ingénieur, je veux ajouter des équipements un à un, chacun sur une fiche de gabarit fixe sur une nouvelle page, afin de documenter les systèmes électromécaniques.
- US-7 : En tant qu'ingénieur, je veux saisir à la main le titre et le texte d'introduction d'une fiche, afin de nommer et contextualiser l'équipement.
- US-8 : En tant qu'ingénieur, je veux remplir le tableau 1 (ID auto, description, marque/modèle, débit PCM et % air frais, ventilateur, refroidissement, chauffage, humidificateur), afin de décrire l'équipement.
- US-9 : En tant qu'ingénieur, je veux indiquer un nombre d'unités identiques, afin que l'ID affiche la plage (ex. « 17-18-19 ») et que la fiche suivante continue la numérotation.
- US-10 : En tant qu'ingénieur, je veux remplir le tableau 2 (refroidissement, chauffage : type, capacité en kW, efficacité en %), afin de documenter les capacités.
- US-11 : En tant qu'ingénieur, je veux saisir la capacité de refroidissement en tonnes et obtenir les kW calculés, afin de ne pas convertir à la main, tout en pouvant corriger la valeur.
- US-12 : En tant qu'ingénieur, je veux ajouter des lignes « + Autre » (titre, valeur, unité) sous le tableau, afin de documenter des variables non prévues.
- US-13 : En tant qu'ingénieur, je veux cocher un champ chiffré comme « estimé », afin qu'un astérisque et une note apparaissent.
- US-14 : En tant qu'ingénieur, je veux écrire des constats/remarques en puces, afin de commenter l'équipement.
- US-15 : En tant qu'ingénieur, je veux ajouter de 1 à 6 photos par fiche (deux par rangée, titre optionnel, réordonnables, supprimables, tous formats téléphone dont HEIC), afin d'illustrer l'équipement.
- US-16 : En tant qu'ingénieur, je veux un aperçu de la fiche dans le gabarit et un statut brouillon/validée, afin de vérifier avant de valider.

**Description du bâtiment**
- US-17 : En tant qu'ingénieur, je veux remplir une page « Description du bâtiment » en blocs (le bâtiment, zones, alimentation en énergie), afin de décrire le site.
- US-18 : En tant qu'ingénieur, je veux ajouter des zones illimitées (nom, superficie, étages, usage), réordonnables et supprimables, afin de décomposer le bâtiment.
- US-19 : En tant qu'ingénieur, je veux ajouter la photo du bâtiment (Figure 1), afin de l'illustrer.
- US-20 : En tant qu'ingénieur, je veux un avertissement non bloquant si la somme des zones diffère de la superficie totale, afin de repérer un écart (avec case « écart voulu » et note).
- US-21 : En tant qu'ingénieur, je veux confirmer la description (superficie brute totale obligatoire, autres champs remplis ou n/d/« - »), afin qu'elle serve au reste de l'app.

**Rédaction par l'IA**
- US-22 : En tant qu'ingénieur, je veux écrire mes notes de visite par section (une case par section), afin de guider la rédaction.
- US-23 : En tant qu'ingénieur, je veux appuyer sur « J'ai terminé la saisie » et choisir les sections à rédiger (toutes cochées par défaut), afin de lancer la rédaction, en voyant les éléments ignorés faute de confirmation.
- US-24 : En tant qu'ingénieur, je veux que l'IA génère titre, paragraphes, sous-titres et listes à partir des seules données confirmées et de mes notes, afin d'obtenir un premier jet dans le ton MT Conseil.
- US-25 : En tant qu'ingénieur, je veux modifier librement le texte puis le confirmer, afin que le rapport reprenne mon texte tel quel.
- US-26 : En tant qu'ingénieur, je veux voir un marqueur « [Information manquante : …] » et être empêché de confirmer tant qu'il en reste, afin que rien ne soit inventé.
- US-27 : En tant qu'ingénieur, je veux qu'une section passe à « à régénérer » quand une donnée source change, sans que mon texte modifié soit remplacé sans mon accord, afin de garder le contrôle.
- US-28 : En tant qu'ingénieur, je veux qu'une section confirmée affiche « données modifiées depuis la confirmation » et exige une reconfirmation avant export, afin d'éviter les incohérences.
- US-29 : En tant qu'administrateur, je veux ajouter, modifier ou désactiver les types de section (titre, emplacement, instructions de rédaction, case notes, actif/inactif) depuis un écran d'administration sans redéploiement, afin de faire évoluer la rédaction.
- US-30 : En tant qu'administrateur, je veux que chaque modification d'instructions soit historisée avec retour en arrière, afin de revenir à une version antérieure.

**Factures et bilan énergétique (section 4)**
- US-31 : En tant qu'ingénieur, je veux téléverser les factures de l'année de référence (gaz naturel et électricité, 12 mois par source), afin d'alimenter le bilan.
- US-32 : En tant qu'ingénieur, je veux que l'app lise les factures et propose par mois (jours, consommation, coût av.tx) avec un niveau de confiance, la facture affichée à côté, afin de vérifier.
- US-33 : En tant qu'ingénieur, je veux corriger, saisir à la main un mois illisible ou absent et confirmer, afin que seules les données confirmées servent aux calculs ; un mois sans facture reste « manquant » et n'est jamais estimé.
- US-34 : En tant qu'ingénieur, je veux que le code calcule les totaux, moyennes, pourcentages, GES et intensités à partir des données confirmées, afin de produire la section 4.
- US-35 : En tant qu'ingénieur, je veux les cinq tableaux et les cinq graphiques (couleurs orange gaz, bleu foncé électricité), afin d'obtenir la section 4 au style du rapport de référence.
- US-36 : En tant qu'ingénieur, je veux les textes à modèle fixe remplis par l'app (introductions, phrases d'annonce des graphiques, paragraphes 4.3.1/4.3.2), avec avertissement si un chiffre ne correspond plus aux données, afin d'éviter les incohérences.
- US-37 : En tant qu'ingénieur, je veux que l'IA rédige le texte d'analyse du bilan (4.3) à partir des chiffres et de mes notes, afin d'interpréter les données.
- US-38 : En tant qu'ingénieur, je veux des avertissements non bloquants de cohérence (total de jours ≠ 365/366, mois manquant/double/mal ordonné, chevauchement de périodes, valeur aberrante, total ≠ somme, pourcentages ≠ 100 %, chiffre de texte ≠ tableau), afin de repérer les erreurs.

**Annexe Optima**
- US-39 : En tant qu'ingénieur, je veux téléverser le PDF d'Optima et le voir en dernière partie, inchangé (pages en images pleine page, bonne orientation, sans logo ni pied de page MT Conseil), afin d'annexer la simulation.
- US-40 : En tant qu'ingénieur, je veux voir les vignettes et le nombre de pages avant l'export, afin de vérifier l'annexe.

**Assemblage, export et approbation**
- US-41 : En tant qu'ingénieur, je veux exporter un fichier Word (.docx) modifiable assemblant description, fiches, textes confirmés, section 4 et annexe, avec logo, pied de page et numéros de page sur les pages produites, afin d'obtenir le rapport.
- US-42 : En tant qu'ingénieur, je veux de vrais styles de titre Word, légendes et tableaux modifiables, afin de créer la table des matières en un clic et de continuer la numérotation sur tout le rapport.
- US-43 : En tant qu'ingénieur, je veux que l'app insère un titre de section vide pour chaque partie à compléter à la main (page titre, table des matières, introduction, améliorations, mesures, conclusion), afin que la numérotation reste juste.
- US-44 : En tant qu'ingénieur, je veux qu'avant l'export l'app liste ce qui manque (fiche en brouillon, texte non confirmé, description non confirmée, données non confirmées, PDF Optima absent), afin de ne pas exporter de contenu non confirmé.
- US-45 : En tant qu'administrateur, je veux approuver ou refuser un rapport (avec commentaires ou correction directe), et voir le statut d'approbation dans le dossier, afin de contrôler la qualité.

**Transverses**
- US-46 : En tant qu'utilisateur, je veux que chaque bloc ait un statut brouillon/confirmé et que modifier du contenu confirmé le remette à reconfirmer (et marque « à régénérer » ce qui en dépend), afin que seul le confirmé serve.
- US-47 : En tant qu'utilisateur, je veux saisir une valeur, « n/d » ou « - » dans chaque champ (vide s'affiche « n/d », « ? » accepté tel quel), afin de refléter l'état réel de l'information.
- US-48 : En tant qu'utilisateur, je veux que l'app n'enregistre aucune perte de saisie (brouillons enregistrés automatiquement), afin de ne rien perdre.
- US-49 : En tant qu'utilisateur, je veux que les textes et instructions gardent leurs versions précédentes (qui, quand) avec retour en arrière, afin de revenir en arrière.
- US-50 : En tant qu'utilisateur, je veux voir un état de progression pendant les appels à l'IA et la génération du Word, sans écran bloqué, afin de suivre l'avancement.

## Critères de succès

- À partir des données du jeu de test saisies dans l'app, le Word produit reproduit les fiches, la description du bâtiment, la section 4 et l'annexe du rapport de référence, avec les mêmes valeurs et la même mise en page, **sans reproduire ses erreurs** (mois mal nommés au tableau 3, total de 367 jours, chiffres de texte différents des tableaux).
- Les fiches du jeu de test sont reproduites fidèlement : deux photos, une seule photo, débit estimé, trois unités identiques, refroidissement « - ».
- Le fichier Word s'ouvre dans Word sans erreur ; la table des matières se crée en un clic ; les numéros de figure et de tableau continuent sur tout le rapport ; les tableaux sont modifiables ; l'annexe Optima est visuellement identique à l'original.
- Aucun contenu ne sort dans le rapport sans avoir été confirmé par un humain.
- L'IA n'invente rien : tout manque est signalé par un marqueur « [Information manquante : …] » et bloque la confirmation.
- La lecture des factures de test est mesurée (taux de valeurs lues exactement).
- Le temps de production d'un rapport est mesuré avant et après avec Luis (cible chiffrée à définir avec lui).

## Hors périmètre

- Lecture automatique des plaques signalétiques par l'IA (abandonnée ; l'ingénieur saisit les variables à la main).
- Intégration de CompanyCam.
- Calcul de retours sur investissement ou de périodes de récupération (ils viennent d'Optima).
- Lecture, modification ou calcul à partir du contenu d'Optima ; l'app colle seulement son PDF.
- Génération de la page titre, de la table des matières, de l'introduction et des sections « améliorations », « mesures étudiées » et « conclusion » : à la main dans Word.
- Chat ou agent de recherche sur les projets et clients ; pas d'agent autonome.
- PDF produit par l'app (l'ingénieur exporte en PDF depuis Word).
- Modèle d'IA local (à étudier plus tard, loi 25).
- Introduction, table des matières et sommaire exécutif générés par l'IA (ambition future, hors première livraison).

## Décisions d'implémentation

**Règles transversales (toutes les parties)**
- Confirmation (R1) : chaque bloc de données ou de texte a un statut brouillon/confirmé ; seul le confirmé sert aux calculs, à la rédaction, aux vérifications et à l'export. Modifier du confirmé le remet à reconfirmer et marque « à régénérer » ce qui en dépend.
- Trois états de champ (R2) : une valeur, « n/d » (info existe mais non disponible) ou « - » (sans objet). Un champ vide s'affiche « n/d ». Un « ? » saisi est accepté tel quel.
- « + Autre » (R3) : partout où une liste de variables existe, un bouton ajoute une ligne (titre « Autre » par défaut remplaçable, valeur, unité) ; plusieurs lignes possibles.
- « Estimé » (R4) : un champ chiffré peut être coché « estimé » → astérisque à côté de la valeur + ligne de note modifiable en bas (« * Estimé » par défaut).
- Jamais d'invention (R5) : l'IA n'écrit que ce qui est dans les données ou les notes ; information manquante → marqueur « [Information manquante : …] » ; une section avec marqueur ne peut pas être confirmée.
- L'IA ne calcule pas (R6) : tous les calculs sont faits par le code.
- Source de données unique (R7) : un même chiffre vient d'une seule donnée ; les textes à modèle fixe insèrent les chiffres ; l'app signale tout chiffre d'un texte qui diffère de la donnée.
- Numérotation automatique (R8) : numéros de section, de tableau, de figure et d'ID d'équipement générés selon l'ordre d'apparition dans le rapport, recalculés à l'ajout, la suppression ou le déplacement.
- Formats français (R9) : virgule décimale, espace pour les milliers (74 134 pi²), « $ » après le montant, « (av.tx) » pour avant taxes.
- Historique (R10) : textes et instructions gardent leurs versions (qui, quand) avec retour en arrière.
- Téléphone et ordinateur (R11) : même compte, mêmes données ; téléphone pour la saisie terrain (photos, saisie), ordinateur pour la finalisation.
- Confidentialité (R12) : les données clients servent uniquement à produire le rapport remis au client (loi 25).

**Comportements produit spécifiques**
- Authentification par courriel et mot de passe ; comptes créés par l'administrateur seulement (pas d'inscription libre) ; non connecté = rien de visible.
- Dossier : 4 champs (numéro de projet ex. P00000, nom du client, adresse, type de service ex. ÉTUDE ÉNERGÉTIQUE) alimentant le pied de page.
- Fiche d'équipement : gabarit fixe, une nouvelle page par fiche (débordement possible) ; numéro de section auto (3.14, 3.15…) distinct de l'ID d'unité ; légende fixe sous le tableau 2 (DX : Détente directe | EC : eau chaude | ELE : Électricité | ER : Eau refroidie | GN : Gaz naturel) ; si refroidissement/chauffage « - » au tableau 1, la ligne correspondante du tableau 2 est « - » ; conversion tonnes→kW (1 tonne = 3,517 kW, arrondi à 1 décimale), corrigeable.
- Photos : 1 à 6 par fiche, deux par rangée, tous formats téléphone dont HEIC convertis au besoin, réordonnables et supprimables.
- Mise en page identique aux rapports MT Conseil (bandeaux gris, tableaux, bordures), sauf l'ajout des lignes « Autre » ; logo en haut à droite de chaque page produite ; pied de page sur trois lignes (numéro de projet / client / adresse – type de service) + numéro de page à droite.
- Superficies saisies en pi², converties en m² quand un calcul en a besoin (1 pi² = 0,092903 m²).
- Section 4 : cinq tableaux jamais coupés entre deux pages, non modifiés à la main (on corrige la donnée) ; cinq graphiques insérés comme images (A gaz mensuel + degrés-jours ; B électricité mensuelle + degrés-jours ; C énergie totale empilée + degrés-jours ; D anneau des coûts ; E circulaire de l'énergie) ; degrés-jours base 18 °C.
- Annexe Optima : PDF collé tel quel en dernière partie, pages en images pleine page, orientation d'origine, sans logo ni pied de page MT Conseil.
- Export : Word (.docx) modifiable uniquement ; vrais styles Titre 1/2/3 avec numérotation automatique ; légendes et numéros de tableau/figure en champs Word ; tableaux en vrais tableaux Word ; graphiques et photos en images ; titre de section vide inséré pour chaque partie à compléter à la main.
- Ordre du rapport : page titre, table des matières, introduction, description du bâtiment, systèmes électromécaniques (fiches puis textes rédigés), référence énergétique, améliorations/mesures/conclusion, annexe Optima.
- Types de section rédigés au départ : Humidification, Contrôles, Électricité (avec sous-sections), Sommaire du site, Analyse du bilan.
- Sommaire du site : présente le site, sa superficie totale, puis chaque zone avec sa superficie, sans jamais deviner l'usage d'une zone ; la photo suit le texte ; disponible seulement si la description est confirmée.

## Notes complémentaires

**À définir / à obtenir de MT Conseil (bloquant certaines parties)**
- Cible chiffrée du temps de production (à fixer avec Luis).
- Formules de calcul de la section 4, méthode de normalisation de la consommation, source des degrés-jours, facteurs d'émission — fournis pendant la construction (la partie Factures/section 4 en dépend).
- Format réel des factures (probablement PDF) — la lecture automatique doit être testée sur de vraies factures gaz naturel (Énergir) et électricité (Hydro-Québec), 12 mois chacune.
- Moment exact de l'approbation par rapport aux modifications faites à la main dans Word (à définir avec Luis).
- Modèle Word de MT Conseil (polices, couleurs, styles) et logo.
- Exemples de rapports d'audit existants et un PDF d'Optima pour les tests ; notes de visite brutes de Luis pour les sections à rédiger.
- Signification du suffixe de la référence de la page titre.

**Hypothèses**
- L'app appelle une IA (vision comprise) pour lire les factures et rédiger ; le code décide des étapes, l'IA ne décide pas (pas d'agent autonome en première livraison) ; vérification humaine obligatoire sur toute lecture de facture.
- Pas d'entraînement de modèle : amélioration par instructions, exemples, jeux de test et révision humaine. Instructions stockées dans l'app (pas dans le code) et envoyées à chaque requête.

**Risques**
- Une erreur de lecture ou de saisie se propage dans tout le rapport → d'où la confirmation obligatoire à chaque étape et les vérifications de cohérence.
- Un Word construit par programme peut différer de la mise en page MT Conseil → valider tôt avec le modèle Word.
- L'annexe Optima en images alourdit le fichier Word.
- Confidentialité des données clients (loi 25).

**Exclu du PRD (ira dans `docs/PLAN.md` via /planifie)** : plan de livraison T0–T6, pile technique, workflow Git/CI, environnements séparés (local/aperçu/production), exigences de déploiement.
