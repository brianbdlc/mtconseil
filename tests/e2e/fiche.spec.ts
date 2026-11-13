import { test, expect } from "@playwright/test";
import {
  admin,
  cleanupProject,
  seedProject,
  seedCard,
  setField,
  setFieldEtat,
} from "./helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

const a: SupabaseClient = admin();
let projectId: string;

test.afterEach(async () => {
  if (projectId) await cleanupProject(a, projectId);
});

async function savedOk(page: import("@playwright/test").Page) {
  await expect(page.getByText("Enregistré")).toBeVisible();
}

// Attend la persistance réelle en base (l'indicateur « Enregistré » peut déjà être
// visible d'une sauvegarde précédente → insuffisant avant un rechargement).
async function expectPersistedRow(cardId: string, match: Record<string, unknown>) {
  await expect
    .poll(async () => {
      const { data } = await a
        .from("equipment_cards")
        .select(Object.keys(match).join(","))
        .eq("id", cardId)
        .single();
      return data;
    })
    .toMatchObject(match);
}

test("tonnes → kW auto, correction manuelle persistée après rechargement", async ({ page }) => {
  projectId = await seedProject(a, `kw-${Date.now()}`);
  const cardId = await seedCard(a, projectId, 0);
  await page.goto(`/dossiers/${projectId}/fiches/${cardId}`);

  const refroid = page.locator('[data-l2="Refroidissement"]');
  const kw = refroid.locator('[data-field="Capacité (kW)"]').getByRole("textbox");

  // Saisie tonnes → kW calculé (1 tonne = 3,517 kW, 1 déc. → 10 t = 35,2 kW).
  await refroid.getByPlaceholder("ex. 10").fill("10");
  await expect(kw).toHaveValue("35,2");
  await savedOk(page);

  // Correction manuelle du kW → fige la valeur (kw_manuel).
  await kw.fill("40");
  await savedOk(page);

  // Modifier les tonnes ne doit plus écraser le kW corrigé.
  await refroid.getByPlaceholder("ex. 10").fill("7.5");
  await expect(kw).toHaveValue("40");

  // Attendre la persistance réelle en base (autosave débouncé) avant de recharger.
  await expect
    .poll(async () => {
      const { data } = await a
        .from("equipment_cards")
        .select("t2_refroid_kw, t2_refroid_kw_manuel, t2_refroid_tonnes")
        .eq("id", cardId)
        .single();
      return data;
    })
    .toMatchObject({ t2_refroid_kw: "40", t2_refroid_kw_manuel: true, t2_refroid_tonnes: "7.5" });

  // Persistance après rechargement.
  await page.reload();
  await expect(page.locator('[data-l2="Refroidissement"]').locator('[data-field="Capacité (kW)"]').getByRole("textbox")).toHaveValue("40");
  await expect(page.locator('[data-l2="Refroidissement"]').getByPlaceholder("ex. 10")).toHaveValue("7.5");
});

test("refroidissement « - » met la ligne du tableau 2 à « - »", async ({ page }) => {
  projectId = await seedProject(a, `so-${Date.now()}`);
  const cardId = await seedCard(a, projectId, 0);
  await page.goto(`/dossiers/${projectId}/fiches/${cardId}`);

  // Par défaut la ligne refroidissement est éditable.
  await expect(page.locator('[data-l2="Refroidissement"]:not([data-l2-so])')).toBeVisible();

  // Passer le code refroidissement (tableau 1) à « - » (sans objet).
  await setFieldEtat(page, "Refroidissement (code)", "-");

  // La ligne tableau 2 devient « - » et se verrouille.
  const soLine = page.locator('[data-l2="Refroidissement"][data-l2-so="1"]');
  await expect(soLine).toBeVisible();
  await expect(soLine).toContainText("-");
  // Plus de champ éditable pour cette ligne.
  await expect(page.locator('[data-l2="Refroidissement"] [data-field="Capacité (kW)"]')).toHaveCount(0);
  await savedOk(page);

  await page.reload();
  await expect(page.locator('[data-l2="Refroidissement"][data-l2-so="1"]')).toBeVisible();
});

