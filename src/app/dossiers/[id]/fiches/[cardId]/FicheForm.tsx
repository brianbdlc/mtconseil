"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useAutosave } from "@/lib/useAutosave";
import { afficher, type CardFields } from "@/lib/field";
import type { Json } from "@/lib/supabase/database.types";
import Field3State from "@/components/Field3State";
import StatutBadge from "@/components/StatutBadge";
import { updateCard, confirmCard, setStatut as setStatutAction, deleteCard } from "../actions";

const LIBELLE: Record<string, string> = {
  idle: "",
  saving: "Enregistrement…",
  saved: "Enregistré",
  error: "Échec de l'enregistrement",
};

export default function FicheForm({
  projectId,
  cardId,
  ordinal,
  initial,
}: {
  projectId: string;
  cardId: string;
  ordinal: number;
  initial: { titre: string; intro: string; fields: CardFields; statut: string };
}) {
  const [titre, setTitre] = useState(initial.titre);
  const [intro, setIntro] = useState(initial.intro);
  const [fields, setFields] = useState<CardFields>(initial.fields);
  const [statut, setStatut] = useState(initial.statut);
  const [pending, startTransition] = useTransition();

  // R1 : une fiche confirmée est verrouillée. On la rouvre explicitement pour éditer,
  // puis on la re-confirme — même position, donc même n° 3.x.
  const locked = statut === "confirme";

  const payload = useMemo(() => ({ titre, intro, fields }), [titre, intro, fields]);
  const save = useAutosave(payload, (v) =>
    updateCard(cardId, projectId, {
      titre: v.titre,
      intro: v.intro,
      fields: v.fields as unknown as Json,
    }),
  );

  function confirmer() {
    startTransition(async () => {
      await confirmCard(cardId, projectId, {
        titre,
        intro,
        fields: fields as unknown as Json,
      });
      setStatut("confirme");
    });
  }

  function rouvrir() {
    startTransition(async () => {
      await setStatutAction(cardId, projectId, "brouillon");
      setStatut("brouillon");
    });
  }

  const sectionNo = `3.${ordinal}`;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {/* Édition */}
      <div className="flex w-full max-w-xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link
            href={`/dossiers/${projectId}/fiches`}
            className="text-sm text-n500 underline underline-offset-4"
          >
            ← Fiches
          </Link>
          <div className="flex items-center gap-3">
            <StatutBadge statut={statut} />
            <span className="h-4 text-xs text-n500" aria-live="polite">
              {LIBELLE[save]}
            </span>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Titre de la fiche</span>
          <input
            value={titre}
            disabled={locked}
            onChange={(e) => setTitre(e.target.value)}
            className="h-11 rounded-md border border-n200 bg-n0 px-3 text-navy outline-none focus:border-navy disabled:bg-n50 disabled:text-n500"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Texte d&apos;introduction</span>
          <textarea
            value={intro}
            rows={4}
            disabled={locked}
            onChange={(e) => setIntro(e.target.value)}
            className="rounded-md border border-n200 bg-n0 px-3 py-2 text-navy outline-none focus:border-navy disabled:bg-n50 disabled:text-n500"
          />
        </label>

        <Field3State
          label="Description"
          value={fields.description}
          disabled={locked}
          onChange={(f) => setFields((s) => ({ ...s, description: f }))}
        />
        <Field3State
          label="Marque / modèle"
          value={fields.marque_modele}
          disabled={locked}
          onChange={(f) => setFields((s) => ({ ...s, marque_modele: f }))}
        />

        <div className="mt-2 flex items-center justify-between">
          {locked ? (
            <button
              type="button"
              onClick={rouvrir}
              disabled={pending}
              className="h-11 rounded-md border border-navy px-4 text-sm font-medium text-navy hover:bg-n50 disabled:opacity-50"
            >
              Rouvrir pour modifier
            </button>
          ) : (
            <button
              type="button"
              onClick={confirmer}
              disabled={pending || save === "saving"}
              className="h-11 rounded-md bg-amber px-4 text-sm font-medium text-navy hover:bg-amber-hover disabled:opacity-50"
            >
              Confirmer la fiche
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              if (confirm("Supprimer cette fiche ?"))
                await deleteCard(cardId, projectId);
            }}
            className="text-sm text-error underline underline-offset-4"
          >
            Supprimer
          </button>
        </div>
        {locked && (
          <p className="text-xs text-success">
            Fiche confirmée — incluse dans l&apos;export. Rouvrez-la pour la modifier.
          </p>
        )}
      </div>

      {/* Aperçu simple dans le gabarit */}
      <aside className="w-full flex-1 rounded-md border border-n200 bg-n0 p-6">
        <p className="mb-3 text-xs font-medium tracking-wide text-n500 uppercase">
          Aperçu
        </p>
        <h3 className="font-display text-base font-bold text-navy">
          <span className="font-mono text-n500">{sectionNo}</span>{" "}
          {titre.trim() || "Sans titre"}
        </h3>
        {intro.trim() && <p className="mt-2 text-sm text-navy">{intro}</p>}
        <table className="mt-4 w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-n200">
              <th className="bg-n50 px-3 py-1.5 text-left font-medium text-navy">ID</th>
              <td className="px-3 py-1.5 font-mono text-navy">{ordinal}</td>
            </tr>
            <tr className="border-b border-n200">
              <th className="bg-n50 px-3 py-1.5 text-left font-medium text-navy">
                Description
              </th>
              <td className="px-3 py-1.5 text-navy">{afficher(fields.description)}</td>
            </tr>
            <tr>
              <th className="bg-n50 px-3 py-1.5 text-left font-medium text-navy">
                Marque / modèle
              </th>
              <td className="px-3 py-1.5 text-navy">{afficher(fields.marque_modele)}</td>
            </tr>
          </tbody>
        </table>
      </aside>
    </div>
  );
}
