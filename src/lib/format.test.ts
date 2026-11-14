// Self-check runnable, sans framework : `node src/lib/format.test.ts`.
import assert from "node:assert/strict";
import { nombreFr, montantFr, parseNombreFr } from "./format.ts";

const NBSP = " ";

assert.equal(nombreFr(74134), `74${NBSP}134`);
assert.equal(nombreFr(12.5, 1), "12,5");
assert.equal(nombreFr(null), "n/d");
assert.equal(montantFr(12500.5), `12${NBSP}500,50${NBSP}$`);

// parseNombreFr : inverse tolérant (espaces insécables + virgule décimale, R9).
assert.equal(parseNombreFr("74 134"), 74134);
assert.equal(parseNombreFr(`74${NBSP}134`), 74134);
assert.equal(parseNombreFr("1 234,5"), 1234.5);
assert.equal(parseNombreFr(""), null);
assert.equal(parseNombreFr("  "), null);
assert.equal(parseNombreFr("abc"), null);

console.log("format.ts OK");
