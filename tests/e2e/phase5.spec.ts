import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { admin, cleanupProject, seedProject, TEST_USER } from "./helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

// Phase 5 — rédaction IA. Coche les 3 critères d'acceptation du PLAN :
//  AC1 admin : créer/éditer/désactiver un type + versionnage + rollback (qui/quand).
//  AC2 génération depuis données confirmées + notes ; marqueur [Information manquante] bloque.
//  AC3 texte édité puis confirmé exporté tel quel ; Sommaire du site dispo si bâtiment confirmé.
// Tourne contre le Supabase de .env.local (local), données préfixées PW- / pw_.

const a: SupabaseClient = admin();
let projectId: string;
const CLE = "pw_section_e2e";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await a.from("profiles").update({ role: "admin" }).eq("email", TEST_USER.email);
  await a.from("section_types").delete().like("cle", "pw_%");
  projectId = await seedProject(a, `phase5-${Date.now()}`);
});

test.afterAll(async () => {
  if (projectId) await cleanupProject(a, projectId);
  await a.from("section_types").delete().like("cle", "pw_%");
  await a.from("profiles").update({ role: "ingenieur" }).eq("email", TEST_USER.email);
});

// Carte de section rédigée (état actif = classe flex-col ; la carte désactivée ne l'a pas).
const card = (page: Page, titre: string) =>
  page.locator("div.flex-col.rounded-md.border", {
    has: page.getByRole("heading", { name: titre }),
  });

test("AC1 — admin : créer, éditer (versionner), restaurer, désactiver un type", async ({ page }) => {
  await page.goto("/admin/sections");
  await expect(page.getByRole("heading", { name: "Types de section" })).toBeVisible();

  // Créer un type sans redéploiement.
  await page.getByRole("button", { name: "+ Ajouter un type" }).click();
  const form = page.locator("form", { has: page.getByRole("button", { name: "Créer" }) });
  await form.locator('input[name="titre"]').fill("PW Section E2E");
  await form.locator('select[name="zone"]').selectOption("apres_fiches");
  await form.locator('textarea[name="instructions"]').fill("Instructions V1");
  await form.getByRole("button", { name: "Créer" }).click();

  const pw = page.locator("div.rounded-md.border.p-4", { hasText: CLE });
  await expect(pw).toBeVisible();

  // 1 version initiale enregistrée (qui/quand).
  const { data: t } = await a.from("section_types").select("id").eq("cle", CLE).single();
  const typeId = t!.id as string;
  await expect
    .poll(async () => (await a.from("section_type_versions").select("id").eq("section_type_id", typeId)).data?.length)
    .toBe(1);

  // Éditer les instructions → nouvelle version.
  await pw.locator("textarea").fill("Instructions V2");
  await pw.getByRole("button", { name: "Enregistrer" }).click();
  await expect(pw.getByText("Enregistré.")).toBeVisible();

  await expect
    .poll(async () => (await a.from("section_type_versions").select("id").eq("section_type_id", typeId)).data?.length)
    .toBe(2);
  const { data: vrows } = await a
    .from("section_type_versions")
    .select("instructions, created_by, created_at")
    .eq("section_type_id", typeId)
    .order("created_at", { ascending: true });
  expect(vrows!.map((v) => v.instructions)).toEqual(["Instructions V1", "Instructions V2"]);
  expect(vrows!.every((v) => v.created_by && v.created_at)).toBeTruthy(); // qui/quand

  // Restaurer la version antérieure (V1) → instructions reviennent + nouvelle version.
  await pw.getByRole("button", { name: /Historique/ }).click();
  await pw.locator("li", { hasText: "Instructions V1" }).getByRole("button", { name: "Restaurer" }).click();
  await expect
    .poll(async () => (await a.from("section_types").select("instructions").eq("id", typeId).single()).data?.instructions)
    .toBe("Instructions V1");
  await expect
    .poll(async () => (await a.from("section_type_versions").select("id").eq("section_type_id", typeId)).data?.length)
    .toBe(3);

  // Désactiver (jamais de suppression destructive).
  await pw.locator('input[name="actif"]').uncheck();
  await pw.getByRole("button", { name: "Enregistrer" }).click();
  await expect
    .poll(async () => (await a.from("section_types").select("actif").eq("id", typeId).single()).data?.actif)
    .toBe(false);
});

test("AC3/AC2 — Sommaire gaté par le bâtiment, marqueur bloque, confirmation, export fidèle", async ({ page }) => {
  await page.goto(`/dossiers/${projectId}/redaction`);

  // AC3 : Sommaire du site indisponible tant que le bâtiment n'est pas confirmé.
  await expect(
    page.getByText("Disponible seulement une fois la description du bâtiment confirmée."),
  ).toBeVisible();

  // Confirmer le bâtiment (via service) → Sommaire devient disponible après rechargement.
  await a.from("building_description").upsert(
    {
      project_id: projectId,
      statut: "confirme",
      superficie_brute_totale: "1000",
      superficie_brute_totale_etat: "valeur",
    },
    { onConflict: "project_id" },
  );
  await page.reload();
  await expect(
    page.getByText("Disponible seulement une fois la description du bâtiment confirmée."),
  ).toHaveCount(0);
  await expect(card(page, "Sommaire du site").getByRole("button", { name: "Générer" })).toBeVisible();

  // AC2 : marqueur [Information manquante] bloque la confirmation.
  const humid = card(page, "Humidification");
  const texte = humid.getByPlaceholder(/Générez un premier jet/);
  await texte.fill("[Information manquante : débit]");
  await expect(humid.getByRole("button", { name: "Confirmer" })).toBeDisabled();
  await expect(humid.getByText(/Un marqueur/)).toBeVisible();

  // Texte valide → confirmation possible ; attendre l'autosave pour éviter la course.
  const marqueur = "PW texte unique 12345.";
  await texte.fill(marqueur);
  await expect(humid.getByText("Enregistré")).toBeVisible();
  const btn = humid.getByRole("button", { name: "Confirmer" });
  await expect(btn).toBeEnabled();
  await btn.click();
  await expect(humid.getByText("Confirmé")).toBeVisible();
  await expect(humid.getByRole("button", { name: "Rouvrir pour modifier" })).toBeVisible();

  // AC3 : le texte confirmé s'exporte tel quel dans le .docx.
  const res = await page.request.get(`/dossiers/${projectId}/export/download`);
  expect(res.ok()).toBeTruthy();
  const buf = Buffer.from(await res.body());
  expect(buf.subarray(0, 2).toString("latin1")).toBe("PK");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mtc-p5-"));
  const dst = path.join(dir, "out.docx");
  fs.writeFileSync(dst, buf);
  const xml = execSync(`unzip -p "${dst}" word/document.xml`, { encoding: "utf-8", maxBuffer: 1 << 25 });
  expect(xml).toContain(marqueur);
});

test("AC2 — génération IA depuis données confirmées (appel Claude réel)", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(`/dossiers/${projectId}/redaction`);
  const sommaire = card(page, "Sommaire du site");
  const texte = sommaire.getByPlaceholder(/Générez un premier jet/);

  await sommaire.getByRole("button", { name: "Générer" }).click();

  // Succès = texte non vide produit. Si la génération échoue, le texte reste vide → timeout.
  await expect
    .poll(async () => (await texte.inputValue()).trim().length, { timeout: 90_000, intervals: [2000] })
    .toBeGreaterThan(0);
});
