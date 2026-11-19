// Self-check : `node --import tsx src/lib/factures/normalize.test.ts`.
// Fixtures aux résultats calculés à la main. Année 2023 (non bissextile).
import assert from "node:assert/strict";
import { normaliser, type FactureNorm } from "./normalize.ts";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const gaz = (
  debut: string,
  fin: string,
  consommation: number,
  coutAvtx: number,
  compteur = "A",
): FactureNorm => ({ source: "gaz", compteur, debut: d(debut), fin: d(fin), consommation, coutAvtx });

// (a) Facture 15 fév → 14 mars (28 j) répartie fév/mars, complétée pour couvrir fév+mars.
//   F_head  : 1-14 fév (14 j)  conso 140  coût 1400 → tout en fév
//   F_strad : 15 fév → 14 mars (28 j) conso 280 coût 2800 → 140/140 conso, 1400/1400 coût
//   F_tail  : 15-31 mars (17 j) conso 170 coût 1700 → tout en mars
//   Fév = 140+140 = 280 conso / 2800 coût ; Mars = 140+170 = 310 / 3100. Autres mois null.
{
  const n = normaliser(
    [
      gaz("2023-02-01", "2023-02-14", 140, 1400),
      gaz("2023-02-15", "2023-03-14", 280, 2800),
      gaz("2023-03-15", "2023-03-31", 170, 1700),
    ],
    2023,
  );
  assert.equal(n.gaz[1].consommation, 280); // février
  assert.equal(n.gaz[1].cout, 2800);
  assert.equal(n.gaz[2].consommation, 310); // mars
  assert.equal(n.gaz[2].cout, 3100);
  assert.equal(n.gaz[0].consommation, null); // janvier non couvert → manquant
  assert.equal(n.gaz[3].consommation, null); // avril non couvert
  assert.deepEqual(
    n.elec.map((m) => m.consommation),
    Array(12).fill(null),
  ); // aucune facture élec
}

// (b) 12 factures mensuelles pile → mois = valeur facture, 0 manquant.
{
  const factures = Array.from({ length: 12 }, (_, m) =>
    gaz(
      new Date(Date.UTC(2023, m, 1)).toISOString().slice(0, 10),
      new Date(Date.UTC(2023, m + 1, 0)).toISOString().slice(0, 10),
      100 * (m + 1),
      10 * (m + 1),
    ),
  );
  const n = normaliser(factures, 2023);
  for (let m = 0; m < 12; m++) {
    assert.equal(n.gaz[m].consommation, 100 * (m + 1));
    assert.equal(n.gaz[m].cout, 10 * (m + 1));
  }
}

// (c) Trou d'un mois (février retiré) → février null, les autres gardent leur valeur.
{
  const factures = Array.from({ length: 12 }, (_, m) =>
    gaz(
      new Date(Date.UTC(2023, m, 1)).toISOString().slice(0, 10),
      new Date(Date.UTC(2023, m + 1, 0)).toISOString().slice(0, 10),
      100 * (m + 1),
      10 * (m + 1),
    ),
  ).filter((_, m) => m !== 1);
  const n = normaliser(factures, 2023);
  assert.equal(n.gaz[1].consommation, null); // février manquant
  assert.equal(n.gaz[0].consommation, 100); // janvier intact
  assert.equal(n.gaz[2].consommation, 300); // mars intact
}

// Garde-fou : fin < debut → facture ignorée (n'empêche pas, ne compte pas).
{
  const n = normaliser([gaz("2023-05-31", "2023-05-01", 999, 999)], 2023);
  assert.equal(n.gaz[4].consommation, null); // mai reste manquant
}

// (C3) Couverture par métrique : coût absent (null) → coût manquant, conso conservée.
{
  const n = normaliser(
    [
      { source: "gaz", compteur: "A", debut: d("2023-04-01"), fin: d("2023-04-30"), consommation: 300, coutAvtx: null },
    ],
    2023,
  );
  assert.equal(n.gaz[3].consommation, 300); // avril conso OK (mois couvert)
  assert.equal(n.gaz[3].cout, null); // avril coût manquant (aucune facture ne le fournit)
}

// (C2) Consommation absente (null) → conso manquante, coût conservé, indépendamment.
{
  const n = normaliser(
    [
      { source: "gaz", compteur: "A", debut: d("2023-04-01"), fin: d("2023-04-30"), consommation: null, coutAvtx: 1200 },
    ],
    2023,
  );
  assert.equal(n.gaz[3].consommation, null);
  assert.equal(n.gaz[3].cout, 1200);
}

console.log("factures/normalize OK");
