// Modèle de champ 3 états (R2), transversal UI + export docx.
// `valeur` : une valeur saisie. `nd` : info existe mais non disponible. `so` : sans objet.
// Vide → affiché « n/d ». « ? » accepté tel quel. `estime` (R4) : astérisque à l'affichage.
//
// Phase 3 : les champs fixes vivent en colonnes sur equipment_cards (pas dans `fields`).
// `parseCardFields` lit donc la LIGNE (colonnes + `fields` jsonb pour les listes).
// `toCardColumns` fait le chemin inverse (UI → colonnes + `fields`) : noms de colonnes
// centralisés ici.

export type Etat = "valeur" | "nd" | "so";
export type Field = { valeur: string; etat: Etat; estime?: boolean };

export const EMPTY_FIELD: Field = { valeur: "", etat: "valeur" };

// Ligne de tableau 2 (refroidissement OU chauffage). `tonnes` → kW auto (units.tonnesToKw)
// tant que `kw_manuel=false` ; éditer le kW passe `kw_manuel=true` (R : correction tenue).
export type Ligne2 = {
  type: Field;
  kw: Field;
  kw_manuel: boolean;
  tonnes: string;
  eff: Field;
};

export type Autre = { titre: string; valeur: string; unite: string };

export type CardFields = {
  // Tableau 1
  description: Field;
  marque_modele: Field;
  debit_pcm: Field; // seul champ chiffré estimable du tableau 1
  pct_air_frais: Field;
  ventilateur: Field;
  refroidissement: Field; // code DX/EC/ELE/ER/GN ou « - »
  chauffage: Field;
  humidificateur: Field;
  // Tableau 2
  refroid: Ligne2;
  chauff: Ligne2;
  // Divers
  nb_unites: number; // US-9 : unités identiques
  note_estime: string; // R4 : ligne de note éditable
  autres: Autre[]; // R3 : lignes « + Autre »
  constats: string[]; // US-14 : puces
};

const LIGNE2_EMPTY: Ligne2 = {
  type: { ...EMPTY_FIELD },
  kw: { ...EMPTY_FIELD },
  kw_manuel: false,
  tonnes: "",
  eff: { ...EMPTY_FIELD },
};

export const EMPTY_CARD_FIELDS: CardFields = {
  description: { ...EMPTY_FIELD },
  marque_modele: { ...EMPTY_FIELD },
  debit_pcm: { ...EMPTY_FIELD },
  pct_air_frais: { ...EMPTY_FIELD },
  ventilateur: { ...EMPTY_FIELD },
  refroidissement: { ...EMPTY_FIELD },
  chauffage: { ...EMPTY_FIELD },
  humidificateur: { ...EMPTY_FIELD },
  refroid: { ...LIGNE2_EMPTY },
  chauff: { ...LIGNE2_EMPTY },
  nb_unites: 1,
  note_estime: "* Estimé",
  autres: [],
  constats: [],
};

// --- Lecture (row → CardFields) ---------------------------------------------

// Reconstruit un Field depuis colonnes `<name>` (valeur) + `<name>_etat` (+ `<name>_estime`).
function fieldFromRow(
  row: Record<string, unknown>,
  name: string,
  estimeCol?: string,
): Field {
  const etat = row[`${name}_etat`];
  return {
    valeur: typeof row[name] === "string" ? (row[name] as string) : "",
    etat: etat === "nd" || etat === "so" ? etat : "valeur",
    estime: estimeCol ? row[estimeCol] === true : undefined,
  };
}

function ligne2FromRow(row: Record<string, unknown>, p: string): Ligne2 {
  return {
    type: fieldFromRow(row, `${p}type`),
    kw: fieldFromRow(row, `${p}kw`),
    kw_manuel: row[`${p}kw_manuel`] === true,
    tonnes: typeof row[`${p}tonnes`] === "string" ? (row[`${p}tonnes`] as string) : "",
    eff: fieldFromRow(row, `${p}eff`, `${p}eff_estime`),
  };
}

function oneAutre(x: unknown): Autre {
  const o = (x ?? {}) as Record<string, unknown>;
  return {
    titre: typeof o.titre === "string" ? o.titre : "Autre",
    valeur: typeof o.valeur === "string" ? o.valeur : "",
    unite: typeof o.unite === "string" ? o.unite : "",
  };
}

