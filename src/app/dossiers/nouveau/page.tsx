import Link from "next/link";
import { createDossier } from "../actions";

const CHAMPS = [
  { name: "numero_projet", label: "Numéro de projet", placeholder: "P00412" },
  { name: "client_nom", label: "Nom du client" },
  { name: "client_adresse", label: "Adresse du client" },
  { name: "type_service", label: "Type de service", placeholder: "ÉTUDE ÉNERGÉTIQUE" },
] as const;

export default function NouveauDossierPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
      <Link
        href="/dossiers"
        className="text-sm text-n500 underline underline-offset-4"
      >
        ← Dossiers
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-navy">
        Nouveau dossier
      </h1>

      <form action={createDossier} className="mt-8 flex flex-col gap-4">
        {CHAMPS.map((c) => (
          <label key={c.name} className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-navy">{c.label}</span>
            <input
              name={c.name}
              placeholder={"placeholder" in c ? c.placeholder : undefined}
              className="h-11 rounded-md border border-n200 bg-n0 px-3 text-navy outline-none focus:border-navy"
            />
          </label>
        ))}
        <button
          type="submit"
          className="mt-2 h-11 rounded-md bg-amber px-4 font-medium text-navy transition-colors hover:bg-amber-hover"
        >
          Créer le dossier
        </button>
      </form>
    </main>
  );
}
