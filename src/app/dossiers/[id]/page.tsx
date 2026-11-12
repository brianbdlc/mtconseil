import { connection } from "next/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditForm from "./EditForm";

export const instant = false;

export default async function DossierPage({
  params,
}: PageProps<"/dossiers/[id]">) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("projects")
    .select("numero_projet, client_nom, client_adresse, type_service")
    .eq("id", id)
    .single();

  if (!data) notFound();

  return (
    <div className="max-w-xl">
      <EditForm
        id={id}
        initial={{
          numero_projet: data.numero_projet ?? "",
          client_nom: data.client_nom ?? "",
          client_adresse: data.client_adresse ?? "",
          type_service: data.type_service ?? "",
        }}
      />
    </div>
  );
}
