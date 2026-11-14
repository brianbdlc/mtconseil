"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Résultat lisible renvoyé au formulaire (plutôt que jeter l'objet Supabase brut, que
// Next.js masque en « digest » côté client).
export type BuildingResult = { ok: true } | { ok: false; message: string };

// Journalise l'erreur Supabase complète côté serveur (code + message + details + hint).
function logPg(where: string, error: { code?: string; message?: string; details?: string | null; hint?: string | null }): string {
  console.error(`${where}:`, error.code, error.message, error.details, error.hint);
  return error.code ? `${error.code} — ${error.message}` : error.message || "Erreur inconnue";
}

async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

// Upsert (1 ligne/dossier, conflit project_id). R1 : toute édition repasse en brouillon.
async function upsert(
  projectId: string,
  columns: Record<string, unknown>,
  statut: "brouillon" | "confirme",
): Promise<BuildingResult> {
  const supabase = await client();
  const { error } = await supabase.from("building_description").upsert(
    {
      project_id: projectId,
      ...columns,
      statut,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" },
  );
  if (error) return { ok: false, message: logPg("upsert building_description", error) };
  revalidatePath(`/dossiers/${projectId}/batiment`);
  return { ok: true };
}

export async function saveBuilding(
  projectId: string,
  columns: Record<string, unknown>,
): Promise<BuildingResult> {
  return upsert(projectId, columns, "brouillon");
}

// Confirme en écrivant valeurs + statut en un seul upsert (même garde anti-course que
// confirmCard : un autosave en attente peut repasser en brouillon après coup ; la DB fait foi).
export async function confirmBuilding(
  projectId: string,
  columns: Record<string, unknown>,
): Promise<BuildingResult> {
  return upsert(projectId, columns, "confirme");
}

export async function setBuildingStatut(
  projectId: string,
  statut: "brouillon" | "confirme",
): Promise<BuildingResult> {
  const supabase = await client();
  const { error } = await supabase
    .from("building_description")
    .update({ statut, updated_at: new Date().toISOString() })
    .eq("project_id", projectId);
  if (error) return { ok: false, message: logPg("setBuildingStatut", error) };
  revalidatePath(`/dossiers/${projectId}/batiment`);
  return { ok: true };
}

// Persiste la liste complète des photos (max 4, géré côté client) : chemins + titres en
// deux tableaux alignés, écrits ensemble. Le client fait l'upload/remove Storage.
export async function setBuildingPhotos(
  projectId: string,
  photos: { path: string; titre: string }[],
): Promise<BuildingResult> {
  const supabase = await client();
  const { error } = await supabase
    .from("building_description")
    .upsert(
      {
        project_id: projectId,
        photo_paths: photos.map((p) => p.path),
        photo_titles: photos.map((p) => p.titre),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    );
  if (error) return { ok: false, message: logPg("setBuildingPhotos", error) };
  revalidatePath(`/dossiers/${projectId}/batiment`);
  return { ok: true };
}
