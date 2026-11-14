import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SectionsAdmin, { type TypeRow, type VersionRow } from "./SectionsAdmin";

export const instant = false;

export default async function SectionsPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/dossiers");

  const { data: types } = await supabase
    .from("section_types")
    .select("*")
    .order("zone", { ascending: true })
    .order("ordre", { ascending: true });

  const { data: versions } = await supabase
    .from("section_type_versions")
    .select("id, section_type_id, titre, instructions, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <Link href="/dossiers" className="text-sm text-n500 underline underline-offset-4">
        ← Dossiers
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-navy">Types de section</h1>
      <p className="mt-1 text-sm text-n500">
        Titre, emplacement et instructions de rédaction. Chaque modification est historisée.
      </p>
      <div className="mt-8">
        <SectionsAdmin
          types={(types ?? []) as TypeRow[]}
          versions={(versions ?? []) as VersionRow[]}
        />
      </div>
    </main>
  );
}
