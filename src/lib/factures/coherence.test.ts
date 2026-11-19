// Self-check : `node --import tsx src/lib/factures/coherence.test.ts`.
import assert from "node:assert/strict";
import { avertissements } from "./coherence.ts";
import type { FactureNorm } from "./normalize.ts";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const g = (debut: string, fin: string, compteur = "A"): FactureNorm => ({
  source: "gaz", compteur, debut: d(debut), fin: d(fin), consommation: 100, coutAvtx: 100,
});

// Couverture complète de l'année → aucun avertissement.
{
  const fs = Array.from({ length: 12 }, (_, m) =>
    g(
      new Date(Date.UTC(2024, m, 1)).toISOString().slice(0, 10),
      new Date(Date.UTC(2024, m + 1, 0)).toISOString().slice(0, 10),
    ),
  );
  assert.deepEqual(avertissements(fs, 2024), []);
}

// Trou au milieu (mars retiré) → avertissement « trou ».
{
  const fs = Array.from({ length: 12 }, (_, m) =>
    g(
      new Date(Date.UTC(2024, m, 1)).toISOString().slice(0, 10),
      new Date(Date.UTC(2024, m + 1, 0)).toISOString().slice(0, 10),
    ),
  ).filter((_, m) => m !== 2);
  const a = avertissements(fs, 2024);
  assert.ok(a.some((m) => /[Tt]rou/.test(m)), "trou attendu");
}

// Fin de couverture avant le 31 déc (s'arrête en novembre) → avertissement.
{
  const fs = [g("2024-01-01", "2024-11-25")];
  const a = avertissements(fs, 2024);
  assert.ok(a.some((m) => /31 décembre/.test(m)), "non couvert jusqu'au 31 déc attendu");
}

// Début non couvert (commence en février) → avertissement.
{
  const fs = [g("2024-02-01", "2024-12-31")];
  const a = avertissements(fs, 2024);
  assert.ok(a.some((m) => /1er janvier/.test(m)), "non couvert depuis le 1er janvier attendu");
}

// Chevauchement même compteur → avertissement.
{
  const fs = [g("2024-01-01", "2024-01-20"), g("2024-01-15", "2024-02-10")];
  const a = avertissements(fs, 2024);
  assert.ok(a.some((m) => /[Cc]hevauchement/.test(m)), "chevauchement attendu");
}

// Fin avant début → avertissement « ignorée ».
{
  const fs = [g("2024-05-31", "2024-05-01")];
  const a = avertissements(fs, 2024);
  assert.ok(a.some((m) => /ignorée/.test(m)), "fin<début attendu");
}

// Aucune facture → aucun avertissement (écran propre).
assert.deepEqual(avertissements([], 2024), []);

console.log("factures/coherence OK");
