// Sérialise en texte lisible les données CONFIRMÉES d'un dossier (bâtiment + fiches)
// pour nourrir le prompt de rédaction (R5 : l'IA ne voit que le confirmé). Réutilise
// les helpers d'affichage existants — une source unique par valeur (R7).

import { createHash } from "crypto";
import { afficher, parseCardFields } from "@/lib/field";
import { parseBuildingRow } from "@/lib/building";
import { idLabels } from "@/lib/equipmentId";
import { nombreFr, montantFr } from "@/lib/format";
import { m3ToGj, gjToKwh, kwhToGj } from "@/lib/units";
import type { Normalisation } from "@/lib/factures/normalize";

export function batimentTexte(row: unknown): string {
  const bf = parseBuildingRow(row);
  const L: string[] = ["# Description du bâtiment"];
  L.push(`Superficie brute totale (pi²) : ${afficher(bf.superficie_brute_totale)}`);
  L.push(`Année de construction : ${afficher(bf.annee_construction)}`);
  L.push(`Nombre d'étages : ${afficher(bf.nombre_etages)}`);
  L.push(`Type de construction : ${afficher(bf.type_construction)}`);
  L.push(`Usage principal : ${afficher(bf.usage_principal)}`);
  for (const a of bf.autres_batiment)
    L.push(`${a.titre.trim() || "Autre"} : ${a.valeur.trim() || "n/d"}${a.unite.trim() ? ` ${a.unite.trim()}` : ""}`);
  L.push(`Électricité : ${afficher(bf.elec)}`);
  L.push(`Gaz : ${afficher(bf.gaz)}`);
  for (const a of bf.autres_energie)
    L.push(`${a.titre.trim() || "Autre"} : ${a.valeur.trim() || "n/d"}${a.unite.trim() ? ` ${a.unite.trim()}` : ""}`);
  if (bf.zones.length) {
    L.push("Zones :");
    for (const z of bf.zones)
      L.push(`- ${z.nom.trim() || "n/d"} — superficie ${z.superficie.trim() || "n/d"} pi², étages ${z.etages.trim() || "n/d"}, usage ${z.usage.trim() || "n/d"}`);
  }
  return L.join("\n");
}

type CardRow = { titre?: string | null; intro?: string | null } & Record<string, unknown>;

export function fichesTexte(rows: CardRow[]): string {
  if (!rows.length) return "";
  const parsed = rows.map((r) => parseCardFields(r));
  const labels = idLabels(parsed);
  const out: string[] = ["# Fiches d'équipement"];
  rows.forEach((r, i) => {
    const f = parsed[i];
    out.push(`## ${r.titre?.trim() || "Sans titre"} (ID ${labels[i]})`);
    if (r.intro?.trim()) out.push(r.intro.trim());
    out.push(`Description : ${afficher(f.description)}`);
    out.push(`Marque / modèle : ${afficher(f.marque_modele)}`);
    out.push(`Débit (PCM) : ${afficher(f.debit_pcm)} ; air frais : ${afficher(f.pct_air_frais)}`);
    out.push(`Ventilateur : ${afficher(f.ventilateur)}`);
    out.push(`Refroidissement : ${afficher(f.refroidissement)} (capacité ${afficher(f.refroid.kw)} kW, efficacité ${afficher(f.refroid.eff)}%)`);
    out.push(`Chauffage : ${afficher(f.chauffage)} (capacité ${afficher(f.chauff.kw)} kW, efficacité ${afficher(f.chauff.eff)}%)`);
    out.push(`Humidificateur : ${afficher(f.humidificateur)}`);
    for (const a of f.autres)
      out.push(`${a.titre.trim() || "Autre"} : ${a.valeur.trim() || "n/d"}${a.unite.trim() ? ` ${a.unite.trim()}` : ""}`);
    const constats = f.constats.filter((c) => c.trim());
    if (constats.length) {
      out.push("Constats / remarques :");
      for (const c of constats) out.push(`- ${c.trim()}`);
    }
  });
  return out.join("\n");
}

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

/**
 * Sérialise les 12 mois NORMALISÉS (conso + coût + GJ + kWh équiv.), gaz et élec —
 * c'est cette valeur normalisée (pas les factures brutes) qui nourrit le prompt et
 * entre dans l'empreinte de péremption. « manquant » pour les mois non couverts.
 */
export function facturesTexte(norm: Normalisation, pcsMjM3: number): string {
  const L: string[] = ["# Bilan énergétique — valeurs normalisées (12 mois civils)"];
  L.push(`Pouvoir calorifique : ${nombreFr(pcsMjM3, 2)} MJ/m³`);
  // conso et coût « manquant » indépendamment (C3).
  const coutTxt = (c: number | null) => (c == null ? "manquant" : `${montantFr(c)} (av.tx)`);
  L.push("## Gaz (m³ → GJ → kWh équiv.)");
  norm.gaz.forEach((m, i) => {
    const consoTxt =
      m.consommation == null
        ? "manquant"
        : `${nombreFr(m.consommation, 1)} m³ = ${nombreFr(m3ToGj(m.consommation, pcsMjM3), 2)} GJ = ${nombreFr(gjToKwh(m3ToGj(m.consommation, pcsMjM3)), 0)} kWh équiv.`;
    L.push(`- ${MOIS[i]} : ${consoTxt} ; coût ${coutTxt(m.cout)}`);
  });
  L.push("## Électricité (kWh → GJ)");
  norm.elec.forEach((m, i) => {
    const consoTxt =
      m.consommation == null
        ? "manquant"
        : `${nombreFr(m.consommation, 0)} kWh = ${nombreFr(kwhToGj(m.consommation), 2)} GJ`;
    L.push(`- ${MOIS[i]} : ${consoTxt} ; coût ${coutTxt(m.cout)}`);
  });
  return L.join("\n");
}

/** Texte des données confirmées d'un dossier : bâtiment (si confirmé) + fiches confirmées. */
export function sourceData(opts: {
  building: unknown | null;
  cards: CardRow[];
  facturesTexte?: string;
}): string {
  const parts: string[] = [];
  if (opts.building) parts.push(batimentTexte(opts.building));
  const fiches = fichesTexte(opts.cards);
  if (fiches) parts.push(fiches);
  if (opts.facturesTexte) parts.push(opts.facturesTexte);
  return parts.join("\n\n") || "(aucune donnée confirmée)";
}

/** Empreinte des données sources (SERVEUR). Sur `donnees.trim()`, identique au prompt. */
export function sourceHash(donnees: string): string {
  return createHash("sha256").update(donnees.trim()).digest("hex");
}

/**
 * Péremption (US-27/28) calculée à l'affichage : une section confirmée est « à régénérer »
 * si son empreinte de confirmation diffère de l'empreinte courante. NULL ⇒ non périmé (legacy).
 */
export function estPerime(
  statut: string,
  hashConfirme: string | null | undefined,
  hashCourant: string,
): boolean {
  return statut === "confirme" && !!hashConfirme && hashConfirme !== hashCourant;
}
