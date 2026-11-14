// Self-check runnable, sans framework : `node src/lib/ai/redaction.test.ts` (ou via tsx).
// (a) détecteur de marqueur [Information manquante] (bloque/débloque la confirmation).
// (b) mapper markdown léger → classe (titre2/titre3/puce/corps/vide).
import assert from "node:assert/strict";
import { aMarqueurManquant } from "./marqueur.ts";
import { classerLigne } from "../docx/redactionMarkdown.ts";

// (a) R5/US-26
assert.equal(aMarqueurManquant("Texte complet, rien à combler."), false);
assert.equal(aMarqueurManquant("Débit [Information manquante : PCM] mesuré."), true);
assert.equal(aMarqueurManquant("[Information manquante]"), true);
assert.equal(aMarqueurManquant(""), false);

// (b) mapper markdown
assert.deepEqual(classerLigne("# Humidification"), { kind: "titre2", texte: "Humidification" });
assert.deepEqual(classerLigne("## Sous-titre"), { kind: "titre3", texte: "Sous-titre" });
assert.deepEqual(classerLigne("- un constat"), { kind: "puce", texte: "un constat" });
assert.deepEqual(classerLigne("Paragraphe normal."), { kind: "corps", texte: "Paragraphe normal." });
assert.equal(classerLigne("   ").kind, "vide");
// « ## » doit l'emporter sur « # » (ordre des tests) :
assert.equal(classerLigne("## x").kind, "titre3");

console.log("redaction OK");
