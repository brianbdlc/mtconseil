import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Tabs from "./Tabs";

export default async function DossierLayout({
  children,
  params,
}: LayoutProps<"/dossiers/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("numero_projet, client_nom")
    .eq("id", id)
    .single();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <Link
        href="/dossiers"
        className="text-sm text-n500 underline underline-offset-4"
      >
        ← Dossiers
      </Link>
      <div className="mt-4 mb-6">
        <h1 className="font-display text-2xl font-bold text-navy">
          {data?.numero_projet?.trim() || "Dossier"}
        </h1>
        {data?.client_nom?.trim() && (
          <p className="text-sm text-n500">{data.client_nom}</p>
        )}
      </div>

      <Tabs id={id} />

      <div className="mt-8">{children}</div>
    </main>
  );
}