/** Listes variables depuis `fields` jsonb : `autres` et `constats` (tolérant). */
export function parseAutres(raw: unknown): Autre[] {
  const o = (raw ?? {}) as Record<string, unknown>;
  return Array.isArray(o.autres) ? o.autres.map(oneAutre) : [];
}
export function parseConstats(raw: unknown): string[] {
  const o = (raw ?? {}) as Record<string, unknown>;
  return Array.isArray(o.constats)
    ? o.constats.filter((c): c is string => typeof c === "string")
    : [];
}

/** Lit une ligne equipment_cards (colonnes + `fields` jsonb) en CardFields sûr. */
export function parseCardFields(row: unknown): CardFields {
  const o = (row ?? {}) as Record<string, unknown>;
  const nb = Number(o.nb_unites);
  return {
    description: fieldFromRow(o, "description"),
    marque_modele: fieldFromRow(o, "marque_modele"),
    debit_pcm: fieldFromRow(o, "debit_pcm", "debit_pcm_estime"),
    pct_air_frais: fieldFromRow(o, "pct_air_frais"),
    ventilateur: fieldFromRow(o, "ventilateur"),
    refroidissement: fieldFromRow(o, "refroidissement"),
    chauffage: fieldFromRow(o, "chauffage"),
    humidificateur: fieldFromRow(o, "humidificateur"),
    refroid: ligne2FromRow(o, "t2_refroid_"),
    chauff: ligne2FromRow(o, "t2_chauff_"),
    nb_unites: Number.isFinite(nb) && nb >= 1 ? Math.floor(nb) : 1,
    note_estime: typeof o.note_estime === "string" ? o.note_estime : "* Estimé",
    autres: parseAutres(o.fields),
    constats: parseConstats(o.fields),
  };
}

// --- Écriture (CardFields → colonnes + fields) ------------------------------

function fieldCols(
  name: string,
  f: Field,
  estimeCol?: string,
): Record<string, unknown> {
  const o: Record<string, unknown> = {
    [name]: f.valeur.trim() || null,
    [`${name}_etat`]: f.etat,
  };
  if (estimeCol) o[estimeCol] = f.estime === true;
  return o;
}

function ligne2Cols(p: string, l: Ligne2): Record<string, unknown> {
  return {
    ...fieldCols(`${p}type`, l.type),
    ...fieldCols(`${p}kw`, l.kw),
    [`${p}kw_manuel`]: l.kw_manuel === true,
    [`${p}tonnes`]: l.tonnes.trim() || null,
    ...fieldCols(`${p}eff`, l.eff, `${p}eff_estime`),
  };
}

/** CardFields → { ...colonnes, fields } pour update/confirm (noms de colonnes ici). */
export function toCardColumns(cf: CardFields): Record<string, unknown> {
  return {
    ...fieldCols("description", cf.description),
    ...fieldCols("marque_modele", cf.marque_modele),
    ...fieldCols("debit_pcm", cf.debit_pcm, "debit_pcm_estime"),
    ...fieldCols("pct_air_frais", cf.pct_air_frais),
    ...fieldCols("ventilateur", cf.ventilateur),
    ...fieldCols("refroidissement", cf.refroidissement),
    ...fieldCols("chauffage", cf.chauffage),
    ...fieldCols("humidificateur", cf.humidificateur),
    ...ligne2Cols("t2_refroid_", cf.refroid),
    ...ligne2Cols("t2_chauff_", cf.chauff),
    nb_unites: cf.nb_unites,
    note_estime: cf.note_estime.trim() || null,
    fields: { autres: cf.autres, constats: cf.constats },
  };
}

// --- Affichage ---------------------------------------------------------------

/** Rendu lecture seule d'un champ 3 états (UI + docx). Valeur rognée ; « * » si estimé
 * (R4) et que c'est une vraie valeur. */
export function afficher(f?: Field): string {
  if (!f || f.etat === "nd") return "n/d";
  if (f.etat === "so") return "-";
  const v = f.valeur.trim();
  if (v === "") return "n/d";
  return f.estime ? `${v}*` : v;
}
