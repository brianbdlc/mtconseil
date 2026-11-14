// Appel Claude — SERVEUR UNIQUEMENT (importé seulement depuis des "use server").
// ANTHROPIC_API_KEY sans préfixe NEXT_PUBLIC_, jamais exposée au client.
// L'IA lit et rédige, le code calcule (R6), et n'invente jamais (R5) : règles ci-dessous.

import Anthropic from "@anthropic-ai/sdk";

export { aMarqueurManquant } from "./marqueur";

// Un seul identifiant de modèle, changeable facilement (vérifié contre la doc Anthropic).
// « Sonnet 5.5 » n'existe pas : le dernier Sonnet est Sonnet 5 (claude-sonnet-5).
export const MODEL = "claude-sonnet-5";

export type GenResult = { ok: true; texte: string } | { ok: false; message: string };

const SYSTEM_BASE = `Tu rédiges des sections de rapports d'audit énergétique pour MT Conseil, un cabinet d'ingénierie québécois. Ton : sérieux, technique, factuel, en français du Québec.

Règles absolues :
- N'écris QUE ce qui est présent dans les données confirmées ou les notes de l'ingénieur. N'invente aucune donnée, aucun chiffre, aucun fait.
- Pour toute information manquante nécessaire à la rédaction, insère exactement le marqueur « [Information manquante : … ] » (en remplaçant … par ce qui manque). N'invente jamais pour combler un vide.
- Ne calcule jamais (totaux, moyennes, conversions) : les calculs sont faits ailleurs. Reprends les chiffres tels quels.
- Formats français : virgule décimale, espace pour les milliers, « $ » après le montant, « (av.tx) » pour avant taxes.
- Structure avec du markdown léger : « # » pour un sous-titre de niveau 2, « ## » pour un sous-titre de niveau 3, « - » pour une puce. Pas de gras/italique, pas de tableaux.`;

export async function genererSection({
  instructions,
  notes,
  donnees,
}: {
  instructions: string;
  notes: string;
  donnees: string;
}): Promise<GenResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, message: "ANTHROPIC_API_KEY manquante côté serveur." };

  const system = `${SYSTEM_BASE}\n\nInstructions de rédaction pour cette section :\n${instructions.trim() || "(aucune)"}`;
  const user = `Données confirmées du dossier :\n${donnees.trim() || "(aucune donnée confirmée)"}\n\nNotes de visite de l'ingénieur :\n${notes.trim() || "(aucune note)"}\n\nRédige la section à partir de ces seuls éléments.`;

  try {
    const client = new Anthropic({ apiKey: key });
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system,
      messages: [{ role: "user", content: user }],
    });
    const texte = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!texte) return { ok: false, message: "Réponse vide du modèle." };
    return { ok: true, texte };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur d'appel à Claude.";
    console.error("genererSection:", message);
    return { ok: false, message };
  }
}
