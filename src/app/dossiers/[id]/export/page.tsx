import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chargerDonnees } from "@/lib/report/sourceSnapshot";
import { sourceHash, estPerime } from "@/lib/ai/sourceData";

export const instant = false;

export default async function ExportPage({
  params,
}: PageProps<"/dossiers/[id]/export">) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();

  const { data: cards } = await supabase
    .from("equipment_cards")
    .select("statut")
    .eq("project_id", id);

  const { data: building } = await supabase
    .from("building_description")
    .select("statut")
    .eq("project_id", id)
    .maybeSingle();

  const confirmees = cards?.filter((c) => c.statut === "confirme").length ?? 0;
  const brouillons = (cards?.length ?? 0) - confirmees;
  const descriptionConfirmee = building?.statut === "confirme";

  // US-28 : sections confirmées mais périmées → export bloqué.
  const { data: sectionRows } = await supabase
    .from("report_sections")
    .select("titre, statut, source_hash_confirme, section_types(titre)")
    .eq("project_id", id)
    .eq("statut", "confirme");
  const hashCourant = sourceHash((await chargerDonnees(supabase, id)).donnees);
  const perimees = (sectionRows ?? [])
    .filter((r) => estPerime(r.statut, r.source_hash_confirme, hashCourant))
    .map((r) => {
      const st = r.section_types as unknown as { titre: string } | null;
      return st?.titre || r.titre?.trim() || "Section";
    });
  const exportBloque = confirmees === 0 || perimees.length > 0;

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h2 className="font-display text-lg font-bold text-navy">
        Export Word (.docx)
      </h2>

      {/* Checklist légère (la checklist complète = Phase 10). */}
      <ul className="flex flex-col gap-1.5 text-sm text-navy">
        <li className={descriptionConfirmee ? "" : "text-warning"}>
          {descriptionConfirmee
            ? "Description du bâtiment confirmée — incluse au rapport."
            : "Description du bâtiment non confirmée — section vide à l'export."}
        </li>
        <li>
          <span className="font-medium">{confirmees}</span> fiche
          {confirmees > 1 ? "s" : ""} confirmée{confirmees > 1 ? "s" : ""} —
          incluse{confirmees > 1 ? "s" : ""} au rapport.
        </li>
        {brouillons > 0 && (
          <li className="text-warning">
            {brouillons} fiche{brouillons > 1 ? "s" : ""} en brouillon — exclue
            {brouillons > 1 ? "s" : ""} de l&apos;export.
          </li>
        )}
        {perimees.length > 0 && (
          <li className="text-warning">
            Données modifiées depuis la confirmation — reconfirmez avant l&apos;export :{" "}
            {perimees.join(", ")}.
          </li>
        )}
      </ul>

      <a
        href={`/dossiers/${id}/export/download`}
        className={`inline-flex h-11 w-fit items-center rounded-md px-4 text-sm font-medium ${
          exportBloque
            ? "pointer-events-none bg-n100 text-n500"
            : "bg-amber text-navy hover:bg-amber-hover"
        }`}
        aria-disabled={exportBloque}
      >
        Télécharger le .docx
      </a>
      {confirmees === 0 && (
        <p className="text-sm text-n500">
          Confirmez au moins une fiche pour exporter.
        </p>
      )}
    </div>
  );
}
