"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { genererSection, aMarqueurManquant } from "@/lib/ai/generate";
import { sourceHash } from "@/lib/ai/sourceData";
import { chargerDonnees } from "@/lib/report/sourceSnapshot";

export type SectionResult = { ok: true } | { ok: false; message: string };
export type GenerResult = { ok: true; texte: string } | { ok: false; message: string };
export type VersionVM = { id: string; texte: string; created_at: string; auteur: string | null };

async function clientUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

async function client() {
  return (await clientUser()).supabase;
}

// Snapshot une version du texte confirmé (US-49), sauf si identique à la dernière (dédup).
async function appendVersion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reportSectionId: string,
  titre: string | null,
  texte: string,
  userId: string,
) {
  const { data: last } = await supabase
    .from("report_section_versions")
    .select("texte")
    .eq("report_section_id", reportSectionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last?.texte === texte) return;
  await supabase
    .from("report_section_versions")
    .insert({ report_section_id: reportSectionId, titre, texte, created_by: userId });
}

// Upsert une ligne report_sections (conflit project_id,section_type_id). R1 : toute
// écriture de contenu repasse en brouillon.
async function upsert(
  projectId: string,
  sectionTypeId: string,
  patch: Record<string, unknown>,
): Promise<SectionResult> {
  const supabase = await client();
  const { error } = await supabase.from("report_sections").upsert(
    {
      project_id: projectId,
      section_type_id: sectionTypeId,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id,section_type_id" },
  );
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/dossiers/${projectId}/redaction`);
  return { ok: true };
}

export async function saveNotes(
  projectId: string,
  sectionTypeId: string,
  notes: string,
): Promise<SectionResult> {
  return upsert(projectId, sectionTypeId, { notes });
}

export async function saveTexte(
  projectId: string,
  sectionTypeId: string,
  texte: string,
): Promise<SectionResult> {
  return upsert(projectId, sectionTypeId, { texte, statut: "brouillon" });
}

export async function confirmSection(
  projectId: string,
  sectionTypeId: string,
  texte: string,
): Promise<SectionResult> {
  // R5/US-26 : un marqueur « [Information manquante » bloque la confirmation (garde serveur).
  if (aMarqueurManquant(texte)) {
    return { ok: false, message: "Un marqueur « [Information manquante : … ] » reste à combler." };
  }
  if (!texte.trim()) return { ok: false, message: "Rien à confirmer." };
  const { supabase, userId } = await clientUser();
  const { donnees } = await chargerDonnees(supabase, projectId);
  const { data, error } = await supabase
    .from("report_sections")
    .upsert(
      {
        project_id: projectId,
        section_type_id: sectionTypeId,
        texte,
        statut: "confirme",
        source_hash_confirme: sourceHash(donnees),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,section_type_id" },
    )
    .select("id, titre")
    .single();
  if (error) return { ok: false, message: error.message };
  await appendVersion(supabase, data.id, data.titre, texte, userId);
  revalidatePath(`/dossiers/${projectId}/redaction`);
  return { ok: true };
}

// Reconfirme sans régénérer (US-27) : re-tamponne l'empreinte courante, texte et statut
// inchangés, pas de nouvelle version. Lève la péremption « données modifiées ».
export async function reconfirmerSansRegenerer(
  projectId: string,
  sectionTypeId: string,
): Promise<SectionResult> {
  const supabase = await client();
  const { donnees } = await chargerDonnees(supabase, projectId);
  const { error } = await supabase
    .from("report_sections")
    .update({ source_hash_confirme: sourceHash(donnees), updated_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("section_type_id", sectionTypeId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/dossiers/${projectId}/redaction`);
  return { ok: true };
}

