import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import RedactionForm, { type SectionVM, type AutreVM } from "./RedactionForm";

export const instant = false;

export default async function RedactionPage({
  params,
}: PageProps<"/dossiers/[id]/redaction">) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();

  const { data: types } = await supabase
    .from("section_types")
    .select("id, titre, zone, ordre, instructions, notes_actives, requiert_batiment")
    .eq("actif", true)
    .order("zone", { ascending: true })
    .order("ordre", { ascending: true });

  const { data: rows } = await supabase
    .from("report_sections")
    .select("id, section_type_id, titre, notes, texte, statut")
    .eq("project_id", id)
    .order("created_at", { ascending: true });
  const bySection = new Map(
    (rows ?? []).filter((r) => r.section_type_id).map((r) => [r.section_type_id, r]),
  );

  // Sections « Autre » ad hoc (sans section_type_id), dans l'ordre de création.
  const autres: AutreVM[] = (rows ?? [])
    .filter((r) => !r.section_type_id)
    .map((r) => ({
      id: r.id,
      titre: r.titre ?? "Autre",
      notes: r.notes ?? "",
      texte: r.texte ?? "",
      statut: r.statut ?? "brouillon",
    }));

  const { data: building } = await supabase
    .from("building_description")
    .select("statut")
    .eq("project_id", id)
    .maybeSingle();
  const batimentConfirme = building?.statut === "confirme";

  // Décompte des fiches (confirmées / brouillon) pour signaler ce qui sera ignoré (US-23).
  const { data: cards } = await supabase
    .from("equipment_cards")
    .select("statut")
    .eq("project_id", id);
  const fichesBrouillon = (cards ?? []).filter((c) => c.statut !== "confirme").length;

  const sections: SectionVM[] = (types ?? []).map((t) => {
    const r = bySection.get(t.id);
    return {
      typeId: t.id,
      titre: t.titre,
      zone: t.zone,
      notesActives: t.notes_actives,
      requiertBatiment: t.requiert_batiment,
      notes: r?.notes ?? "",
      texte: r?.texte ?? "",
      statut: r?.statut ?? "brouillon",
    };
  });

  return (
    <RedactionForm
      projectId={id}
      sections={sections}
      autres={autres}
      batimentConfirme={batimentConfirme}
      fichesBrouillon={fichesBrouillon}
    />
  );
}
