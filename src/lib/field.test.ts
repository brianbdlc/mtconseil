// Self-check runnable, sans framework : `node src/lib/field.test.ts`.
// (Exclu de tsconfig : type-stripping Node v23.6+, import avec extension .ts.)
import assert from "node:assert/strict";
import { afficher } from "./field.ts";

assert.equal(afficher(undefined), "n/d");
assert.equal(afficher({ valeur: "", etat: "valeur" }), "n/d"); // vide → n/d
assert.equal(afficher({ valeur: "  ", etat: "valeur" }), "n/d"); // blanc → n/d
assert.equal(afficher({ valeur: "x", etat: "nd" }), "n/d"); // nd ignore la valeur
assert.equal(afficher({ valeur: "x", etat: "so" }), "-");
assert.equal(afficher({ valeur: "?", etat: "valeur" }), "?"); // « ? » tel quel
assert.equal(afficher({ valeur: "Trane", etat: "valeur" }), "Trane");
assert.equal(afficher({ valeur: "- ", etat: "valeur" }), "-"); // pas d'espace parasite
assert.equal(afficher({ valeur: "Trane ", etat: "valeur" }), "Trane"); // bout rogné

console.log("field.ts OK");
