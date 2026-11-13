// Self-check runnable, sans framework : `node src/lib/field.test.ts`.
// (Exclu de tsconfig : type-stripping Node v23.6+, import avec extension .ts.)
import assert from "node:assert/strict";
import { afficher, parseCardFields, toCardColumns } from "./field.ts";

assert.equal(afficher(undefined), "n/d");
assert.equal(afficher({ valeur: "", etat: "valeur" }), "n/d"); // vide → n/d
assert.equal(afficher({ valeur: "  ", etat: "valeur" }), "n/d"); // blanc → n/d
assert.equal(afficher({ valeur: "x", etat: "nd" }), "n/d"); // nd ignore la valeur
assert.equal(afficher({ valeur: "x", etat: "so" }), "-");
assert.equal(afficher({ valeur: "?", etat: "valeur" }), "?"); // « ? » tel quel
assert.equal(afficher({ valeur: "Trane", etat: "valeur" }), "Trane");
assert.equal(afficher({ valeur: "- ", etat: "valeur" }), "-"); // pas d'espace parasite
assert.equal(afficher({ valeur: "Trane ", etat: "valeur" }), "Trane"); // bout rogné

// R4 : astérisque si estimé, mais pas sur n/d ni « - ».
assert.equal(afficher({ valeur: "4000", etat: "valeur", estime: true }), "4000*");
assert.equal(afficher({ valeur: "", etat: "nd", estime: true }), "n/d");
assert.equal(afficher({ valeur: "x", etat: "so", estime: true }), "-");

// Round-trip colonnes : UI → colonnes → UI conserve valeur/état/estimé + listes (R2/R3).
const cf = parseCardFields({
  description: "RTU",
  description_etat: "valeur",
  debit_pcm: "4000",
  debit_pcm_etat: "valeur",
  debit_pcm_estime: true,
  refroidissement_etat: "so",
  nb_unites: 3,
  t2_refroid_kw: "35.2",
  t2_refroid_kw_etat: "valeur",
  t2_refroid_kw_manuel: true,
  t2_refroid_tonnes: "10",
  fields: { autres: [{ titre: "Tension", valeur: "600", unite: "V" }], constats: ["Bon état"] },
});
assert.equal(cf.description.valeur, "RTU");
assert.equal(cf.debit_pcm.estime, true);
assert.equal(cf.refroidissement.etat, "so");
assert.equal(cf.nb_unites, 3);
assert.equal(cf.refroid.kw_manuel, true);
assert.equal(cf.refroid.tonnes, "10");
assert.equal(cf.autres[0].unite, "V");
assert.deepEqual(cf.constats, ["Bon état"]);

const cols = toCardColumns(cf);
assert.equal(cols.description, "RTU");
assert.equal(cols.debit_pcm_estime, true);
assert.equal(cols.refroidissement_etat, "so");
assert.equal(cols.t2_refroid_kw_manuel, true);
assert.deepEqual(cols.fields, {
  autres: [{ titre: "Tension", valeur: "600", unite: "V" }],
  constats: ["Bon état"],
});

console.log("field.ts OK");