export async function reconfirmerSansRegenererById(id: string): Promise<SectionResult> {
  const supabase = await client();
  const { data: row } = await supabase
    .from("report_sections")
    .select("project_id")
    .eq("id", id)
    .single();
  if (!row) return { ok: false, message: "Section introuvable." };
  const { donnees } = await chargerDonnees(supabase, row.project_id);
  const { error } = await supabase
    .from("report_sections")
    .update({ source_hash_confirme: sourceHash(donnees), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/dossiers/${row.project_id}/redaction`);
  return { ok: true };
}

// Historique de texte (US-49). Chargé à la demande depuis l'UI.
export async function listVersions(reportSectionId: string): Promise<VersionVM[]> {
  const supabase = await client();
  const { data } = await supabase
    .from("report_section_versions")
    .select("id, texte, created_at, profiles(email)")
    .eq("report_section_id", reportSectionId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((v) => ({
    id: v.id,
    texte: v.texte,
    created_at: v.created_at,
    auteur: (v.profiles as unknown as { email: string | null } | null)?.email ?? null,
  }));
}

// Restaure une version : réécrit le texte EN BROUILLON (R1), renvoie le texte au client.
export async function restaurerVersion(versionId: string): Promise<GenerResult> {
  const supabase = await client();
  const { data: v } = await supabase
    .from("report_section_versions")
    .select("report_section_id, texte")
    .eq("id", versionId)
    .single();
  if (!v) return { ok: false, message: "Version introuvable." };
  const { data: row, error } = await supabase
    .from("report_sections")
    .update({ texte: v.texte, statut: "brouillon", updated_at: new Date().toISOString() })
    .eq("id", v.report_section_id)
    .select("project_id")
    .single();
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/dossiers/${row.project_id}/redaction`);
  return { ok: true, texte: v.texte };
}

export async function setSectionStatut(
  projectId: string,
  sectionTypeId: string,
  statut: "brouillon" | "confirme",
): Promise<SectionResult> {
  return upsert(projectId, sectionTypeId, { statut });
}

// Génère le jet IA à partir des données CONFIRMÉES + notes. Écrit texte_genere, et
// texte si la section n'est pas confirmée. Renvoie le texte au client.
export async function generer(
  projectId: string,
  sectionTypeId: string,
): Promise<GenerResult> {
  const supabase = await client();

  const { data: type } = await supabase
    .from("section_types")
    .select("instructions, requiert_batiment")
    .eq("id", sectionTypeId)
    .single();
  if (!type) return { ok: false, message: "Type de section introuvable." };

  const { data: existing } = await supabase
    .from("report_sections")
    .select("notes, statut")
    .eq("project_id", projectId)
    .eq("section_type_id", sectionTypeId)
    .maybeSingle();

  const { donnees, batimentConfirme } = await chargerDonnees(supabase, projectId);
  if (type.requiert_batiment && !batimentConfirme) {
    return { ok: false, message: "La description du bâtiment doit être confirmée d'abord." };
  }

  const res = await genererSection({
    instructions: type.instructions ?? "",
    notes: existing?.notes ?? "",
    donnees,
  });
  if (!res.ok) return res;

  const patch: Record<string, unknown> = { texte_genere: res.texte, statut: "brouillon" };
  // N'écrase le texte éditable que si la section n'est pas confirmée (protège un texte validé).
  if (existing?.statut !== "confirme") patch.texte = res.texte;

  const up = await upsert(projectId, sectionTypeId, patch);
  if (!up.ok) return { ok: false, message: up.message };
  return { ok: true, texte: res.texte };
}

// --- Sections « Autre » (ad hoc, par dossier, sans section_type) ------------
// Écritures par id de ligne report_sections (pas de conflit project/type — section_type_id NULL).

async function updateById(id: string, patch: Record<string, unknown>): Promise<SectionResult> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("report_sections")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("project_id")
    .single();
  if (error) return { ok: false, message: error.message };
  if (data?.project_id) revalidatePath(`/dossiers/${data.project_id}/redaction`);
  return { ok: true };
}

export async function ajouterAutre(
  projectId: string,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("report_sections")
    .insert({ project_id: projectId, titre: "Autre", statut: "brouillon" })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/dossiers/${projectId}/redaction`);
  return { ok: true, id: data.id };
}

export async function renameAutre(id: string, titre: string): Promise<SectionResult> {
  return updateById(id, { titre: titre.trim() || "Autre" });
}

export async function saveNotesById(id: string, notes: string): Promise<SectionResult> {
  return updateById(id, { notes });
}

export async function saveTexteById(id: string, texte: string): Promise<SectionResult> {
  return updateById(id, { texte, statut: "brouillon" });
}

export async function confirmById(id: string, texte: string): Promise<SectionResult> {
  if (aMarqueurManquant(texte))
    return { ok: false, message: "Un marqueur « [Information manquante : … ] » reste à combler." };
  if (!texte.trim()) return { ok: false, message: "Rien à confirmer." };
  const { supabase, userId } = await clientUser();
  const { data: row } = await supabase
    .from("report_sections")
    .select("project_id, titre")
    .eq("id", id)
    .single();
  if (!row) return { ok: false, message: "Section introuvable." };
  const { donnees } = await chargerDonnees(supabase, row.project_id);
  const { error } = await supabase
    .from("report_sections")
    .update({
      texte,
      statut: "confirme",
      source_hash_confirme: sourceHash(donnees),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  await appendVersion(supabase, id, row.titre, texte, userId);
  revalidatePath(`/dossiers/${row.project_id}/redaction`);
  return { ok: true };
}

export async function setStatutById(
  id: string,
  statut: "brouillon" | "confirme",
): Promise<SectionResult> {
  return updateById(id, { statut });
}

export async function supprimerAutre(id: string): Promise<SectionResult> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("report_sections")
    .delete()
    .eq("id", id)
    .select("project_id")
    .single();
  if (error) return { ok: false, message: error.message };
  if (data?.project_id) revalidatePath(`/dossiers/${data.project_id}/redaction`);
  return { ok: true };
}

// Génère une section « Autre » : instruction générique bâtie sur son titre libre.
export async function genererById(
  projectId: string,
  id: string,
): Promise<GenerResult> {
  const supabase = await client();
  const { data: row } = await supabase
    .from("report_sections")
    .select("titre, notes, statut")
    .eq("id", id)
    .single();
  if (!row) return { ok: false, message: "Section introuvable." };

  const titre = row.titre?.trim() || "Autre";
  const { donnees } = await chargerDonnees(supabase, projectId);
  const res = await genererSection({
    instructions: `Rédige la section « ${titre} » dans le ton MT Conseil à partir des données confirmées et des notes de l'ingénieur.`,
    notes: row.notes ?? "",
    donnees,
  });
  if (!res.ok) return res;

  const patch: Record<string, unknown> = { texte_genere: res.texte, statut: "brouillon" };
  if (row.statut !== "confirme") patch.texte = res.texte;
  const up = await updateById(id, patch);
  if (!up.ok) return { ok: false, message: up.message };
  return { ok: true, texte: res.texte };
}
