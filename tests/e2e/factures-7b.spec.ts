import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { admin, cleanupProject, seedProject, setEnergySettings } from "./helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

// Phase 7b (US-54) — lecture assistée d'une facture PDF par l'IA, bout en bout.
// Utilise une VRAIE facture Énergir (données client, loi 25) → fixture LOCALE gitignorée
// et appel Claude réel (ANTHROPIC_API_KEY requis). Le test s'ignore si le PDF est absent.
// Créer le PDF : voir docs/reference/ (converti depuis l'image de facture).

const PDF = path.join("tests", "e2e", "fixtures", "facture-energir.local.pdf");
const present = fs.existsSync(PDF) && !!process.env.ANTHROPIC_API_KEY;

test.describe("Factures 7b — lecture PDF assistée (local + IA)", () => {
  test.skip(!present, "PDF local absent ou ANTHROPIC_API_KEY manquante");
  test.setTimeout(150_000); // appel IA réel

  const a: SupabaseClient = admin();
  let projectId = "";
  test.afterEach(async () => {
    if (projectId) await cleanupProject(a, projectId);
    projectId = "";
  });

  test("téléverse un PDF → « Lire la facture (IA) » pré-remplit le brouillon", async ({ page }) => {
    projectId = await seedProject(a, `7b-${Date.now()}`);
    await setEnergySettings(a, projectId, { annee: 2026, pcs: 37.89 });
    // Brouillon vide : la lecture doit le remplir.
    const { data: fac, error } = await a
      .from("factures")
      .insert({ project_id: projectId, position: 0, source: "gaz" })
      .select("id")
      .single();
    if (error) throw error;

    await page.goto(`/dossiers/${projectId}/factures/${fac.id}`);

    // Pas de bouton tant qu'aucun PDF n'est présent.
    await expect(page.getByRole("button", { name: /Lire la facture/ })).toHaveCount(0);

    // Téléversement du PDF (input caché dans FactureFichier).
    await page.locator('input[type="file"]').setInputFiles(PDF);

    // Le bouton apparaît une fois le fichier PDF enregistré.
    const lire = page.getByRole("button", { name: /Lire la facture/ });
    await expect(lire).toBeVisible({ timeout: 30_000 });

    // Lecture IA réelle.
    await lire.click();
    await expect(page.getByRole("button", { name: /Lecture de la facture…/ })).toBeVisible();
    await expect(lire).toBeEnabled({ timeout: 120_000 });

    // Le brouillon est pré-rempli : source gaz + consommation + TTC numériques > 0.
    await expect(page.locator("select")).toHaveValue("gaz");
    const conso = page.getByLabel(/Consommation/);
    const ttc = page.getByLabel(/Montant taxes incluses/);
    const avtx = page.getByLabel(/Montant avant taxes/);

    const num = (s: string) => parseFloat(s.replace(/\s/g, "").replace(",", "."));
    const consoV = num(await conso.inputValue());
    const ttcV = num(await ttc.inputValue());
    const avtxV = num(await avtx.inputValue());
    console.log("[7b] lu par l'IA →", { conso: await conso.inputValue(), ttc: await ttc.inputValue(), avtx: await avtx.inputValue() });

    expect(consoV, "consommation lue").toBeGreaterThan(0);
    expect(ttcV, "TTC lu").toBeGreaterThan(0);
    // av.tx calculé par le code (R6) depuis le TTC, pas lu : ttc / 1,14975.
    expect(Math.abs(avtxV - ttcV / 1.14975), "av.tx = ttc ÷ 1,14975").toBeLessThan(0.02);

    // Rien n'est confirmé/écrit sans action humaine : statut reste brouillon.
    await expect(page.getByText("Brouillon")).toBeVisible();
  });
});
