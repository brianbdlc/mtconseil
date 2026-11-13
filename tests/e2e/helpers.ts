import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

// Charge .env.local (service key + URL) pour le seeding/nettoyage via service role.
export function loadEnv() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // déjà chargé
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY!;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY requis (.env.local)");
  return { url, key };
}

export const TEST_USER = {
  email: "phase3.e2e@example.com",
  password: "Test-phase3-2026!",
};
export const BUCKET = "equipment-photos";

export function admin(): SupabaseClient {
  const { url, key } = loadEnv();
  return createClient(url, key, { auth: { persistSession: false } });
}

// Dossier fictif (préfixe PW- pour repérage/nettoyage).
export async function seedProject(a: SupabaseClient, suffix: string) {
  const { data, error } = await a
    .from("projects")
    .insert({
      numero_projet: `PW-${suffix}`,
      client_nom: "Client Fictif PW",
      client_adresse: "123 rue Test, Montréal",
      type_service: "ÉTUDE ÉNERGÉTIQUE",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function seedCard(
  a: SupabaseClient,
  projectId: string,
  position: number,
  overrides: Record<string, unknown> = {},
) {
  const { data, error } = await a
    .from("equipment_cards")
    .insert({ project_id: projectId, position, ...overrides })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// Nettoyage : supprime les photos Storage des fiches, puis le dossier (cascade DB).
export async function cleanupProject(a: SupabaseClient, projectId: string) {
  const { data: cards } = await a
    .from("equipment_cards")
    .select("id")
    .eq("project_id", projectId);
  for (const c of cards ?? []) {
    const { data: files } = await a.storage.from(BUCKET).list(c.id);
    if (files?.length)
      await a.storage.from(BUCKET).remove(files.map((f) => `${c.id}/${f.name}`));
  }
  await a.from("projects").delete().eq("id", projectId);
}

// --- Sélecteurs UI réutilisables -------------------------------------------

// Remplit un Field3State (repéré par data-field = libellé) en mode « Valeur ».
export async function setField(page: Page, label: string, value: string) {
  const root = page.locator(`[data-field="${label}"]`);
  await root.getByRole("button", { name: "Valeur" }).click();
  const input = root.getByRole("textbox");
  await input.fill(value);
}

export async function setFieldEtat(page: Page, label: string, etat: "n/d" | "-") {
  await page.locator(`[data-field="${label}"]`).getByRole("button", { name: etat, exact: true }).click();
}

// Lit la valeur rendue (avec * si estimé) depuis la ligne d'aperçu du tableau 1.
export function apercuT1Cell(page: Page, colIndex: number) {
  return page.locator("aside table tbody tr td").nth(colIndex);
}
