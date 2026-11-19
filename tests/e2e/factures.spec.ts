import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  admin,
  cleanupProject,
  seedProject,
  seedFacture,
  setEnergySettings,
} from "./helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

// Phase 7 — Factures : saisie multiple, saisie rapide des dates, normalisation 12 mois.
// CHIFFRES FICTIFS uniquement (loi 25). Les vraies factures Énergir sont dans un test
// local séparé (factures-reelle.spec.ts, fixture gitignorée).

const a: SupabaseClient = admin();
let projectId: string;

test.afterEach(async () => {
  if (projectId) await cleanupProject(a, projectId);
  projectId = "";
});

// --- Helpers UI -------------------------------------------------------------
const norm = (s: string | null) => (s ?? "").replace(/ /g, " ").trim();

async function gotoFactures(page: Page, annee: number | null, pcs = 37.89) {
  projectId = await seedProject(a, `fact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  if (annee != null) await setEnergySettings(a, projectId, { annee, pcs });
  await page.goto(`/dossiers/${projectId}/factures`);
}

async function addRow(page: Page): Promise<Locator> {
  const before = await page.locator("[data-facture-row]").count();
  await page.getByRole("button", { name: "+ Ajouter une facture" }).click();
  await expect(page.locator("[data-facture-row]")).toHaveCount(before + 1);
  return page.locator("[data-facture-row]").nth(before);
}

async function setDate(row: Locator, label: string, text: string) {
  const input = row.getByLabel(label, { exact: true });
  await input.fill(text);
  await input.press("Enter");
}

async function fillRow(
  row: Locator,
  f: { source?: "gaz" | "elec"; compteur?: string; debut: string; fin: string; conso?: string; ttc?: string },
) {
  if (f.source) await row.getByLabel("Source").selectOption(f.source);
  if (f.compteur != null) await row.getByLabel("Compteur").fill(f.compteur);
  await setDate(row, "Début de période", f.debut);
  await setDate(row, "Fin de période", f.fin);
  if (f.conso != null) await row.getByLabel("Consommation").fill(f.conso);
  if (f.ttc != null) await row.getByLabel("Montant taxes incluses").fill(f.ttc);
}

// Aperçu : colonnes 0 Mois,1 gaz m³,2 gaz GJ,3 gaz kWh éq.,4 gaz coût,5 élec kWh,6 élec GJ,7 élec coût.
const C = { gazM3: 1, gazGJ: 2, gazKwh: 3, gazCout: 4, elecKwh: 5, elecGJ: 6, elecCout: 7 };
function moisCell(page: Page, mois: string, col: number): Locator {
  return page.locator(`[data-apercu] [data-mois="${mois}"] td`).nth(col);
}
function totalCell(page: Page, col: number): Locator {
  return page.locator("[data-total] td").nth(col);
}
async function cellText(loc: Locator) {
  return norm(await loc.textContent());
}

// ===========================================================================
test("A1 — facture gaz pleine année : av.tx proposé « calculé », 366 jours, mois normalisés", async ({ page }) => {
  await gotoFactures(page, 2024);
  const row = await addRow(page);
  await fillRow(row, { source: "gaz", compteur: "C1", debut: "2024-01-01", fin: "2024-12-31", conso: "366000", ttc: "1149.75" });

  // Montant av.tx = 1 149,75 ÷ 1,14975 = 1 000,00, marqué « calculé ».
  expect(norm(await row.getByLabel("Montant avant taxes").inputValue())).toBe("1 000,00");
  await expect(row.getByText("calculé")).toBeVisible();

  // 366 jours (2024 bissextile).
  expect(await cellText(row.locator("[data-jours]"))).toBe("366");

  // Normalisation : janvier 31 000 m³, février 29 000 m³, total 366 000, aucun manquant.
  expect(await cellText(moisCell(page, "Jan", C.gazM3))).toBe("31 000");
  expect(await cellText(moisCell(page, "Fév", C.gazM3))).toBe("29 000");
  expect(await cellText(totalCell(page, C.gazM3))).toBe("366 000");
  await expect(page.locator('[data-apercu] [data-mois] td:nth-child(2)').getByText("manquant")).toHaveCount(0);
});

test("A2 — électricité, deux périodes : janvier 45 000 kWh, total 380 000 kWh = 1 368 GJ", async ({ page }) => {
  await gotoFactures(page, 2024);
  const r1 = await addRow(page);
  await fillRow(r1, { source: "elec", compteur: "E1", debut: "2023-12-15", fin: "2024-01-14", conso: "62000" });
  const r2 = await addRow(page);
  await fillRow(r2, { source: "elec", compteur: "E1", debut: "2024-01-15", fin: "2024-12-31", conso: "352000" });

  expect(await cellText(moisCell(page, "Jan", C.elecKwh))).toBe("45 000");
  expect(await cellText(totalCell(page, C.elecKwh))).toBe("380 000");
  expect(await cellText(totalCell(page, C.elecGJ))).toBe("1 368");
  // Décembre 2023 hors de l'année de référence : le tableau n'a que les 12 mois de 2024.
  await expect(page.locator('[data-apercu] [data-mois]')).toHaveCount(12);
});

test("A3 — plusieurs lignes : ajouter 3, modifier la 2e, supprimer la 3e", async ({ page }) => {
  await gotoFactures(page, 2024);
  for (let i = 0; i < 3; i++) {
    const row = await addRow(page);
    await row.getByLabel("Compteur").fill(`C${i + 1}`);
  }
  await expect(page.locator("[data-facture-row]")).toHaveCount(3);

  // Modifier la 2e.
  await page.locator("[data-facture-row]").nth(1).getByLabel("Compteur").fill("C2-modifié");
  await expect(page.locator("[data-facture-row]").nth(1).getByLabel("Compteur")).toHaveValue("C2-modifié");

  // Supprimer la 3e.
  page.once("dialog", (d) => d.accept());
  await page.locator("[data-facture-row]").nth(2).getByRole("button", { name: "Supprimer" }).click();
  await expect(page.locator("[data-facture-row]")).toHaveCount(2);
});

test("A4 — saisie rapide des dates (texte + calendrier), sans envoyer de formulaire", async ({ page }) => {
  await gotoFactures(page, 2024);
  const row = await addRow(page);
  const debut = row.getByLabel("Début de période", { exact: true });

  // « 1er janvie 2024 » + Entrée → 01/01/2024, page inchangée (pas de soumission).
  await debut.fill("1er janvie 2024");
  await debut.press("Enter");
  await expect(debut).toHaveValue("01/01/2024");
  await expect(row.getByText("= 1er janvier 2024")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/dossiers/${projectId}/factures$`));

  // Abréviation Énergir « 15 FE 2024 » → 15/02/2024.
  await debut.fill("15 FE 2024");
  await debut.press("Enter");
  await expect(debut).toHaveValue("15/02/2024");

  // Le calendrier (input date) remplit la même valeur.
  await row.getByLabel("Début de période (calendrier)").fill("2024-03-10");
  await expect(debut).toHaveValue("10/03/2024");

  // Date impossible → message d'erreur, rien deviné.
  await debut.fill("31/02/2024");
  await debut.press("Enter");
  await expect(row.getByText(/n'existe pas/)).toBeVisible();
});

