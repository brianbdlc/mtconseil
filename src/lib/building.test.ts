// Self-check runnable, sans framework : `node src/lib/building.test.ts`.
import assert from "node:assert/strict";
import {
  confirmable,
  ecartZones,
  parseBuildingRow,
  toBuildingColumns,
  EMPTY_BUILDING,
} from "./building.ts";

// Round-trip row → BuildingFields → colonnes.
const bf = parseBuildingRow({
  superficie_brute_totale: "74 134",
  superficie_brute_totale_etat: "valeur",
  gaz: "x",
  gaz_etat: "so",
  fields: {
    zones: [
      { nom: "Atelier", superficie: "50 000", etages: "1", usage: "Production" },
      { nom: "Bureaux", superficie: "24 134", etages: "2", usage: "Administration" },
    ],
    autres_batiment: [{ titre: "Toiture", valeur: "membrane", unite: "" }],
    ecart_voulu: true,
    ecart_note: "Mezzanine non comptée",
  },
});
assert.equal(bf.superficie_brute_totale.valeur, "74 134");
assert.equal(bf.gaz.etat, "so");
assert.equal(bf.zones.length, 2);
assert.equal(bf.zones[0].nom, "Atelier");
assert.equal(bf.autres_batiment[0].titre, "Toiture");
assert.equal(bf.ecart_voulu, true);

const cols = toBuildingColumns(bf);
assert.equal(cols.superficie_brute_totale, "74 134");
assert.equal(cols.gaz, "x"); // valeur conservée même en « so » (comme field.ts)
assert.equal(cols.gaz_etat, "so");
assert.deepEqual((cols.fields as Record<string, unknown>).zones, bf.zones);

// US-21 : confirmable seulement avec une vraie superficie totale.
assert.equal(confirmable(EMPTY_BUILDING), false);
assert.equal(confirmable(bf), true);
assert.equal(
  confirmable({ ...EMPTY_BUILDING, superficie_brute_totale: { valeur: "x", etat: "nd" } }),
  false,
);

// US-20 : écart total vs somme des zones. 74134 = 50000 + 24134 → pas d'écart.
const exact = { ...bf, ecart_voulu: false };
assert.equal(ecartZones(exact).ecart, false);
// Décaler une zone → écart.
const off = {
  ...exact,
  zones: [{ nom: "Z", superficie: "10 000", etages: "", usage: "" }],
};
assert.equal(ecartZones(off).ecart, true);
// « Écart voulu » coché → levé.
assert.equal(ecartZones({ ...off, ecart_voulu: true }).ecart, false);

console.log("building.ts OK");
