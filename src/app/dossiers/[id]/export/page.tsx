import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const confirmees = cards?.filter((c) => c.statut === "confirme").length ?? 0;
  const brouillons = (cards?.length ?? 0) - confirmees;

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h2 className="font-display text-lg font-bold text-navy">
        Export Word (.docx)
      </h2>

      {/* Checklist légère (la checklist complète = Phase 10). */}
      <ul className="flex flex-col gap-1.5 text-sm text-navy">
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
      </ul>

      <a
        href={`/dossiers/${id}/export/download`}
        className={`inline-flex h-11 w-fit items-center rounded-md px-4 text-sm font-medium ${
          confirmees > 0
            ? "bg-amber text-navy hover:bg-amber-hover"
            : "pointer-events-none bg-n100 text-n500"
        }`}
        aria-disabled={confirmees === 0}
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