test("A5 — pouvoir calorifique 37,89 → 40 : GJ/kWh éq. changent, m³ inchangés", async ({ page }) => {
  await gotoFactures(page, 2024, 37.89);
  const row = await addRow(page);
  await fillRow(row, { source: "gaz", compteur: "C1", debut: "2024-01-01", fin: "2024-12-31", conso: "366000" });

  const m3Avant = await cellText(moisCell(page, "Jan", C.gazM3));
  const gjAvant = await cellText(moisCell(page, "Jan", C.gazGJ));

  await page.getByLabel("Pouvoir calorifique").fill("40");

  await expect(moisCell(page, "Jan", C.gazGJ)).not.toHaveText(gjAvant);
  expect(await cellText(moisCell(page, "Jan", C.gazM3))).toBe(m3Avant); // m³ inchangés
});

// --- C. Données manquantes / incohérentes (fictif) -------------------------
function moisIso(m: number) {
  return {
    debut: new Date(Date.UTC(2024, m, 1)).toISOString().slice(0, 10),
    fin: new Date(Date.UTC(2024, m + 1, 0)).toISOString().slice(0, 10),
  };
}
async function seedMensuel(projectIdLocal: string, sauf: number[] = []) {
  let pos = 0;
  for (let m = 0; m < 12; m++) {
    if (sauf.includes(m)) continue;
    const { debut, fin } = moisIso(m);
    await seedFacture(a, projectIdLocal, pos++, { source: "gaz", compteur: "C1", debut, fin, conso: 1000 * (m + 1), ttc: 1000 });
  }
}

test("C1 — facture manquante au milieu : trou signalé, mois manquant, autres gardés, rien estimé", async ({ page }) => {
  projectId = await seedProject(a, `c1-${Date.now()}`);
  await setEnergySettings(a, projectId, { annee: 2024 });
  await seedMensuel(projectId, [2]); // mars retiré
  await page.goto(`/dossiers/${projectId}/factures`);

  await expect(moisCell(page, "Mar", C.gazM3)).toHaveText("manquant");
  expect(await cellText(moisCell(page, "Fév", C.gazM3))).toBe("2 000"); // conservé
  await expect(page.getByText(/Trou de couverture/)).toBeVisible();
});

