// Self-check runnable : `npx tsx src/lib/ai/perime.test.ts`.
// Péremption d'une section confirmée (US-27/28) : stable au hash, calculée au rendu.
import assert from "node:assert/strict";
import { sourceHash, estPerime } from "./sourceData.ts";

// Le hash ignore les espaces de bord (identique au prompt qui trim).
assert.equal(sourceHash("abc"), sourceHash("  abc\n"));
assert.notEqual(sourceHash("abc"), sourceHash("abd"));

const h = sourceHash("données v1");

// Brouillon : jamais périmé, même si le hash a changé.
assert.equal(estPerime("brouillon", h, sourceHash("données v2")), false);
// Confirmé + source inchangée : non périmé.
assert.equal(estPerime("confirme", h, sourceHash("données v1")), false);
assert.equal(estPerime("confirme", h, h), false);
// Confirmé + source modifiée : périmé.
assert.equal(estPerime("confirme", h, sourceHash("données v2")), true);
// Legacy (hash NULL) : traité comme non périmé.
assert.equal(estPerime("confirme", null, h), false);
assert.equal(estPerime("confirme", undefined, h), false);

console.log("perime OK");
