// Avertissements de cohérence sur les périodes facturées (R6). Non bloquants : ils
// signalent un problème de SAISIE sans rien estimer ni corriger. Calculés sur les DATES
// (indépendant des valeurs manquantes, gérées par la normalisation « manquant »).

import type { FactureNorm } from "./normalize";

const DAY = 86_400_000;
const dayNum = (ms: number) => Math.floor(ms / DAY);
const SRC: Record<string, string> = { gaz: "gaz", elec: "électricité" };

/** Messages d'avertissement en français, ordre stable. Vide = rien à signaler. */
export function avertissements(factures: FactureNorm[], annee: number): string[] {
  const out: string[] = [];

  // Fin avant début (par facture) → ignorée du calcul.
  for (const f of factures) {
    if (dayNum(f.fin.getTime()) < dayNum(f.debut.getTime()))
      out.push(`Fin de période avant le début (${SRC[f.source]}) : cette facture est ignorée.`);
  }

  const valides = factures.filter((f) => dayNum(f.fin.getTime()) >= dayNum(f.debut.getTime()));

  for (const source of ["gaz", "elec"] as const) {
    const fs = valides.filter((f) => f.source === source);
    if (!fs.length) continue; // aucune facture pour cette source → pas d'avertissement

    // Chevauchement, par compteur (deux périodes qui se recouvrent).
    const parCompteur = new Map<string, FactureNorm[]>();
    for (const f of fs) {
      const k = f.compteur || "";
      (parCompteur.get(k) ?? parCompteur.set(k, []).get(k)!).push(f);
    }
    for (const liste of parCompteur.values()) {
      const tri = [...liste].sort((a, b) => a.debut.getTime() - b.debut.getTime());
      for (let i = 1; i < tri.length; i++) {
        if (dayNum(tri[i].debut.getTime()) <= dayNum(tri[i - 1].fin.getTime())) {
          out.push(`Chevauchement de périodes (${SRC[source]}) : deux factures se recouvrent.`);
          break;
        }
      }
    }

    // Couverture de l'année de référence (1er jan → 31 déc).
    const d0 = dayNum(Date.UTC(annee, 0, 1));
    const nb = dayNum(Date.UTC(annee, 11, 31)) - d0 + 1;
    const cov = new Array<boolean>(nb).fill(false);
    for (const f of fs) {
      const cs = Math.max(dayNum(f.debut.getTime()), d0);
      const ce = Math.min(dayNum(f.fin.getTime()), d0 + nb - 1);
      for (let d = cs; d <= ce; d++) cov[d - d0] = true;
    }
    const first = cov.indexOf(true);
    const last = cov.lastIndexOf(true);
    if (first === -1) continue; // aucune période ne touche l'année
    if (first > 0)
      out.push(`L'année ${annee} n'est pas couverte depuis le 1er janvier (${SRC[source]}).`);
    if (last < nb - 1)
      out.push(`L'année ${annee} n'est pas couverte jusqu'au 31 décembre (${SRC[source]}).`);
    for (let d = first; d <= last; d++)
      if (!cov[d]) {
        out.push(`Trou de couverture au milieu de l'année (${SRC[source]}) : un ou plusieurs mois manquent.`);
        break;
      }
  }

  return out;
}
