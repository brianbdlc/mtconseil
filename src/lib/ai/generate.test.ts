// Self-check : `node --import tsx src/lib/ai/generate.test.ts`.
// Parsing/validation des propositions de lecture facture (Phase 7b, R6 : le code valide
// le format, pas d'appel réseau, pas de calcul). Chiffres fictifs uniquement.
import assert from "node:assert/strict";
import { parseFactureProposition } from "./generate.ts";

// 1. Objet complet et propre.
const p1 = parseFactureProposition(`Voici la lecture :
{"source":{"valeur":"gaz","confiance":"haute"},
 "numero_compteur":{"valeur":"123ABC","confiance":"moyenne"},
 "date_debut":{"valeur":"2024-02-15","confiance":"haute"},
 "date_fin":{"valeur":"2024-03-14","confiance":"haute"},
 "consommation":{"valeur":"1234,5","confiance":"moyenne"},
 "montant_ttc":{"valeur":"987.65","confiance":"basse"},
 "puissance_appelee":{"valeur":null,"confiance":"basse"}}
Fin.`);
assert.ok(p1, "p1 doit parser");
assert.equal(p1!.source.valeur, "gaz");
assert.equal(p1!.date_debut.valeur, "2024-02-15");
assert.equal(p1!.consommation.valeur, "1234,5"); // chaîne telle que lue
assert.equal(p1!.montant_ttc.confiance, "basse");
assert.equal(p1!.puissance_appelee.valeur, null);

// 2. Date non-ISO (JJ/MM/AAAA) → normalisée en AAAA-MM-JJ.
const p2 = parseFactureProposition(`{"source":{"valeur":"elec","confiance":"haute"},
 "numero_compteur":{"valeur":null,"confiance":"basse"},
 "date_debut":{"valeur":"15/02/2024","confiance":"moyenne"},
 "date_fin":{"valeur":"blabla","confiance":"basse"},
 "consommation":{"valeur":"abc","confiance":"basse"},
 "montant_ttc":{"valeur":null,"confiance":"basse"},
 "puissance_appelee":{"valeur":"45","confiance":"haute"}}`);
assert.ok(p2);
assert.equal(p2!.date_debut.valeur, "2024-02-15", "date non-ISO normalisée");
assert.equal(p2!.date_fin.valeur, null, "date illisible → null");
assert.equal(p2!.consommation.valeur, null, "nombre non numérique → null");
assert.equal(p2!.puissance_appelee.valeur, "45");

// 3. source invalide → null ; confiance absente → basse.
const p3 = parseFactureProposition(`{"source":{"valeur":"mazout"},
 "numero_compteur":{},"date_debut":{},"date_fin":{},
 "consommation":{},"montant_ttc":{},"puissance_appelee":{}}`);
assert.ok(p3);
assert.equal(p3!.source.valeur, null, "source hors {gaz,elec} → null");
assert.equal(p3!.source.confiance, "basse", "confiance absente → basse");
assert.equal(p3!.numero_compteur.valeur, null);

// 3b. Le modèle renvoie valeur en NOMBRE et confiance en SCORE 0–1 (shape réelle observée).
const p3b = parseFactureProposition(`\`\`\`json
{"source":{"valeur":"gaz","confiance":0.95},
 "numero_compteur":{"valeur":null,"confiance":0.3},
 "date_debut":{"valeur":"2026-05-15","confiance":0.9},
 "date_fin":{"valeur":"2026-06-15","confiance":0.9},
 "consommation":{"valeur":8722,"confiance":0.6},
 "montant_ttc":{"valeur":5713.53,"confiance":0.4},
 "puissance_appelee":{"valeur":null,"confiance":0.9}}
\`\`\``);
assert.ok(p3b);
assert.equal(p3b!.consommation.valeur, "8722", "nombre → chaîne");
assert.equal(p3b!.montant_ttc.valeur, "5713.53");
assert.equal(p3b!.source.confiance, "haute", "0.95 → haute");
assert.equal(p3b!.consommation.confiance, "moyenne", "0.6 → moyenne");
assert.equal(p3b!.montant_ttc.confiance, "basse", "0.4 → basse");

// 4. Texte sans JSON → null.
assert.equal(parseFactureProposition("aucun objet ici"), null);
assert.equal(parseFactureProposition(`{pas du json}`), null);

console.log("generate.test.ts OK");
