// Génère un .docx d'exemple avec des données calquées sur docs/reference/fiche-ref-1
// (RT CARRIER 7.5 tonnes), pour vérification visuelle. `npx tsx scripts/gen-sample.ts`.
import fs from "node:fs";
import path from "node:path";
import { buildReport, type ReportCard } from "@/lib/docx/report";

const fx = (n: string) => fs.readFileSync(path.join("tests/e2e/fixtures", n));

const F = (valeur: string, etat: "valeur" | "nd" | "so" = "valeur") => ({ valeur, etat });

// Fiche préalable (pour que la fiche RT CARRIER porte l'ID « 2 » comme la référence).
const prealable = {
  titre: "RT CARRIER | 12.5 TONNES",
  description: "Monobloc au toit avec retour",
  marque_modele: "Carrier 48TJE014",
  debit_pcm: "5000",
  pct_air_frais: "15%",
  ventilateur_etat: "nd",
  refroidissement: "DX",
  chauffage: "GN",
  humidificateur_etat: "so",
  nb_unites: 1,
  t2_refroid_kw: "14",
  t2_refroid_eff_etat: "so",
  t2_chauff_kw: "73",
  t2_chauff_eff: "80",
  fields: { autres: [], constats: ["Le chauffage ne fonctionne pas", "Alimente les bureaux au 2 étage"] },
};

const carrier = {
  titre: "RT CARRIER | 7.5 TONNES",
  description: "Monobloc au toit avec retour",
  marque_modele: "Carrier 48TCED08A2A1A080AO",
  debit_pcm: "3000",
  pct_air_frais: "15%",
  ventilateur_etat: "nd",
  refroidissement: "DX",
  chauffage: "GN",
  humidificateur_etat: "so",
  nb_unites: 1,
  t2_refroid_kw: "14",
  t2_refroid_eff_etat: "so",
  t2_chauff_kw: "53",
  t2_chauff_eff: "82",
  fields: {
    autres: [],
    constats: ["Le chauffage et climatisation ne fonctionne pas", "Alimente les bureaux au 1er étage"],
  },
};

const cards: ReportCard[] = [
  { titre: prealable.titre, intro: null, row: prealable, photos: [] },
  {
    titre: carrier.titre,
    intro: null,
    row: carrier,
    photos: [
      { data: fx("photo1.png"), titre: "Unité 7.5 tonnes" },
      { data: fx("photo2.png"), titre: "Fiche signalétique" },
    ],
  },
];

const project = {
  numero_projet: "P00412",
  client_nom: "Client Fictif",
  client_adresse: "123 rue Test, Montréal",
  type_service: "ÉTUDE ÉNERGÉTIQUE",
};

// `F` évite une variable inutilisée si le modèle change ; ici les colonnes sont brutes.
void F;

async function main() {
  const buf = await buildReport(project, cards);
  fs.mkdirSync("scripts/out", { recursive: true });
  fs.writeFileSync("scripts/out/sample.docx", buf);
  console.log("écrit scripts/out/sample.docx", buf.length, "octets");
}
main();
