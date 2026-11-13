import { connection } from "next/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseCardFields } from "@/lib/field";
import FicheForm from "./FicheForm";

export const instant = false;

export default async function CardPage({
  params,
}: PageProps<"/dossiers/[id]/fiches/[cardId]">) {
  await connection();
  const { id, cardId } = await params;
  const supabase = await createClient();

  const { data: card } = await supabase
    .from("equipment_cards")
    .select("*")
    .eq("id", cardId)
    .single();
  if (!card) notFound();

  // Rang d'affichage (3.x) + ID de départ (plage, US-9) selon l'ordre `position` (R8),
  // calculés, jamais stockés : startId = somme des unités des fiches précédentes + 1.
  const { data: siblings } = await supabase
    .from("equipment_cards")
    .select("id, nb_unites")
    .eq("project_id", id)
    .order("position", { ascending: true });
  const idx = siblings?.findIndex((s) => s.id === cardId) ?? 0;
  const ordinal = idx + 1;
  const startId =
    (siblings ?? [])
      .slice(0, idx)
      .reduce((sum, s) => sum + Math.max(1, Math.floor(s.nb_unites || 1)), 0) + 1;

  const { data: photos } = await supabase
    .from("card_photos")
    .select("id, storage_path, titre")
    .eq("card_id", cardId)
    .order("position", { ascending: true });

  return (
    <FicheForm
      projectId={id}
      cardId={cardId}
      ordinal={ordinal}
      startId={startId}
      photos={photos ?? []}
      initial={{
        titre: card.titre ?? "",
        intro: card.intro ?? "",
        fields: parseCardFields(card),
        statut: card.statut,
      }}
    />
  );
}
