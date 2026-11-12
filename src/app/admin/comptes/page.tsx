import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateForm from "./CreateForm";

type Compte = { id: string; email: string | null; role: string };

export const instant = false;

export default async function ComptesPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/dossiers");

  const { data: comptes } = await supabase
    .from("profiles")
    .select("id, email, role")
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <Link
        href="/dossiers"
        className="text-sm text-n500 underline underline-offset-4"
      >
        ← Dossiers
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-navy">Comptes</h1>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-n500">
          Nouveau compte
        </h2>
        <div className="mt-4">
          <CreateForm />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-n500">
          Comptes existants
        </h2>
        <ul className="mt-4 flex flex-col divide-y divide-n100 rounded-md border border-n200 bg-n0">
          {(comptes as Compte[] | null)?.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-navy">{c.email ?? "—"}</span>
              <span className="text-xs font-medium uppercase text-n500">
                {c.role}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
