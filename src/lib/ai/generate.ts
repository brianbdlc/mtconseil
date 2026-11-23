// Appel Claude — SERVEUR UNIQUEMENT (importé seulement depuis des "use server").
// ANTHROPIC_API_KEY sans préfixe NEXT_PUBLIC_, jamais exposée au client.
// L'IA lit et rédige, le code calcule (R6), et n'invente jamais (R5) : règles ci-dessous.

import Anthropic from "@anthropic-ai/sdk";
import { parseDateFr } from "../factures/parseDate";

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

// --- Phase 7b : lecture assistée des factures PDF ---------------------------
// L'IA transcrit ce qui est écrit sur la facture (R5 : jamais inventé) ; le code
// valide le format et fait tous les calculs, dont l'av.tx (R6). Transitoire :
// rien n'est stocké, les propositions ne font que pré-remplir le brouillon.

type Confiance = "haute" | "moyenne" | "basse";
type Champ = { valeur: string | null; confiance: Confiance };

export type FactureProposition = {
  source: Champ;
  numero_compteur: Champ;
  date_debut: Champ;
  date_fin: Champ;
  consommation: Champ;
  montant_ttc: Champ;
  puissance_appelee: Champ;
};

const CHAMPS = [
  "source",
  "numero_compteur",
  "date_debut",
  "date_fin",
  "consommation",
  "montant_ttc",
  "puissance_appelee",
] as const;

// Le modèle varie : valeur string OU number, confiance catégorielle OU score 0–1.
function toConfiance(c: unknown): Confiance {
  if (c === "haute" || c === "moyenne" || c === "basse") return c;
  if (typeof c === "number") return c >= 0.8 ? "haute" : c >= 0.5 ? "moyenne" : "basse";
  return "basse";
}
function champ(v: unknown): Champ {
  const o = (v ?? {}) as { valeur?: unknown; confiance?: unknown };
  const valeur =
    typeof o.valeur === "string"
      ? o.valeur.trim() || null
      : typeof o.valeur === "number" && Number.isFinite(o.valeur)
        ? String(o.valeur)
        : null;
  return { valeur, confiance: toConfiance(o.confiance) };
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Normalise une date proposée → AAAA-MM-JJ, sinon null (jamais inventé, R5).
function normDate(c: Champ): Champ {
  if (!c.valeur) return c;
  if (ISO.test(c.valeur)) return c;
  const r = parseDateFr(c.valeur, null);
  return { ...c, valeur: r.ok ? r.iso : null };
}

/**
 * Parse pur (R6) : extrait le premier objet JSON du texte, valide/normalise le format.
 * Jamais de calcul, jamais d'invention : une valeur illisible → null.
 */
export function parseFactureProposition(jsonText: string): FactureProposition | null {
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(jsonText.slice(start, end + 1));
  } catch {
    return null;
  }

  const p = Object.fromEntries(CHAMPS.map((k) => [k, champ(raw[k])])) as FactureProposition;

  // source ∈ {gaz, elec} sinon null
  if (p.source.valeur !== "gaz" && p.source.valeur !== "elec") p.source.valeur = null;
  p.date_debut = normDate(p.date_debut);
  p.date_fin = normDate(p.date_fin);
  // nombres : on garde la chaîne telle que lue (point ou virgule) ; non numérique → null.
  for (const k of ["consommation", "montant_ttc", "puissance_appelee"] as const) {
    const v = p[k].valeur;
    if (v != null && !/\d/.test(v)) p[k].valeur = null;
  }
  return p;
}

const PROMPT_LECTURE = `Tu transcris les valeurs écrites sur une facture d'énergie (Énergir gaz naturel ou Hydro-Québec électricité) du Québec.

Règles absolues :
- Transcris UNIQUEMENT ce qui est écrit. Ne calcule rien (pas de montant avant taxes, pas de conversion). N'invente rien.
- Toute valeur absente ou illisible → "valeur": null.
- confiance : "haute" si la valeur est clairement lisible et sans ambiguïté, "moyenne" si probable, "basse" si incertaine.
- Dates au format AAAA-MM-JJ.
- source : "gaz" (Énergir, m³) ou "elec" (Hydro-Québec, kWh).
- consommation : le volume facturé de la PÉRIODE COURANTE (m³ pour le gaz, kWh pour l'élec) — pas le total annuel.
- montant_ttc : le montant facturé pour la PÉRIODE COURANTE, taxes incluses (le « montant courant »). Surtout PAS le « montant total à payer » ni le « solde précédent » qui incluent une dette reportée d'une facture antérieure.
- puissance_appelee : en kW, électricité seulement (null pour le gaz).

Réponds UNIQUEMENT avec un objet JSON, sans texte autour :
{"source":{"valeur":"gaz|elec|null","confiance":"haute|moyenne|basse"},"numero_compteur":{...},"date_debut":{...},"date_fin":{...},"consommation":{...},"montant_ttc":{...},"puissance_appelee":{...}}`;

export async function analyseFacturePdf(
  pdfBase64: string,
): Promise<{ ok: true; proposition: FactureProposition } | { ok: false; message: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, message: "ANTHROPIC_API_KEY manquante côté serveur." };

  try {
    const client = new Anthropic({ apiKey: key });
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      thinking: { type: "adaptive" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
            },
            { type: "text", text: PROMPT_LECTURE },
          ],
        },
      ],
    });
    const texte = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const proposition = parseFactureProposition(texte);
    if (!proposition) return { ok: false, message: "Réponse du modèle illisible." };
    return { ok: true, proposition };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur d'appel à Claude.";
    console.error("analyseFacturePdf:", message);
    return { ok: false, message };
  }
}
