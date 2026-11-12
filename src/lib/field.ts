// Modèle de champ 3 états (R2), transversal UI + export docx.
// `valeur` : une valeur saisie. `nd` : info existe mais non disponible. `so` : sans objet.
// Vide → affiché « n/d ». « ? » accepté tel quel. `estime` : repoussé Phase 3 (astérisque),
// porté ici pour que le sac jsonb soit stable dès maintenant.

export type Etat = "valeur" | "nd" | "so";
export type Field = { valeur: string; etat: Etat; estime?: boolean };

export const EMPTY_FIELD: Field = { valeur: "", etat: "valeur" };

// Sac de champs 3-états d'une fiche (Phase 2 : cœur du tableau 1). Stocké en jsonb.
export type CardFields = { description: Field; marque_modele: Field };

function oneField(x: unknown): Field {
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    const etat: Etat = o.etat === "nd" || o.etat === "so" ? o.etat : "valeur";
    return {
      valeur: typeof o.valeur === "string" ? o.valeur : "",
      etat,
      estime: o.estime === true,
    };
  }
  return { ...EMPTY_FIELD };
}

/** Lit un `fields jsonb` (inconnu) en CardFields sûr pour l'UI et l'export. */
export function parseCardFields(raw: unknown): CardFields {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    description: oneField(o.description),
    marque_modele: oneField(o.marque_modele),
  };
}

/** Rendu lecture seule d'un champ 3 états (UI + docx). Valeur rognée : pas d'espace
 * parasite en bout (« ? » rogné reste « ? »). */
export function afficher(f?: Field): string {
  if (!f || f.etat === "nd") return "n/d";
  if (f.etat === "so") return "-";
  const v = f.valeur.trim();
  return v === "" ? "n/d" : v;
}
