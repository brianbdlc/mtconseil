// Normalisation des factures en 12 mois civils (R6 : le code calcule). Une facture couvre
// une PÉRIODE (ex. 15 fév → 14 mars), pas un mois ; on répartit sa consommation et son coût
// au prorata des JOURS sur les mois civils de l'année de référence. Par source (gaz/élec) ;
// le groupage par compteur ne change pas le total mensuel (somme associative).
//
// Couverture PAR MÉTRIQUE (C3) : un mois a une consommation seulement si TOUS ses jours
// sont couverts par des factures ayant une consommation ; idem pour le coût, indépendamment.
// Un jour non couvert, ou couvert par une facture sans la valeur → « manquant » (null).
// Jamais estimé.

export type FactureNorm = {
  source: "gaz" | "elec";
  compteur: string;
  debut: Date;
  fin: Date;
  consommation: number | null;
  coutAvtx: number | null;
};

/** Un mois normalisé : valeur, ou null = « manquant ». conso et coût indépendants. */
export type MoisNorm = { consommation: number | null; cout: number | null };

/** 12 mois (jan→déc) par source. */
export type Normalisation = { gaz: MoisNorm[]; elec: MoisNorm[] };

const DAY = 86_400_000;
/** Numéro de jour absolu d'un instant UTC-minuit (pour des `date` sans heure). */
const dayNum = (ms: number) => Math.floor(ms / DAY);

function normaliserSource(
  factures: FactureNorm[],
  source: "gaz" | "elec",
  annee: number,
): MoisNorm[] {
  // fin < debut → facture ignorée (garde-fou ; l'avertissement de cohérence est ailleurs).
  const fs = factures.filter(
    (f) => f.source === source && dayNum(f.fin.getTime()) >= dayNum(f.debut.getTime()),
  );

  const d0 = dayNum(Date.UTC(annee, 0, 1));
  const nbJoursAnnee = dayNum(Date.UTC(annee, 11, 31)) - d0 + 1;
  const covConso = new Array<boolean>(nbJoursAnnee).fill(false);
  const covCout = new Array<boolean>(nbJoursAnnee).fill(false);
  const conso = new Array<number>(12).fill(0);
  const cout = new Array<number>(12).fill(0);

  for (const f of fs) {
    const db = dayNum(f.debut.getTime());
    const fn = dayNum(f.fin.getTime());
    const joursTotaux = fn - db + 1; // inclusif
    const cs = Math.max(db, d0);
    const ce = Math.min(fn, d0 + nbJoursAnnee - 1);
    const hasConso = f.consommation != null;
    const hasCout = f.coutAvtx != null;
    for (let d = cs; d <= ce; d++) {
      if (hasConso) covConso[d - d0] = true;
      if (hasCout) covCout[d - d0] = true;
    }
    for (let m = 0; m < 12; m++) {
      const ms = dayNum(Date.UTC(annee, m, 1));
      const me = dayNum(Date.UTC(annee, m + 1, 0));
      const ov = Math.min(fn, me) - Math.max(db, ms) + 1;
      if (ov <= 0) continue;
      const part = ov / joursTotaux;
      if (hasConso) conso[m] += part * f.consommation!;
      if (hasCout) cout[m] += part * f.coutAvtx!;
    }
  }

  const complet = (cov: boolean[], ms: number, me: number) => {
    for (let d = ms; d <= me; d++) if (!cov[d - d0]) return false;
    return true;
  };

  return Array.from({ length: 12 }, (_, m) => {
    const ms = dayNum(Date.UTC(annee, m, 1));
    const me = dayNum(Date.UTC(annee, m + 1, 0));
    return {
      consommation: complet(covConso, ms, me) ? conso[m] : null,
      cout: complet(covCout, ms, me) ? cout[m] : null,
    };
  });
}

export function normaliser(factures: FactureNorm[], annee: number): Normalisation {
  return {
    gaz: normaliserSource(factures, "gaz", annee),
    elec: normaliserSource(factures, "elec", annee),
  };
}