test("3 unités identiques : ID en plage, continuité, renumérotation après suppression", async ({ page }) => {
  projectId = await seedProject(a, `id-${Date.now()}`);
  const card1 = await seedCard(a, projectId, 0, { titre: "Fiche 1" });
  const card2 = await seedCard(a, projectId, 1, { titre: "Fiche 2" });

  // Fiche 1 : 3 unités → ID « 1-2-3 ».
  await page.goto(`/dossiers/${projectId}/fiches/${card1}`);
  await page.getByRole("spinbutton").fill("3");
  await expect(page.getByText("ID 1-2-3")).toBeVisible();
  await expect(page.locator("aside table tbody tr td").first()).toHaveText("1-2-3");
  await expectPersistedRow(card1, { nb_unites: 3 });

  // Fiche 2 continue la numérotation → ID « 4 ».
  await page.goto(`/dossiers/${projectId}/fiches/${card2}`);
  await expect(page.getByText("ID 4", { exact: true })).toBeVisible();

  // Supprimer la fiche 1 → la fiche 2 redevient « 1 ».
  await page.goto(`/dossiers/${projectId}/fiches/${card1}`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Supprimer" }).click();
  await page.waitForURL(`**/dossiers/${projectId}/fiches`);

  await page.goto(`/dossiers/${projectId}/fiches/${card2}`);
  await expect(page.getByText("ID 1", { exact: true })).toBeVisible();
});

test("case « estimé » : astérisque + note modifiable, persistés", async ({ page }) => {
  projectId = await seedProject(a, `est-${Date.now()}`);
  const cardId = await seedCard(a, projectId, 0);
  await page.goto(`/dossiers/${projectId}/fiches/${cardId}`);

  await setField(page, "Débit (PCM)", "4000");
  await page
    .locator('[data-field="Débit (PCM)"]')
    .locator("xpath=following-sibling::label")
    .getByRole("checkbox")
    .check();

  // Astérisque dans l'aperçu (4e colonne : ID, Description, Marque, Débit).
  await expect(page.locator("aside table tbody tr td").nth(3)).toHaveText("4000*");

  // Note « estimé » éditable.
  const note = page.locator("label").filter({ hasText: "Note" }).getByRole("textbox");
  await expect(note).toHaveValue("* Estimé");
  await note.fill("* Valeur estimée au terrain");
  await expectPersistedRow(cardId, {
    debit_pcm: "4000",
    debit_pcm_estime: true,
    note_estime: "* Valeur estimée au terrain",
  });

  await page.reload();
  await expect(page.locator('[data-field="Débit (PCM)"]').locator("xpath=following-sibling::label").getByRole("checkbox")).toBeChecked();
  await expect(page.locator("label").filter({ hasText: "Note" }).getByRole("textbox")).toHaveValue("* Valeur estimée au terrain");
  await expect(page.locator("aside table tbody tr td").nth(3)).toHaveText("4000*");
});

test("lignes « + Autre » et puces de constats, persistées", async ({ page }) => {
  projectId = await seedProject(a, `autre-${Date.now()}`);
  const cardId = await seedCard(a, projectId, 0);
  await page.goto(`/dossiers/${projectId}/fiches/${cardId}`);

  const autres = page.getByRole("group", { name: /Autres variables/ });
  await autres.getByRole("button", { name: "+ Autre" }).click();
  await autres.getByRole("textbox").first().fill("Tension");
  await autres.getByPlaceholder("valeur").fill("600");
  await autres.getByPlaceholder("unité").fill("V");

  await page
    .locator("label")
    .filter({ hasText: "Constats" })
    .getByRole("textbox")
    .fill("Bon état général\nFiltre à remplacer");
  await expect
    .poll(async () => {
      const { data } = await a.from("equipment_cards").select("fields").eq("id", cardId).single();
      return (data?.fields as { autres?: { titre?: string }[] } | null)?.autres?.[0]?.titre;
    })
    .toBe("Tension");

  // Aperçu : ligne Autre + puces.
  await expect(page.locator("aside")).toContainText("Tension");
  await expect(page.locator("aside")).toContainText("600");
  await expect(page.locator("aside li")).toHaveText(["Bon état général", "Filtre à remplacer"]);

  await page.reload();
  await expect(page.getByRole("group", { name: /Autres variables/ }).getByRole("textbox").first()).toHaveValue("Tension");
  await expect(page.locator("label").filter({ hasText: "Constats" }).getByRole("textbox")).toHaveValue(
    "Bon état général\nFiltre à remplacer",
  );
});
