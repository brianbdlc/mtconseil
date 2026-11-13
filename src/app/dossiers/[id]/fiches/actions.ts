"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/database.types";

// Payload d'édition d'une fiche : titre/intro + colonnes tableau 1/2 + `fields` listes
// (produit par toCardColumns côté client).
type CardPayload = {
  titre: string;
  intro: string;
  columns: Record<string, unknown>;
};

function cardUpdate(p: CardPayload, statut: "brouillon" | "confirme") {
  return {
    ...(p.columns as TablesUpdate<"equipment_cards">),
    titre: p.titre.trim() || null,
    intro: p.intro.trim() || null,
    statut,
    updated_at: new Date().toISOString(),
  };
}

async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return supabase;
}

export async function addCard(projectId: string) {
  const supabase = await client();
  // position = ordre d'apparition (R8) : à la suite de la dernière fiche.
  const { data: last } = await supabase
    .from("equipment_cards")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("equipment_cards")
    .insert({ project_id: projectId, position: (last?.position ?? -1) + 1 })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath(`/dossiers/${projectId}/fiches`);
  redirect(`/dossiers/${projectId}/fiches/${data.id}`);
}

// R1 : toute modification de contenu repasse la fiche en brouillon.
export async function updateCard(
  cardId: string,
  projectId: string,
  values: CardPayload,
) {
  const supabase = await client();
  const { error } = await supabase
    .from("equipment_cards")
    .update(cardUpdate(values, "brouillon"))
    .eq("id", cardId);
  if (error) throw error;
  revalidatePath(`/dossiers/${projectId}/fiches`);
}

// Confirme en écrivant les valeurs courantes + statut dans un seul update (évite que
// l'autosave et la confirmation se marchent dessus).
// ponytail: si on tape puis confirme en <800ms, un autosave en attente peut repasser
// la fiche en brouillon après coup ; un rechargement réconcilie (la DB fait foi).
export async function confirmCard(
  cardId: string,
  projectId: string,
  values: CardPayload,
) {
  const supabase = await client();
  const { error } = await supabase
    .from("equipment_cards")
    .update(cardUpdate(values, "confirme"))
    .eq("id", cardId);
  if (error) throw error;
  revalidatePath(`/dossiers/${projectId}/fiches`);
}

export async function setStatut(
  cardId: string,
  projectId: string,
  statut: "brouillon" | "confirme",
) {
  const supabase = await client();
  const { error } = await supabase
    .from("equipment_cards")
    .update({ statut, updated_at: new Date().toISOString() })
    .eq("id", cardId);
  if (error) throw error;
  revalidatePath(`/dossiers/${projectId}/fiches`);
}

// Déplace une fiche d'un cran (R8 : le n° 3.x se recalcule à l'affichage selon l'ordre).
// ponytail: échange de `position` en 2 updates sans transaction — suffisant pour un
// outil interne mono-firme ; passer à un RPC atomique si des conflits apparaissent.
export async function moveCard(
  cardId: string,
  projectId: string,
  direction: "up" | "down",
) {
  const supabase = await client();
  const { data: cards } = await supabase
    .from("equipment_cards")
    .select("id, position")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (!cards) return;

  const idx = cards.findIndex((c) => c.id === cardId);
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= cards.length) return; // déjà au bord

  const a = cards[idx];
  const b = cards[swap];
  await supabase.from("equipment_cards").update({ position: b.position }).eq("id", a.id);
  await supabase.from("equipment_cards").update({ position: a.position }).eq("id", b.id);
  revalidatePath(`/dossiers/${projectId}/fiches`);
}

const PHOTOS_BUCKET = "equipment-photos";

// Photos (US-15). L'upload du fichier se fait côté client (storage) ; ici on tient la
// table card_photos (métadonnées + ordre). 1-6 par fiche contrôlé côté UI + garde ici.
export async function addPhoto(
  cardId: string,
  projectId: string,
  storagePath: string,
) {
  const supabase = await client();
  const { data: rows } = await supabase
    .from("card_photos")
    .select("position")
    .eq("card_id", cardId);
  if ((rows?.length ?? 0) >= 6) throw new Error("Maximum 6 photos par fiche");
  const next = Math.max(-1, ...(rows ?? []).map((r) => r.position)) + 1;

  const { error } = await supabase
    .from("card_photos")
    .insert({ card_id: cardId, storage_path: storagePath, position: next });
  if (error) throw error;
  revalidatePath(`/dossiers/${projectId}/fiches`);
}

export async function updatePhotoTitle(
  photoId: string,
  projectId: string,
  titre: string,
) {
  const supabase = await client();
  const { error } = await supabase
    .from("card_photos")
    .update({ titre: titre.trim() || null })
    .eq("id", photoId);
  if (error) throw error;
  revalidatePath(`/dossiers/${projectId}/fiches`);
}

export async function deletePhoto(
  photoId: string,
  projectId: string,
  storagePath: string,
) {
  const supabase = await client();
  await supabase.storage.from(PHOTOS_BUCKET).remove([storagePath]);
  const { error } = await supabase.from("card_photos").delete().eq("id", photoId);
  if (error) throw error;
  revalidatePath(`/dossiers/${projectId}/fiches`);
}

// Réordonne par glisser-déposer : position = rang dans la liste fournie (US-15).
export async function reorderPhotos(projectId: string, orderedIds: string[]) {
  const supabase = await client();
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase.from("card_photos").update({ position: i }).eq("id", id),
    ),
  );
  revalidatePath(`/dossiers/${projectId}/fiches`);
}

export async function deleteCard(cardId: string, projectId: string) {
  const supabase = await client();
  const { error } = await supabase
    .from("equipment_cards")
    .delete()
    .eq("id", cardId);
  if (error) throw error;
  revalidatePath(`/dossiers/${projectId}/fiches`);
  redirect(`/dossiers/${projectId}/fiches`);
}
