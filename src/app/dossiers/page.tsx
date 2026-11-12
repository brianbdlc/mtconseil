import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

type Row = {
  id: string;
  numero_projet: string | null;
  client_nom: string | null;
  type_service: string | null;
  updated_at: string;
  createur: { email: string | null } | null;
};

// Route dynamique (session par requête) : pas de prérendu. connection() marque
// l'accès runtime, instant=false autorise la route bloquante au build.
export const instant = false;

function afficher(v: string | null) {
  return v && v.trim() ? v : "n/d";
}

export default async function DossiersPage() {
  await connection(); // rendu à la requête : lit la session (cookies/Date.now).
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: projects }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
    supabase
      .from("projects")
      .select(
        "id, numero_projet, client_nom, type_service, updated_at, createur:profiles!projects_created_by_fkey(email)",
      )
      .order("updated_at", { ascending: false }),
  ]);

  const rows = (projects ?? []) as unknown as Row[];
  const isAdmin = profile?.role === "admin";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-navy">Dossiers</h1>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin/comptes"
              className="text-sm font-medium text-navy underline underline-offset-4"
            >
              Comptes
            </Link>
          )}
          <Link
            href="/dossiers/nouveau"
            className="h-10 rounded-md bg-amber px-4 text-sm font-medium leading-10 text-navy transition-colors hover:bg-amber-hover"
          >
            Nouveau dossier
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="h-10 rounded-md border border-n200 px-4 text-sm font-medium text-navy hover:bg-n100"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="mt-10 text-n500">
          Aucun dossier. Créez-en un avec « Nouveau dossier ».
        </p>
      ) : (
        <ul className="mt-8 flex flex-col divide-y divide-n100 rounded-md border border-n200 bg-n0">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/dossiers/${r.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-n50 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                  <span className="font-mono text-sm text-navy">
                    {afficher(r.numero_projet)}
                  </span>
                  <span className="font-medium text-navy">
                    {afficher(r.client_nom)}
                  </span>
                  <span className="text-sm text-n500">
                    {afficher(r.type_service)}
                  </span>
                </span>
                <span className="text-xs text-n500">
                  {r.createur?.email ?? "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
