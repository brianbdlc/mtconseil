// Self-check : `node --import tsx src/lib/factures/parseDate.test.ts`.
// Analyse de date tapée à la main (R6). Au moins 25 cas, chiffres fictifs uniquement.
import assert from "node:assert/strict";
import { parseDateFr } from "./parseDate.ts";

const REF = 2023; // année de référence fictive du dossier

function ok(input: string, iso: string, enLettres: string, ref = REF) {
  const r = parseDateFr(input, ref);
  assert.ok(r.ok, `attendu OK pour « ${input} », reçu : ${r.ok ? "" : r.erreur}`);
  assert.equal(r.iso, iso, `iso pour « ${input} »`);
  assert.equal(r.enLettres, enLettres, `lettres pour « ${input} »`);
  return r;
}
function ko(input: string, ref: number | null = REF) {
  const r = parseDateFr(input, ref);
  assert.ok(!r.ok, `attendu ERREUR pour « ${input} », reçu OK`);
  return r;
}

// 1-4. ISO et numérique JJ/MM/AAAA avec séparateurs variés.
ok("2024-01-15", "2024-01-15", "15 janvier 2024");
ok("15/02/2024", "2024-02-15", "15 février 2024");
ok("15-02-2024", "2024-02-15", "15 février 2024");
ok("15.02.2024", "2024-02-15", "15 février 2024");

// 5-6. Espaces comme séparateurs ; AAAA en premier via espaces.
ok("15 02 2024", "2024-02-15", "15 février 2024");
ok("2024 03 09", "2024-03-09", "9 mars 2024");

// 7-9. « 1er » et « 1 » ; 1er rendu « 1er ».
ok("1er janvier 2024", "2024-01-01", "1er janvier 2024");
ok("1 janvier 2024", "2024-01-01", "1er janvier 2024");
ok("01/01/2024", "2024-01-01", "1er janvier 2024");

// 10-13. Mois en lettres : accents/casse ignorés, fautes par troncature (un seul match).
ok("15 JANVIER 2024", "2024-01-15", "15 janvier 2024");
ok("3 fevrier 2024", "2024-02-03", "3 février 2024");
ok("20 decembr 2024", "2024-12-20", "20 décembre 2024");
ok("10 janvie 2024", "2024-01-10", "10 janvier 2024");

// 14-16. Préfixes courts qui restent uniques.
ok("5 sept 2024", "2024-09-05", "5 septembre 2024");
ok("5 déc 2024", "2024-12-05", "5 décembre 2024");
ok("5 avr 2024", "2024-04-05", "5 avril 2024");

// 17-19. Abréviations Énergir à 2 lettres.
ok("26 JA 2024", "2024-01-26", "26 janvier 2024");
ok("15 FE 2024", "2024-02-15", "15 février 2024");
ok("9 MR 2024", "2024-03-09", "9 mars 2024");

// 20. Année 2 chiffres → 20xx.
ok("15/02/24", "2024-02-15", "15 février 2024");

// 21-22. Année absente → année de référence, marquée déduite.
{
  const r = ok("15 février", "2023-02-15", "15 février 2023");
  assert.equal(r.anneeDeduite, true);
}
{
  const r = ok("15/02/2024", "2024-02-15", "15 février 2024");
  assert.equal(r.anneeDeduite, false);
}

// 23. Numérique ambigu : toujours JJ/MM (03/04 = 3 avril, pas 4 mars).
ok("03/04/2024", "2024-04-03", "3 avril 2024");

// 24. Date impossible → erreur, rien deviné.
ko("31/02/2024");
ko("31 février 2024");

// 25. Mois ambigu (fuzzy) → erreur qui demande de préciser.
{
  const r = ko("5 ju 2024");
  assert.match(r.erreur, /ambigu/i);
}

// 26-29. Divers invalides / illisibles.
ko("");
ko("bonjour");
ko("45/13/2024"); // jour et mois hors bornes
ko("15 xyz 2024"); // mois inconnu

// 30. Année absente sans référence → erreur claire.
{
  const r = ko("15 février", null);
  assert.match(r.erreur, /[Aa]nnée/);
}

// 31. 29 février valide en année bissextile, invalide sinon.
ok("29/02/2024", "2024-02-29", "29 février 2024");
ko("29/02/2023");

console.log("factures/parseDate OK");
