// Snapshot des données CONFIRMÉES d'un dossier (bâtiment confirmé + fiches confirmées),
// sérialisé pour le prompt de rédaction ET pour l'empreinte de péremption (Phase 6).
// Partagé par les actions rédaction, la page rédaction et l'export — une seule source.

import { createClient } from "@/lib/supabase/server";
import { sourceData, facturesTexte } from "@/lib/ai/sourceData";
import { normaliser, type FactureNorm } from "@/lib/factures/normalize";
import { PCS_DEFAUT_MJ_M3 } from "@/lib/energyParams";

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

  // Factures confirmées + réglages énergie → valeurs normalisées (source du bilan).
  // C'est la valeur normalisée qui entre dans l'empreinte (péremption Phase 6), pas la
  // facture brute. Sans année de référence, pas de normalisation (rien à sérialiser).
  const { data: settings } = await supabase
    .from("energy_settings")
    .select("pouvoir_calorifique_mj_m3, annee_reference")
    .eq("project_id", projectId)
    .maybeSingle();
  const { data: facturesRows } = await supabase
    .from("factures")
    .select("source, numero_compteur, date_debut, date_fin, consommation, montant_avtx")
    .eq("project_id", projectId)
    .eq("statut", "confirme");

  let txtFactures: string | undefined;
  if (settings?.annee_reference && facturesRows?.length) {
    const pcs = settings.pouvoir_calorifique_mj_m3 ?? PCS_DEFAUT_MJ_M3;
    const normInput: FactureNorm[] = facturesRows
      .filter((f) => f.date_debut && f.date_fin)
      .map((f) => ({
        source: f.source as "gaz" | "elec",
        compteur: f.numero_compteur ?? "",
        debut: new Date(`${f.date_debut}T00:00:00Z`),
        fin: new Date(`${f.date_fin}T00:00:00Z`),
        consommation: f.consommation, // null = « manquant », jamais estimé
        coutAvtx: f.montant_avtx,
      }));
    txtFactures = facturesTexte(normaliser(normInput, settings.annee_reference), pcs);
  }

  return {
    donnees: sourceData({
      building: buildingRow,
      cards: cards ?? [],
      facturesTexte: txtFactures,
    }),
    batimentConfirme: !!buildingRow,
  };
}
