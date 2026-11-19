import { connection } from "next/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PCS_DEFAUT_MJ_M3 } from "@/lib/energyParams";
import FactureForm from "./FactureForm";

export const instant = false;

export default async function FacturePage({
  params,
}: PageProps<"/dossiers/[id]/factures/[factureId]">) {
  await connection();
  const { id, factureId } = await params;
  const supabase = await createClient();

  const { data: facture } = await supabase
    .from("factures")
    .select("*")
    .eq("id", factureId)
    .single();
  if (!facture) notFound();

  const { data: settings } = await supabase
    .from("energy_settings")
    .select("pouvoir_calorifique_mj_m3")
    .eq("project_id", id)
    .maybeSingle();

  return (
    <FactureForm
      projectId={id}
      factureId={factureId}
      initialPcs={settings?.pouvoir_calorifique_mj_m3 ?? PCS_DEFAUT_MJ_M3}
      initial={{
        source: (facture.source as "gaz" | "elec") ?? "gaz",
        compteur: facture.numero_compteur ?? "",
        debut: facture.date_debut ?? "",
        fin: facture.date_fin ?? "",
        conso: facture.consommation != null ? String(facture.consommation) : "",
        ttc: facture.montant_ttc != null ? String(facture.montant_ttc) : "",
        avtx: facture.montant_avtx != null ? String(facture.montant_avtx) : "",
        avtxManuel: facture.montant_avtx_manuel ?? false,
        puissance: facture.puissance_appelee != null ? String(facture.puissance_appelee) : "",
        statut: facture.statut,
        fichierPath: facture.fichier_path ?? null,
        fichierType: facture.fichier_type ?? null,
      }}
    />
  );
}
