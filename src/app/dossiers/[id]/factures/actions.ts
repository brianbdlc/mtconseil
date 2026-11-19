"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const FICHIERS_BUCKET = "facture-fichiers";

// Valeurs d'une facture recopiées à la main (nombres/dates concrets, pas de 3-états).
export type FacturePayload = {
  source: "gaz" | "elec";
  numero_compteur: string | null;
  date_debut: string | null;
  date_fin: string | null;
  consommation: number | null;
  montant_ttc: number | null;
  montant_avtx: number | null;
  montant_avtx_manuel: boolean;
  puissance_appelee: number | null;
};

function factureUpdate(p: FacturePayload, statut: "brouillon" | "confirme") {
  return { ...p, statut, updated_at: new Date().toISOString() };
}

async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

// Colonnes relues par la liste inline (une par facture).
const COLS =
  "id, source, numero_compteur, date_debut, date_fin, consommation, montant_ttc, montant_avtx, montant_avtx_manuel, puissance_appelee, fichier_path, statut, position";

export type FactureRow = {
  id: string;
  source: string;
  numero_compteur: string | null;
  date_debut: string | null;
  date_fin: string | null;
  consommation: number | null;
  montant_ttc: number | null;
  montant_avtx: number | null;
  montant_avtx_manuel: boolean;
  puissance_appelee: number | null;
  fichier_path: string | null;
  statut: string;
  position: number;
};

// Ajoute une facture (saisie inline, pas de redirection) et renvoie la ligne créée.
// `prefill` : source/compteur/début proposés (p. ex. lendemain de la période précédente).
export async function createFacture(
  projectId: string,
  prefill?: { source?: "gaz" | "elec"; numero_compteur?: string | null; date_debut?: string | null },
): Promise<FactureRow> {
  const supabase = await client();
  const { data: last } = await supabase
    .from("factures")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("factures")
    .insert({
      project_id: projectId,
      position: (last?.position ?? -1) + 1,
      source: prefill?.source ?? "gaz",
      numero_compteur: prefill?.numero_compteur ?? null,
      date_debut: prefill?.date_debut ?? null,
    })
    .select(COLS)
    .single();
  if (error) throw error;

  revalidatePath(`/dossiers/${projectId}/factures`);
  return data as FactureRow;
}

// R1 : toute modification repasse la facture en brouillon.
export async function updateFacture(
  factureId: string,
  projectId: string,
  values: FacturePayload,
) {
  const supabase = await client();
  const { error } = await supabase
    .from("factures")
    .update(factureUpdate(values, "brouillon"))
    .eq("id", factureId);
  if (error) throw error;
  revalidatePath(`/dossiers/${projectId}/factures`);
}

// Confirme en écrivant valeurs + statut en un seul update (même garde que confirmCard).
export async function confirmFacture(
  factureId: string,
  projectId: string,
  values: FacturePayload,
) {
  const supabase = await client();
  const { error } = await supabase
    .from("factures")
    .update(factureUpdate(values, "confirme"))
    .eq("id", factureId);
  if (error) throw error;
  revalidatePath(`/dossiers/${projectId}/factures`);
}

export async function setStatut(
  factureId: string,
  projectId: string,
  statut: "brouillon" | "confirme",
) {
  const supabase = await client();
  const { error } = await supabase
    .from("factures")
    .update({ statut, updated_at: new Date().toISOString() })
    .eq("id", factureId);
  if (error) throw error;
  revalidatePath(`/dossiers/${projectId}/factures`);
}

// Déplace d'un cran (position = ordre d'apparition, R8 ; recalcul à l'affichage).
export async function moveFacture(
  factureId: string,
  projectId: string,
  direction: "up" | "down",
) {
  const supabase = await client();
  const { data: rows } = await supabase
    .from("factures")
    .select("id, position")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (!rows) return;
  const idx = rows.findIndex((r) => r.id === factureId);
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= rows.length) return;
  const a = rows[idx];
  const b = rows[swap];
  await supabase.from("factures").update({ position: b.position }).eq("id", a.id);
  await supabase.from("factures").update({ position: a.position }).eq("id", b.id);
  revalidatePath(`/dossiers/${projectId}/factures`);
}

// Fichier source (1 par facture) : upload fait côté client (Storage) ; ici on note
// le chemin + type. N'affecte pas le statut (image/PDF = source de recopie, pas calcul).
export async function setFichier(
  factureId: string,
  projectId: string,
  path: string,
  type: string,
) {
  const supabase = await client();
  const { error } = await supabase
    .from("factures")
    .update({ fichier_path: path, fichier_type: type })
    .eq("id", factureId);
  if (error) throw error;
  revalidatePath(`/dossiers/${projectId}/factures`);
}

export async function deleteFichier(
  factureId: string,
  projectId: string,
  path: string,
) {
  const supabase = await client();
  await supabase.storage.from(FICHIERS_BUCKET).remove([path]);
  const { error } = await supabase
    .from("factures")
    .update({ fichier_path: null, fichier_type: null })
    .eq("id", factureId);
  if (error) throw error;
  revalidatePath(`/dossiers/${projectId}/factures`);
}

export async function deleteFacture(factureId: string, projectId: string) {
  const supabase = await client();
  const { error } = await supabase.from("factures").delete().eq("id", factureId);
  if (error) throw error;
  revalidatePath(`/dossiers/${projectId}/factures`);
}

// Réglages énergie du dossier (1 ligne, conflit project_id). PCS + année de référence.
export async function saveEnergySettings(
  projectId: string,
  values: { pouvoir_calorifique_mj_m3: number; annee_reference: number | null },
) {
  const supabase = await client();
  const { error } = await supabase.from("energy_settings").upsert(
    { project_id: projectId, ...values, updated_at: new Date().toISOString() },
    { onConflict: "project_id" },
  );
  if (error) throw error;
  revalidatePath(`/dossiers/${projectId}/factures`);
}

// PCS seul (depuis le bloc gaz d'une facture). Upsert ciblé : n'écrit que la colonne PCS
// → ne touche pas annee_reference d'une ligne existante (PostgREST met à jour les seules
// colonnes fournies on conflict).
export async function savePcs(projectId: string, pcs: number) {
  const supabase = await client();
  const { error } = await supabase.from("energy_settings").upsert(
    { project_id: projectId, pouvoir_calorifique_mj_m3: pcs, updated_at: new Date().toISOString() },
    { onConflict: "project_id" },
  );
  if (error) throw error;
  revalidatePath(`/dossiers/${projectId}/factures`);
}
