import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { admin, cleanupProject, seedProject, seedCard } from "./helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

const a: SupabaseClient = admin();
const fx = (name: string) => path.join(__dirname, "fixtures", name);
let projectId: string;

test.afterEach(async () => {
  if (projectId) await cleanupProject(a, projectId);
});

function cells(page: Page) {
  return page.locator(".grid.grid-cols-2 > div");
}
async function upload(page: Page, file: string, expected: number) {
  await page.locator('input[type="file"]').setInputFiles(fx(file));
  await expect(cells(page)).toHaveCount(expected, { timeout: 30_000 });
}

// trs contenant un dessin (= rangées de photos), nombre de dessins par rangée.
function photoRowSizes(xml: string): number[] {
  const trs = xml.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) ?? [];
  return trs
    .map((tr) => (tr.match(/<w:drawing/g) ?? []).length)
    .filter((n) => n > 0);
}

test("export .docx : légende, lignes Autre, puces, ID en plage, ordre/2-par-rangée des photos", async ({
  page,
}) => {
  projectId = await seedProject(a, `exp-${Date.now()}`);
  // Fiche confirmée préalable (1 unité) → la suivante démarre à l'ID 2.
  await seedCard(a, projectId, 0, { titre: "Fiche préalable", statut: "confirme", nb_unites: 1 });
  const card = await seedCard(a, projectId, 1, { titre: "Unité de toit" });

  // Remplir la 2e fiche via l'UI.
  await page.goto(`/dossiers/${projectId}/fiches/${card}`);
  await page.getByRole("spinbutton").fill("3"); // 3 unités → ID « 2-3-4 »

  const autres = page.getByRole("group", { name: /Autres variables/ });
  await autres.getByRole("button", { name: "+ Autre" }).click();
  await autres.getByRole("textbox").first().fill("Tension");
  await autres.getByPlaceholder("valeur").fill("600");
  await autres.getByPlaceholder("unité").fill("V");

  await page
    .locator("label")
    .filter({ hasText: "Constats" })
    .getByRole("textbox")
    .fill("Premier constat\nDeuxième constat");

  await upload(page, "photo1.png", 1);
  await upload(page, "photo2.png", 2);
  await upload(page, "photo3.png", 3);
  await cells(page).nth(0).getByPlaceholder("Titre (optionnel)").fill("PhotoAlpha");
  await cells(page).nth(1).getByPlaceholder("Titre (optionnel)").fill("PhotoBeta");
  await cells(page).nth(2).getByPlaceholder("Titre (optionnel)").fill("PhotoGamma");
  await expect(page.getByText("Enregistré")).toBeVisible();

  // Titres de photos (sauvegarde fire-and-forget) : attendre la persistance en base.
  await expect
    .poll(async () => {
      const { data } = await a
        .from("card_photos")
        .select("titre, position")
        .eq("card_id", card)
        .order("position", { ascending: true });
      return (data ?? []).map((r) => r.titre).join(",");
    })
    .toBe("PhotoAlpha,PhotoBeta,PhotoGamma");

  // Confirmer la fiche (sinon exclue de l'export).
  await page.getByRole("button", { name: "Confirmer la fiche" }).click();
  await expect(page.getByRole("button", { name: "Rouvrir pour modifier" })).toBeVisible();

  // Télécharger le .docx via la route authentifiée.
  const res = await page.request.get(`/dossiers/${projectId}/export/download`);
  expect(res.ok()).toBeTruthy();
  const buf = Buffer.from(await res.body());
  expect(buf.subarray(0, 2).toString("latin1")).toBe("PK"); // zip valide

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mtc-exp-"));
  const dst = path.join(dir, "out.docx");
  fs.writeFileSync(dst, buf);
  const xml = execSync(`unzip -p "${dst}" word/document.xml`, { encoding: "utf-8", maxBuffer: 1 << 25 });
  const listing = execSync(`unzip -l "${dst}"`, { encoding: "utf-8" });

  // Légende fixe du tableau 2.
  expect(xml).toContain("Détente directe");
  expect(xml).toContain("Eau refroidie");

  // Lignes « Autre » (apparence tableau 2 : 3 colonnes titre | valeur | unité).
  expect(xml).toContain("Tension");
  expect(xml).toContain("600");
  expect(xml).toContain("Constat / remarques"); // bandeau au-dessus des puces

  // Puces de constats : puce noire simple « • » + textes.
  expect(xml).toContain("•  Premier constat");
  expect(xml).toContain("•  Deuxième constat");

  // ID en plage (US-9).
  expect(xml).toContain("2-3-4");

  // Photos : ≥3 images (le gabarit en contient déjà : logo…), ordre préservé,
  // 2 par rangée (rangées de 2 puis 1).
  expect((listing.match(/word\/media\/image/g) ?? []).length).toBeGreaterThanOrEqual(3);
  const iA = xml.indexOf("PhotoAlpha");
  const iB = xml.indexOf("PhotoBeta");
  const iG = xml.indexOf("PhotoGamma");
  expect(iA).toBeGreaterThan(-1);
  expect(iA).toBeLessThan(iB);
  expect(iB).toBeLessThan(iG);
  expect(photoRowSizes(xml)).toEqual([2, 1]);

  fs.rmSync(dir, { recursive: true, force: true });
});
