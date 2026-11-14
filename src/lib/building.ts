// Modèle de données « Description du bâtiment » (Phase 4), miroir de field.ts.
// Champs fixes 3 états (R2) en colonnes <nom>/<nom>_etat ; listes (zones, « + Autre »)
// + écart dans `fields` jsonb. 1 ligne par dossier.

import { EMPTY_FIELD, type Autre, type Field } from "./field";
import { parseNombreFr } from "./format";

// Zone : chaînes simples (comme les lignes « Autre »), pas de 3 états (US-18).
export type Zone = { nom: string; superficie: string; etages: string; usage: string };

export type BuildingFields = {
  // Bloc « Le bâtiment »
  superficie_brute_totale: Field; // pi², obligatoire pour confirmer (US-21)
  annee_construction: Field;
  nombre_etages: Field;
  type_construction: Field;
  usage_principal: Field;
  // Bloc « Alimentation en énergie »
  elec: Field;
  gaz: Field;
  // Listes
  zones: Zone[];
  autres_batiment: Autre[];
  autres_energie: Autre[];
  // Écart (US-20)
  ecart_voulu: boolean;
  ecart_note: string;
};

const FIXED = [
  "superficie_brute_totale",
  "annee_construction",
  "nombre_etages",
  "type_construction",
  "usage_principal",
  "elec",
  "gaz",
] as const;

export const EMPTY_BUILDING: BuildingFields = {
  superficie_brute_totale: { ...EMPTY_FIELD },
  annee_construction: { ...EMPTY_FIELD },
  nombre_etages: { ...EMPTY_FIELD },
  type_construction: { ...EMPTY_FIELD },
  usage_principal: { ...EMPTY_FIELD },
  elec: { ...EMPTY_FIELD },
  gaz: { ...EMPTY_FIELD },
  zones: [],
  autres_batiment: [],
  autres_energie: [],
  ecart_voulu: false,
  ecart_note: "",
};

// --- Lecture (row → BuildingFields) -----------------------------------------

function fieldFromRow(row: Record<string, unknown>, name: string): Field {
  const etat = row[`${name}_etat`];
  return {
    valeur: typeof row[name] === "string" ? (row[name] as string) : "",
    etat: etat === "nd" || etat === "so" ? etat : "valeur",
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
function autresFrom(raw: unknown, key: string): Autre[] {
  const o = (raw ?? {}) as Record<string, unknown>;
  return Array.isArray(o[key]) ? (o[key] as unknown[]).map(oneAutre) : [];
}
function oneZone(x: unknown): Zone {
  const o = (x ?? {}) as Record<string, unknown>;
  const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
  return { nom: s("nom"), superficie: s("superficie"), etages: s("etages"), usage: s("usage") };
}

/** Lit une ligne building_description (colonnes + `fields` jsonb) en BuildingFields sûr. */
export function parseBuildingRow(row: unknown): BuildingFields {
  const o = (row ?? {}) as Record<string, unknown>;
  const f = (o.fields ?? {}) as Record<string, unknown>;
  const out = { ...EMPTY_BUILDING };
  for (const name of FIXED) out[name] = fieldFromRow(o, name);
  return {
    ...out,
    zones: Array.isArray(f.zones) ? (f.zones as unknown[]).map(oneZone) : [],
    autres_batiment: autresFrom(o.fields, "autres_batiment"),
    autres_energie: autresFrom(o.fields, "autres_energie"),
    ecart_voulu: f.ecart_voulu === true,
    ecart_note: typeof f.ecart_note === "string" ? f.ecart_note : "",
  };
}

// --- Écriture (BuildingFields → colonnes + fields) --------------------------

/** BuildingFields → { ...colonnes, fields } pour upsert. */
export function toBuildingColumns(bf: BuildingFields): Record<string, unknown> {
  const cols: Record<string, unknown> = {};
  for (const name of FIXED) {
    cols[name] = bf[name].valeur.trim() || null;
    cols[`${name}_etat`] = bf[name].etat;
  }
  cols.fields = {
    zones: bf.zones,
    autres_batiment: bf.autres_batiment,
    autres_energie: bf.autres_energie,
    ecart_voulu: bf.ecart_voulu,
    ecart_note: bf.ecart_note,
  };
  return cols;
}

/** Photos du bâtiment : zippe photo_paths + photo_titles (index alignés), avec repli
 * sur l'ancienne colonne photo_path. Ordre préservé. */
export function buildingPhotos(row: unknown): { path: string; titre: string }[] {
  const o = (row ?? {}) as Record<string, unknown>;
  const paths = Array.isArray(o.photo_paths) ? (o.photo_paths as string[]) : [];
  const titles = Array.isArray(o.photo_titles) ? (o.photo_titles as string[]) : [];
  if (paths.length) return paths.map((path, i) => ({ path, titre: titles[i] ?? "" }));
  return typeof o.photo_path === "string" && o.photo_path ? [{ path: o.photo_path, titre: "" }] : [];
}

// --- Règles métier -----------------------------------------------------------

/** US-21 : confirmable seulement si la superficie brute totale a une vraie valeur. */
export function confirmable(bf: BuildingFields): boolean {
  const f = bf.superficie_brute_totale;
  return f.etat === "valeur" && f.valeur.trim() !== "";
}

/** US-20 : compare superficie totale et somme des zones (FR). `ecart` vrai si elles
 * diffèrent (tolérance 0,5 pi²) ET qu'« écart voulu » n'est pas coché. */
export function ecartZones(bf: BuildingFields): {
  total: number | null;
  somme: number | null;
  ecart: boolean;
} {
  const total = parseNombreFr(bf.superficie_brute_totale.valeur);
  const parts = bf.zones
    .map((z) => parseNombreFr(z.superficie))
    .filter((n): n is number => n !== null);
  const somme = parts.length ? parts.reduce((a, b) => a + b, 0) : null;
  const ecart =
    !bf.ecart_voulu &&
    total !== null &&
    somme !== null &&
    Math.abs(total - somme) > 0.5;
  return { total, somme, ecart };
}
