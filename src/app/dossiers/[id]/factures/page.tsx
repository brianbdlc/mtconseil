import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PCS_DEFAUT_MJ_M3 } from "@/lib/energyParams";
import FacturesClient from "./FacturesClient";
import type { FactureRow } from "./actions";

export const instant = false;

export default async function FacturesPage({
  params,
}: PageProps<"/dossiers/[id]/factures">) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: settings }, { data: factures }] = await Promise.all([
    supabase
      .from("energy_settings")
      .select("pouvoir_calorifique_mj_m3, annee_reference, titre_apercu")
      .eq("project_id", id)
      .maybeSingle(),
    supabase
      .from("factures")
      .select("id, source, numero_compteur, date_debut, date_fin, consommation, montant_ttc, montant_avtx, montant_avtx_manuel, puissance_appelee, fichier_path, statut, position")
      .eq("project_id", id)
      .order("position", { ascending: true }),
  ]);

  return (
    <FacturesClient
      projectId={id}
      initialRows={(factures ?? []) as FactureRow[]}
      initialPcs={settings?.pouvoir_calorifique_mj_m3 ?? PCS_DEFAUT_MJ_M3}
      initialAnnee={settings?.annee_reference ?? null}
      initialTitre={settings?.titre_apercu ?? ""}
    />
  );
}
