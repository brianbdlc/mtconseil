"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true } | { ok: false; message: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin" ? { supabase, userId: user.id } : null;
}

const ZONES = ["apres_description", "apres_fiches", "bilan"];

function lire(formData: FormData) {
  return {
    titre: String(formData.get("titre") ?? "").trim(),
    zone: String(formData.get("zone") ?? ""),
    ordre: Number(formData.get("ordre") ?? 0) || 0,
    instructions: String(formData.get("instructions") ?? ""),
    notes_actives: formData.get("notes_actives") === "on",
    requiert_batiment: formData.get("requiert_batiment") === "on",
    actif: formData.get("actif") === "on",
  };
}

// Insère une version (R10) à chaque écriture d'instructions/titre.
async function ajouterVersion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  section_type_id: string,
  titre: string,
  instructions: string,
) {
  await supabase
    .from("section_type_versions")
    .insert({ section_type_id, titre, instructions, created_by: userId });
}

export async function createType(formData: FormData): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Accès refusé." };
  const f = lire(formData);
  if (!f.titre) return { ok: false, message: "Titre requis." };
  if (!ZONES.includes(f.zone)) return { ok: false, message: "Zone invalide." };
  // Clé naturelle stable à partir du titre (minuscule, sans accents/espaces).
  const cle =
    f.titre
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `type_${Date.now()}`;

  const { data, error } = await admin.supabase
    .from("section_types")
    .insert({
      cle,
      titre: f.titre,
      zone: f.zone,
      ordre: f.ordre,
      instructions: f.instructions,
      notes_actives: f.notes_actives,
      requiert_batiment: f.requiert_batiment,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  await ajouterVersion(admin.supabase, admin.userId, data.id, f.titre, f.instructions);
  revalidatePath("/admin/sections");
  return { ok: true };
}

export async function editType(id: string, formData: FormData): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Accès refusé." };
  const f = lire(formData);
  if (!f.titre) return { ok: false, message: "Titre requis." };
  if (!ZONES.includes(f.zone)) return { ok: false, message: "Zone invalide." };

  // État précédent : on versionne seulement si titre ou instructions changent.
  const { data: prev } = await admin.supabase
    .from("section_types")
    .select("titre, instructions")
    .eq("id", id)
    .single();

  const { error } = await admin.supabase
    .from("section_types")
    .update({
      titre: f.titre,
      zone: f.zone,
      ordre: f.ordre,
      instructions: f.instructions,
      notes_actives: f.notes_actives,
      requiert_batiment: f.requiert_batiment,
      actif: f.actif,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  if (prev && (prev.titre !== f.titre || prev.instructions !== f.instructions)) {
    await ajouterVersion(admin.supabase, admin.userId, id, f.titre, f.instructions);
  }
  revalidatePath("/admin/sections");
  return { ok: true };
}

// Rollback (US-30) : réécrit titre/instructions depuis une version → crée une nouvelle version.
export async function restaurerVersion(versionId: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Accès refusé." };
  const { data: v } = await admin.supabase
    .from("section_type_versions")
    .select("section_type_id, titre, instructions")
    .eq("id", versionId)
    .single();
  if (!v) return { ok: false, message: "Version introuvable." };

  const { error } = await admin.supabase
    .from("section_types")
    .update({
      titre: v.titre ?? "",
      instructions: v.instructions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", v.section_type_id);
  if (error) return { ok: false, message: error.message };
  await ajouterVersion(admin.supabase, admin.userId, v.section_type_id, v.titre ?? "", v.instructions);
  revalidatePath("/admin/sections");
  return { ok: true };
}
