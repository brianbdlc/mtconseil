// Snapshot des données CONFIRMÉES d'un dossier (bâtiment confirmé + fiches confirmées),
// sérialisé pour le prompt de rédaction ET pour l'empreinte de péremption (Phase 6).
// Partagé par les actions rédaction, la page rédaction et l'export — une seule source.

import { createClient } from "@/lib/supabase/server";
import { sourceData } from "@/lib/ai/sourceData";

export async function chargerDonnees(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<{ donnees: string; batimentConfirme: boolean }> {
  const { data: buildingRow } = await supabase
    .from("building_description")
    .select("*")
    .eq("project_id", projectId)
    .eq("statut", "confirme")
    .maybeSingle();
  const { data: cards } = await supabase
    .from("equipment_cards")
    .select("*")
    .eq("project_id", projectId)
    .eq("statut", "confirme")
    .order("position", { ascending: true });
  return {
    donnees: sourceData({ building: buildingRow, cards: cards ?? [] }),
    batimentConfirme: !!buildingRow,
  };
}
