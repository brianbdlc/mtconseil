import { test, expect, type Page, type Locator } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { admin, cleanupProject, seedProject, seedFacture, setEnergySettings } from "./helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

// Phase 7 — Test avec les VRAIES données Énergir. La fixture contient des données client
// réelles (loi 25) : fichier LOCAL gitignoré. Le test s'ignore si le fichier est absent.
// Créer tests/e2e/fixtures/facture-reelle.local.json à partir du modèle du PR/README.

type Facture = { debut: string; fin: string; jours: number; conso: number; ttc: number };
type MoisAttendu = { m3: number; cout: number } | "manquant";
type Fixture = {
  annee: number;
  pcs: number;
  compteur: string;
  factures: Facture[];
  attendu: Record<string, MoisAttendu> & { janGJ: number; janKwh: number };
};

const FIXTURE = path.join("tests", "e2e", "fixtures", "facture-reelle.local.json");
const present = fs.existsSync(FIXTURE);
const fixture: Fixture | null = present ? JSON.parse(fs.readFileSync(FIXTURE, "utf8")) : null;

test.describe("Factures réelles Énergir (local seulement)", () => {
  test.skip(!present, "fixture locale absente (tests/e2e/fixtures/facture-reelle.local.json)");

  const a: SupabaseClient = admin();
  let projectId: string;
  test.afterEach(async () => {
    if (projectId) await cleanupProject(a, projectId);
    projectId = "";
  });

  const C = { gazM3: 1, gazGJ: 2, gazKwh: 3, gazCout: 4 };
  function moisCell(page: Page, mois: string, col: number): Locator {
    return page.locator(`[data-apercu] [data-mois="${mois}"] td`).nth(col);
  }
  async function num(loc: Locator): Promise<number> {
    const t = (await loc.textContent()) ?? "";
    return parseFloat(t.replace(/[  ]/g, "").replace(/\$/g, "").replace(",", ".").trim());
  }
  async function seedAll(pid: string, factures: Facture[]) {
    for (let i = 0; i < factures.length; i++) {
      const f = factures[i];
      await seedFacture(a, pid, i, { source: "gaz", compteur: fixture!.compteur, debut: f.debut, fin: f.fin, conso: f.conso, ttc: f.ttc });
    }
  }

  test("B — 13 périodes : jours, m³/coûts mensuels, nov/déc manquant, GJ & kWh éq. janvier", async ({ page }) => {
    const fx = fixture!;
    projectId = await seedProject(a, `reel-${Date.now()}`);
    await setEnergySettings(a, projectId, { annee: fx.annee, pcs: fx.pcs });
    await seedAll(projectId, fx.factures);
    await page.goto(`/dossiers/${projectId}/factures`);

    // Colonne « jours » = jours de la facture.
    const rows = page.locator("[data-facture-row]");
    await expect(rows).toHaveCount(fx.factures.length);
    for (let i = 0; i < fx.factures.length; i++)
      expect(await num(rows.nth(i).locator("[data-jours]"))).toBe(fx.factures[i].jours);

    // Mois normalisés : m³ ±1, coût ±1 $. Nov/Déc manquant.
    for (const [mois, att] of Object.entries(fx.attendu)) {
      if (mois === "janGJ" || mois === "janKwh" || typeof att === "number") continue;
      if (att === "manquant") {
        await expect(moisCell(page, mois, C.gazM3)).toHaveText("manquant");
        continue;
      }
      expect(Math.abs((await num(moisCell(page, mois, C.gazM3))) - att.m3), `m³ ${mois}`).toBeLessThanOrEqual(1);
      expect(Math.abs((await num(moisCell(page, mois, C.gazCout))) - att.cout), `coût ${mois}`).toBeLessThanOrEqual(1);
    }

    // Avertissement : année non couverte jusqu'au 31 décembre.
    await expect(page.getByText(/31 décembre/)).toBeVisible();

    // Janvier : GJ ≈ attendu (±1), kWh éq. = GJ × 277,7778 (tolérance 0,1 %).
    expect(Math.abs((await num(moisCell(page, "Jan", C.gazGJ))) - fx.attendu.janGJ)).toBeLessThanOrEqual(1);
    const kwh = await num(moisCell(page, "Jan", C.gazKwh));
    expect(Math.abs(kwh - fx.attendu.janKwh) / fx.attendu.janKwh).toBeLessThanOrEqual(0.001);
  });

  test("C1 local — facture du milieu retirée (mars/avril) : trou, mois manquant", async ({ page }) => {
    const fx = fixture!;
    projectId = await seedProject(a, `reel-c1-${Date.now()}`);
    await setEnergySettings(a, projectId, { annee: fx.annee, pcs: fx.pcs });
    await seedAll(projectId, fx.factures.filter((_, i) => i !== 5)); // ligne 6 retirée
    await page.goto(`/dossiers/${projectId}/factures`);

    await expect(moisCell(page, "Mar", C.gazM3)).toHaveText("manquant");
    await expect(moisCell(page, "Avr", C.gazM3)).toHaveText("manquant");
    await expect(page.getByText(/Trou de couverture/)).toBeVisible();
    // Aucune estimation : un mois couvert garde sa valeur.
    expect(await num(moisCell(page, "Jan", C.gazM3))).toBeGreaterThan(0);
  });

  test("C6 local — début d'année non couvert (ligne 3 retirée) : janvier manquant", async ({ page }) => {
    const fx = fixture!;
    projectId = await seedProject(a, `reel-c6-${Date.now()}`);
    await setEnergySettings(a, projectId, { annee: fx.annee, pcs: fx.pcs });
    await seedAll(projectId, fx.factures.filter((_, i) => i !== 2)); // ligne 3 retirée
    await page.goto(`/dossiers/${projectId}/factures`);

    await expect(moisCell(page, "Jan", C.gazM3)).toHaveText("manquant");
    await expect(page.getByText(/1er janvier/)).toBeVisible();
  });
});
