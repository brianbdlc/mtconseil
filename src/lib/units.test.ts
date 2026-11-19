// Self-check : `node src/lib/units.test.ts`.
import assert from "node:assert/strict";
import { tonnesToKw, pi2ToM2, m3ToGj, gjToKwh, kwhToGj } from "./units.ts";
import { nombreFr, montantFr } from "./format.ts";
import { idLabels } from "./equipmentId.ts";

// tonnes → kW : 1 déc.
assert.equal(tonnesToKw(10), 35.2); // 35,17 → 35,2
assert.equal(tonnesToKw(7.5), 26.4); // 26,3775 → 26,4
assert.equal(tonnesToKw(0), 0);

assert.ok(Math.abs(pi2ToM2(1) - 0.092903) < 1e-9);

// Énergie : gaz m³ → GJ (PCS 37,89 MJ/m³) → kWh équiv. ; élec kWh → GJ.
// 1000 m³ × 37,89 / 1000 = 37,89 GJ ; × 277,7778 = 10 525,00 kWh équiv. (jamais 10,53/m³).
assert.ok(Math.abs(m3ToGj(1000, 37.89) - 37.89) < 1e-9);
assert.ok(Math.abs(gjToKwh(37.89) - 10525.0) < 1e-2);
assert.ok(Math.abs(kwhToGj(1000) - 3.6) < 1e-9); // 1000 kWh = 3,6 GJ

// Formats FR (espace insécable  , virgule décimale).
assert.equal(nombreFr(74134), "74 134");
assert.equal(nombreFr(12.5, 1), "12,5");
assert.equal(nombreFr(null), "n/d");
assert.equal(montantFr(12500.5), "12 500,50 $");

// IDs en plage, continuité (US-9).
assert.deepEqual(idLabels([{ nb_unites: 1 }, { nb_unites: 3 }, { nb_unites: 1 }]), [
  "1",
  "2-3-4",
  "5",
]);
assert.deepEqual(idLabels([{}, { nb_unites: 0 }]), ["1", "2"]); // défaut 1

console.log("units/format/equipmentId OK");