test("C2 — consommation vide : la ligne s'enregistre, mois manquant, pas de plantage", async ({ page }) => {
  await gotoFactures(page, 2024);
  const row = await addRow(page);
  // Pas de consommation saisie.
  await fillRow(row, { source: "gaz", compteur: "C1", debut: "2024-01-01", fin: "2024-12-31", ttc: "1200" });
  await expect(moisCell(page, "Jan", C.gazM3)).toHaveText("manquant");
  await expect(moisCell(page, "Juin", C.gazM3)).toHaveText("manquant");
});

test("C3 — montant taxes vide : coût du mois manquant, consommation gardée, total coût incomplet", async ({ page }) => {
  await gotoFactures(page, 2024);
  const row = await addRow(page);
  await fillRow(row, { source: "gaz", compteur: "C1", debut: "2024-01-01", fin: "2024-12-31", conso: "366000" });
  // Montant av.tx reste vide (aucun total saisi → pas de division).
  expect(norm(await row.getByLabel("Montant avant taxes").inputValue())).toBe("");

  expect(await cellText(moisCell(page, "Jan", C.gazM3))).toBe("31 000"); // conso gardée
  await expect(moisCell(page, "Jan", C.gazCout)).toHaveText("manquant"); // coût manquant
  await expect(totalCell(page, C.gazCout).getByText("(incomplet)")).toBeVisible();
  await expect(totalCell(page, C.gazM3).getByText("(incomplet)")).toHaveCount(0); // conso complète
});

test("C4 — chevauchement de périodes : avertissement", async ({ page }) => {
  projectId = await seedProject(a, `c4-${Date.now()}`);
  await setEnergySettings(a, projectId, { annee: 2024 });
  await seedFacture(a, projectId, 0, { source: "gaz", compteur: "C1", debut: "2024-01-01", fin: "2024-01-20", conso: 1000, ttc: 1000 });
  await seedFacture(a, projectId, 1, { source: "gaz", compteur: "C1", debut: "2024-01-15", fin: "2024-02-10", conso: 1000, ttc: 1000 });
  await page.goto(`/dossiers/${projectId}/factures`);
  await expect(page.getByText(/Chevauchement/)).toBeVisible();
});

test("C5 — fin avant début : erreur, la période ne compte pas (jours —)", async ({ page }) => {
  await gotoFactures(page, 2024);
  const row = await addRow(page);
  await fillRow(row, { source: "gaz", compteur: "C1", debut: "2024-05-31", fin: "2024-05-01", conso: "1000" });
  expect(await cellText(row.locator("[data-jours]"))).toBe("—");
  await expect(page.getByText(/ignorée/)).toBeVisible();
  await expect(moisCell(page, "Mai", C.gazM3)).toHaveText("manquant");
});

test("C6 — début de l'année non couvert : janvier manquant + avertissement", async ({ page }) => {
  projectId = await seedProject(a, `c6-${Date.now()}`);
  await setEnergySettings(a, projectId, { annee: 2024 });
  await seedMensuel(projectId, [0]); // janvier retiré
  await page.goto(`/dossiers/${projectId}/factures`);
  await expect(moisCell(page, "Jan", C.gazM3)).toHaveText("manquant");
  await expect(page.getByText(/1er janvier/)).toBeVisible();
});

test("C7 — aucune facture : écran propre, tous les mois manquant, aucune erreur", async ({ page }) => {
  await gotoFactures(page, 2024);
  await expect(page.getByText("Aucune facture.", { exact: false })).toBeVisible();
  await expect(page.locator('[data-apercu] [data-mois="Jan"] td').nth(C.gazM3)).toHaveText("manquant");
  // 12 mois × 7 colonnes de valeurs (gaz m³/GJ/kWh/coût + élec kWh/GJ/coût), toutes manquant.
  await expect(page.locator('[data-apercu] td', { hasText: "manquant" })).toHaveCount(12 * 7);
});

test("C8 — sans fichier : la ligne se saisit et se confirme à la main", async ({ page }) => {
  await gotoFactures(page, 2024);
  const row = await addRow(page);
  await fillRow(row, { source: "gaz", compteur: "C1", debut: "2024-01-01", fin: "2024-12-31", conso: "366000", ttc: "1149.75" });
  await row.getByRole("button", { name: "Confirmer" }).click();
  await expect(row.getByText("Confirmé")).toBeVisible();
});
