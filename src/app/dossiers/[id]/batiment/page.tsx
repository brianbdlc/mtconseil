import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildingPhotos, parseBuildingRow } from "@/lib/building";
import BatimentForm from "./BatimentForm";

export const instant = false;

export default async function BatimentPage({
  params,
}: PageProps<"/dossiers/[id]/batiment">) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("building_description")
    .select("*")
    .eq("project_id", id)
    .maybeSingle();

  if (error) {
    console.error("batiment load:", error.code, error.message, error.details, error.hint);
  }

  return (
    <BatimentForm
      projectId={id}
      initial={parseBuildingRow(row)}
      statut={row?.statut ?? "brouillon"}
      photos={buildingPhotos(row)}
      loadError={error ? `${error.code} — ${error.message}` : null}
    />
  );
}
