import Link from "next/link";
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
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
      <Link
        href="/dossiers"
        className="text-sm text-n500 underline underline-offset-4"
      >
        ← Dossiers
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-navy">
        {data.numero_projet?.trim() || "Dossier"}
      </h1>

      <EditForm
        id={id}
        initial={{
          numero_projet: data.numero_projet ?? "",
          client_nom: data.client_nom ?? "",
          client_adresse: data.client_adresse ?? "",
          type_service: data.type_service ?? "",
        }}
      />
    </main>
  );
}
