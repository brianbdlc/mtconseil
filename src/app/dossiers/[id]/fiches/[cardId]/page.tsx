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
    .select("titre, intro, fields, statut")
    .eq("id", cardId)
    .single();
  if (!card) notFound();

  // Rang d'affichage (3.x + ID) selon l'ordre `position` (R8), calculé, jamais stocké.
  const { data: siblings } = await supabase
    .from("equipment_cards")
    .select("id")
    .eq("project_id", id)
    .order("position", { ascending: true });
  const ordinal = (siblings?.findIndex((s) => s.id === cardId) ?? 0) + 1;

  return (
    <FicheForm
      projectId={id}
      cardId={cardId}
      ordinal={ordinal}
      initial={{
        titre: card.titre ?? "",
        intro: card.intro ?? "",
        fields: parseCardFields(card.fields),
        statut: card.statut,
      }}
    />
  );
}
