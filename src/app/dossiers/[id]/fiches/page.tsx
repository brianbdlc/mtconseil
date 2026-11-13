import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import StatutBadge from "@/components/StatutBadge";
import { idLabels } from "@/lib/equipmentId";
import { addCard, moveCard } from "./actions";

export const instant = false;

export default async function FichesPage({
  params,
}: PageProps<"/dossiers/[id]/fiches">) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();

  const { data: cards } = await supabase
    .from("equipment_cards")
    .select("id, titre, statut, position, nb_unites")
    .eq("project_id", id)
    .order("position", { ascending: true });

  const ids = idLabels(cards ?? []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-navy">
          Fiches d&apos;équipement
        </h2>
        <form action={addCard.bind(null, id)}>
          <button
            type="submit"
            className="h-11 rounded-md bg-amber px-4 text-sm font-medium text-navy hover:bg-amber-hover"
          >
            + Ajouter un équipement
          </button>
        </form>
      </div>

      {!cards?.length ? (
        <p className="text-sm text-n500">
          Aucune fiche. Ajoutez un premier équipement.
        </p>
      ) : (
        <ul className="divide-y divide-n200 rounded-md border border-n200 bg-n0">
          {cards.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-n50">
              {/* N° section 3.x + ID (plage) calculés à l'affichage selon l'ordre (R8). */}
              <span className="font-mono text-sm text-n500">3.{i + 1}</span>
              <Link
                href={`/dossiers/${id}/fiches/${c.id}`}
                className="flex-1 text-navy hover:underline"
              >
                {c.titre?.trim() || (
                  <span className="text-n500 italic">Sans titre</span>
                )}
              </Link>
              <span className="font-mono text-xs text-n500">ID {ids[i]}</span>
              <StatutBadge statut={c.statut} />
              <div className="flex">
                <form action={moveCard.bind(null, c.id, id, "up")}>
                  <button
                    type="submit"
                    disabled={i === 0}
                    aria-label="Monter la fiche"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-n500 hover:bg-n100 disabled:opacity-30"
                  >
                    ↑
                  </button>
                </form>
                <form action={moveCard.bind(null, c.id, id, "down")}>
                  <button
                    type="submit"
                    disabled={i === cards.length - 1}
                    aria-label="Descendre la fiche"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-n500 hover:bg-n100 disabled:opacity-30"
                  >
                    ↓
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
