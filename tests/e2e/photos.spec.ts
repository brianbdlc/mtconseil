import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { admin, cleanupProject, seedProject, seedCard, BUCKET } from "./helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

const a: SupabaseClient = admin();
const fx = (name: string) => path.join(__dirname, "fixtures", name);
let projectId: string;

test.afterEach(async () => {
  if (projectId) await cleanupProject(a, projectId);
});

function grid(page: Page) {
  return page.locator(".grid.grid-cols-2");
}
function cells(page: Page) {
  return grid(page).locator("> div");
}

// Téléverse un fichier et attend que le nombre de vignettes atteigne `expected`.
async function upload(page: Page, file: string, expected: number) {
  await page.locator('input[type="file"]').setInputFiles(fx(file));
  await expect(cells(page)).toHaveCount(expected, { timeout: 30_000 });
}

test("upload (dont HEIC→JPEG), titre, suppression, maximum 6, 2 par rangée", async ({ page }) => {
  projectId = await seedProject(a, `ph-${Date.now()}`);
  const cardId = await seedCard(a, projectId, 0);
  await page.goto(`/dossiers/${projectId}/fiches/${cardId}`);

  // Grille à 2 colonnes (deux par rangée).
  await expect(grid(page)).toHaveClass(/grid-cols-2/);

  // 5 PNG + 1 HEIC (converti en JPEG côté client avant upload) = 6.
  for (let i = 1; i <= 5; i++) await upload(page, `photo${i}.png`, i);
  await upload(page, "photo.heic", 6);

  // Le HEIC est stocké en .jpg (converti).
  const { data: files } = await a.storage.from(BUCKET).list(cardId);
  expect(files?.some((f) => f.name.endsWith(".jpg"))).toBeTruthy();

  // Titre optionnel, persiste après rechargement (sauvegarde fire-and-forget → poll base).
  await cells(page).first().getByPlaceholder("Titre (optionnel)").fill("Vue avant");
  await expect
    .poll(async () => {
      const { data } = await a.from("card_photos").select("titre").eq("card_id", cardId);
      return (data ?? []).some((r) => r.titre === "Vue avant");
    })
    .toBe(true);
  await page.reload();
  await expect(cells(page).first().getByPlaceholder("Titre (optionnel)")).toHaveValue("Vue avant");

  // Maximum 6 : une 7e photo est refusée (message + compteur inchangé).
  await page.locator('input[type="file"]').setInputFiles(fx("photo7.png"));
  await expect(page.getByText(/Maximum 6 photos/)).toBeVisible();
  await expect(cells(page)).toHaveCount(6);

  // Suppression.
  page.once("dialog", (d) => d.accept());
  await cells(page).first().getByRole("button", { name: "Supprimer" }).click();
  await expect(cells(page)).toHaveCount(5);
});

test("réordonner par glisser-déposer, persiste après rechargement", async ({ page }) => {
  projectId = await seedProject(a, `drag-${Date.now()}`);
  const cardId = await seedCard(a, projectId, 0);
  await page.goto(`/dossiers/${projectId}/fiches/${cardId}`);

  await upload(page, "photo1.png", 1);
  await upload(page, "photo2.png", 2);
  await upload(page, "photo3.png", 3);
  await cells(page).nth(0).getByPlaceholder("Titre (optionnel)").fill("A");
  await cells(page).nth(1).getByPlaceholder("Titre (optionnel)").fill("B");
  await cells(page).nth(2).getByPlaceholder("Titre (optionnel)").fill("C");
  await expect(page.getByText("Enregistré")).toBeVisible().catch(() => {});

  // Glisse la 1re vignette (A) sur la 3e (C).
  const handle = (i: number) => cells(page).nth(i).getByRole("button", { name: "Déplacer la photo" });
  const box1 = await handle(0).boundingBox();
  const box3 = await handle(2).boundingBox();
  if (!box1 || !box3) throw new Error("poignées introuvables");
  await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2);
  await page.mouse.down();
  // dnd-kit : plusieurs mouvements pour déclencher le tri.
  for (let s = 1; s <= 6; s++) {
    await page.mouse.move(
      box1.x + ((box3.x - box1.x) * s) / 6,
      box1.y + ((box3.y - box1.y) * s) / 6,
      { steps: 4 },
    );
  }
  await page.mouse.up();

  // Nouvel ordre B, C, A (A déplacée en fin) côté UI.
  const titre = (i: number) => cells(page).nth(i).getByPlaceholder("Titre (optionnel)");
  await expect(titre(0)).toHaveValue("B");
  await expect(titre(1)).toHaveValue("C");
  await expect(titre(2)).toHaveValue("A");

  // reorderPhotos est fire-and-forget : attendre que l'ordre soit persisté en base.
  await expect
    .poll(async () => {
      const { data } = await a
        .from("card_photos")
        .select("titre, position")
        .eq("card_id", cardId)
        .order("position", { ascending: true });
      return (data ?? []).map((r) => r.titre).join("");
    })
    .toBe("BCA");

  await page.reload();
  await expect(titre(0)).toHaveValue("B");
  await expect(titre(1)).toHaveValue("C");
  await expect(titre(2)).toHaveValue("A");
});
