"use client";

import { useState, useTransition } from "react";
import { useAutosave } from "@/lib/useAutosave";
import StatutBadge from "@/components/StatutBadge";
import { aMarqueurManquant } from "@/lib/ai/marqueur";
import {
  confirmSection,
  generer,
  saveNotes,
  saveTexte,
  setSectionStatut,
  ajouterAutre,
  renameAutre,
  saveNotesById,
  saveTexteById,
  confirmById,
  setStatutById,
  supprimerAutre,
  genererById,
} from "./actions";

export type SectionVM = {
  typeId: string;
  titre: string;
  zone: string;
  notesActives: boolean;
  requiertBatiment: boolean;
  notes: string;
  texte: string;
  statut: string;
};
export type AutreVM = { id: string; titre: string; notes: string; texte: string; statut: string };

const LIBELLE: Record<string, string> = {
  idle: "",
  saving: "Enregistrement…",
  saved: "Enregistré",
  error: "Échec de l'enregistrement",
};

type Runtime = { notes: string; texte: string; statut: string };

export default function RedactionForm({
  projectId,
  sections,
  autres: autresInit,
  batimentConfirme,
  fichesBrouillon,
}: {
  projectId: string;
  sections: SectionVM[];
  autres: AutreVM[];
  batimentConfirme: boolean;
  fichesBrouillon: number;
}) {
  const [rt, setRt] = useState<Record<string, Runtime>>(() =>
    Object.fromEntries(
      sections.map((s) => [s.typeId, { notes: s.notes, texte: s.texte, statut: s.statut }]),
    ),
  );
  const patch = (typeId: string, p: Partial<Runtime>) =>
    setRt((s) => ({ ...s, [typeId]: { ...s[typeId], ...p } }));

  const [autres, setAutres] = useState<AutreVM[]>(autresInit);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [adding, startAdd] = useTransition();
  function addAutre() {
    startAdd(async () => {
      const r = await ajouterAutre(projectId);
      if (!r.ok) {
        setAddErr(r.message);
        return;
      }
      setAddErr(null);
      setAutres((a) => [...a, { id: r.id, titre: "Autre", notes: "", texte: "", statut: "brouillon" }]);
    });
  }

  const bloque = (s: SectionVM) => s.requiertBatiment && !batimentConfirme;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-navy">Rédaction par l&apos;IA</h2>
      </div>

      <FinirSaisie
        projectId={projectId}
        sections={sections}
        bloque={bloque}
        batimentConfirme={batimentConfirme}
        fichesBrouillon={fichesBrouillon}
        onGenerated={(typeId, texte) => patch(typeId, { texte, statut: "brouillon" })}
      />

      {sections.length === 0 && (
        <p className="text-sm text-n500">
          Aucun type de section actif. L&apos;administrateur les gère dans « Types de section ».
        </p>
      )}

      {sections.map((s) => (
        <SectionCard
          key={s.typeId}
          projectId={projectId}
          vm={s}
          value={rt[s.typeId]}
          disabled={bloque(s)}
          onChange={(p) => patch(s.typeId, p)}
        />
      ))}

      {autres.map((a) => (
        <AutreCard
          key={a.id}
          projectId={projectId}
          value={a}
          onChange={(p) => setAutres((list) => list.map((x) => (x.id === a.id ? { ...x, ...p } : x)))}
          onDelete={() => setAutres((list) => list.filter((x) => x.id !== a.id))}
        />
      ))}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={addAutre}
          disabled={adding}
          className="h-10 self-start rounded-md border border-navy px-4 text-sm font-medium text-navy hover:bg-n50 disabled:opacity-50"
        >
          + Autre
        </button>
        {addErr && <p className="text-sm text-error">{addErr}</p>}
      </div>
    </div>
  );
}

// Section « Autre » ad hoc : titre modifiable, sinon identique à une section normale.
function AutreCard({
  projectId,
  value,
  onChange,
  onDelete,
}: {
  projectId: string;
  value: AutreVM;
  onChange: (p: Partial<AutreVM>) => void;
  onDelete: () => void;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [gen, setGen] = useState("");
  const [pending, start] = useTransition();

  const locked = value.statut === "confirme";
  const bloqueConfirm = aMarqueurManquant(value.texte) || !value.texte.trim();

  const titreSave = useAutosave(value.titre, async (v) => {
    const r = await renameAutre(value.id, v);
    if (!r.ok) throw new Error(r.message);
  });
  const notesSave = useAutosave(value.notes, async (v) => {
    const r = await saveNotesById(value.id, v);
    if (!r.ok) throw new Error(r.message);
  });
  const texteSave = useAutosave(value.texte, async (v) => {
    const r = await saveTexteById(value.id, v);
    if (!r.ok) throw new Error(r.message);
  });

  function genererAutre() {
    setGen("Génération en cours…");
    setErreur(null);
    start(async () => {
      const r = await genererById(projectId, value.id);
      setGen("");
      if (!r.ok) {
        setErreur(r.message);
        return;
      }
      onChange({ texte: r.texte, statut: "brouillon" });
    });
  }
  function confirmer() {
    start(async () => {
      const r = await confirmById(value.id, value.texte);
      if (!r.ok) {
        setErreur(r.message);
        return;
      }
      setErreur(null);
      onChange({ statut: "confirme" });
    });
  }
  function rouvrir() {
    start(async () => {
      const r = await setStatutById(value.id, "brouillon");
      if (!r.ok) {
        setErreur(r.message);
        return;
      }
      onChange({ statut: "brouillon" });
    });
  }
  function supprimer() {
    start(async () => {
      const r = await supprimerAutre(value.id);
      if (!r.ok) {
        setErreur(r.message);
        return;
      }
      onDelete();
    });
  }

  const indic = [titreSave, notesSave, texteSave].includes("error")
    ? "error"
    : [titreSave, notesSave, texteSave].includes("saving")
      ? "saving"
      : "saved";

  return (
    <div className="flex flex-col gap-3 rounded-md border border-n200 p-4">
      <div className="flex items-center justify-between gap-3">
        <input
          value={value.titre}
          disabled={locked}
          onChange={(e) => onChange({ titre: e.target.value })}
          aria-label="Titre de la section"
          className="min-w-0 flex-1 rounded-md border border-n200 bg-n0 px-3 py-1.5 font-semibold text-navy outline-none focus:border-navy disabled:bg-n50"
        />
        <div className="flex shrink-0 items-center gap-3">
          <span className="h-4 text-xs text-n500" aria-live="polite">
            {LIBELLE[indic]}
          </span>
          <StatutBadge statut={value.statut} />
          <button
            type="button"
            onClick={supprimer}
            disabled={pending}
            aria-label="Supprimer la section"
            className="text-error disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-navy">Notes de visite</span>
        <textarea
          value={value.notes}
          disabled={locked}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={3}
          className="rounded-md border border-n200 bg-n0 px-3 py-2 text-sm text-navy outline-none focus:border-navy disabled:bg-n50"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={genererAutre}
          disabled={pending || locked}
          className="h-10 rounded-md border border-navy px-4 text-sm font-medium text-navy hover:bg-n50 disabled:opacity-50"
        >
          Générer
        </button>
        <span className="text-xs text-n500" aria-live="polite">
          {gen}
        </span>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-navy">Texte de la section</span>
        <textarea
          value={value.texte}
          disabled={locked}
          onChange={(e) => onChange({ texte: e.target.value })}
          rows={10}
          className="rounded-md border border-n200 bg-n0 px-3 py-2 font-mono text-sm text-navy outline-none focus:border-navy disabled:bg-n50"
          placeholder="Générez un premier jet, puis modifiez-le librement."
        />
      </label>

      {aMarqueurManquant(value.texte) && (
        <p className="rounded-md bg-amber-tint px-3 py-2 text-sm text-warning">
          ⚠ Un marqueur « [Information manquante : … ] » reste à combler avant de confirmer.
        </p>
      )}
      {erreur && <p className="rounded-md bg-error-tint px-3 py-2 text-sm text-error">{erreur}</p>}

      <div className="flex items-center gap-3">
        {locked ? (
          <button
            type="button"
            onClick={rouvrir}
            disabled={pending}
            className="h-10 rounded-md border border-navy px-4 text-sm font-medium text-navy hover:bg-n50 disabled:opacity-50"
          >
            Rouvrir pour modifier
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={confirmer}
              disabled={pending || bloqueConfirm}
              className="h-10 rounded-md bg-amber px-4 text-sm font-medium text-navy hover:bg-amber-hover disabled:opacity-50"
            >
              Confirmer
            </button>
            <span className="text-xs text-n500">
              Format : «&nbsp;#&nbsp;» + espace = titre, «&nbsp;##&nbsp;» + espace = sous-titre.
              Sans ça, la ligne reste du texte normal.
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// « J'ai terminé la saisie » (US-23) : sélection des sections à rédiger + éléments ignorés.
function FinirSaisie({
  projectId,
  sections,
  bloque,
  batimentConfirme,
  fichesBrouillon,
  onGenerated,
}: {
  projectId: string;
  sections: SectionVM[];
  bloque: (s: SectionVM) => boolean;
  batimentConfirme: boolean;
  fichesBrouillon: number;
  onGenerated: (typeId: string, texte: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const disponibles = sections.filter((s) => !bloque(s));
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function ouvrir() {
    setChoisis(new Set(disponibles.map((s) => s.typeId)));
    setErreur(null);
    setProgress("");
    setOpen(true);
  }

  function lancer() {
    const liste = disponibles.filter((s) => choisis.has(s.typeId));
    start(async () => {
      for (let i = 0; i < liste.length; i++) {
        setProgress(`Génération ${i + 1}/${liste.length} — ${liste[i].titre}…`);
        const r = await generer(projectId, liste[i].typeId);
        if (!r.ok) {
          setErreur(`${liste[i].titre} : ${r.message}`);
          setProgress("");
          return;
        }
        onGenerated(liste[i].typeId, r.texte);
      }
      setProgress(`Terminé (${liste.length}).`);
    });
  }

  const ignores: string[] = [];
  if (!batimentConfirme) ignores.push("description du bâtiment non confirmée");
  if (fichesBrouillon > 0) ignores.push(`${fichesBrouillon} fiche(s) en brouillon ignorée(s)`);

  return (
    <div className="rounded-md border border-n200 p-4">
      {!open ? (
        <button
          type="button"
          onClick={ouvrir}
          className="h-11 rounded-md bg-amber px-4 text-sm font-medium text-navy hover:bg-amber-hover"
        >
          J&apos;ai terminé la saisie — choisir les sections à rédiger
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-navy">Sections à rédiger</p>
          {disponibles.length === 0 && (
            <p className="text-sm text-n500">Aucune section disponible (bâtiment requis non confirmé).</p>
          )}
          <div className="flex flex-col gap-2">
            {disponibles.map((s) => (
              <label key={s.typeId} className="flex items-center gap-2 text-sm text-navy">
                <input
                  type="checkbox"
                  checked={choisis.has(s.typeId)}
                  onChange={(e) =>
                    setChoisis((prev) => {
                      const n = new Set(prev);
                      if (e.target.checked) n.add(s.typeId);
                      else n.delete(s.typeId);
                      return n;
                    })
                  }
                />
                {s.titre}
              </label>
            ))}
          </div>

          <p className="text-xs text-n500">
            Données utilisées : seules les données confirmées.{" "}
            {ignores.length > 0 && <span className="text-warning">Ignoré : {ignores.join(" ; ")}.</span>}
          </p>

          {erreur && <p className="rounded-md bg-error-tint px-3 py-2 text-sm text-error">{erreur}</p>}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={lancer}
              disabled={pending || choisis.size === 0}
              className="h-10 rounded-md bg-amber px-4 text-sm font-medium text-navy hover:bg-amber-hover disabled:opacity-50"
            >
              Générer la sélection
            </button>
            <button type="button" onClick={() => setOpen(false)} className="h-10 px-3 text-sm text-n500">
              Fermer
            </button>
            <span className="text-xs text-n500" aria-live="polite">
              {progress}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  projectId,
  vm,
  value,
  disabled,
  onChange,
}: {
  projectId: string;
  vm: SectionVM;
  value: Runtime;
  disabled: boolean;
  onChange: (p: Partial<Runtime>) => void;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [gen, setGen] = useState("");
  const [pending, start] = useTransition();

  const locked = value.statut === "confirme";
  const bloqueConfirm = aMarqueurManquant(value.texte) || !value.texte.trim();

  const notesSave = useAutosave(value.notes, async (v) => {
    const r = await saveNotes(projectId, vm.typeId, v);
    if (!r.ok) throw new Error(r.message);
  });
  const texteSave = useAutosave(value.texte, async (v) => {
    const r = await saveTexte(projectId, vm.typeId, v);
    if (!r.ok) throw new Error(r.message);
  });

  function gener2() {
    setGen("Génération en cours…");
    setErreur(null);
    start(async () => {
      const r = await generer(projectId, vm.typeId);
      setGen("");
      if (!r.ok) {
        setErreur(r.message);
        return;
      }
      onChange({ texte: r.texte, statut: "brouillon" });
    });
  }
  function confirmer() {
    start(async () => {
      const r = await confirmSection(projectId, vm.typeId, value.texte);
      if (!r.ok) {
        setErreur(r.message);
        return;
      }
      setErreur(null);
      onChange({ statut: "confirme" });
    });
  }
  function rouvrir() {
    start(async () => {
      const r = await setSectionStatut(projectId, vm.typeId, "brouillon");
      if (!r.ok) {
        setErreur(r.message);
        return;
      }
      onChange({ statut: "brouillon" });
    });
  }

  if (disabled) {
    return (
      <div className="rounded-md border border-n200 bg-n50 p-4 opacity-70">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-navy">{vm.titre}</h3>
          <StatutBadge statut={value.statut} />
        </div>
        <p className="mt-2 text-sm text-n500">
          Disponible seulement une fois la description du bâtiment confirmée.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-n200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-navy">{vm.titre}</h3>
        <div className="flex items-center gap-3">
          <StatutBadge statut={value.statut} />
        </div>
      </div>

      {vm.notesActives && (
        <label className="flex flex-col gap-1">
          <span className="flex items-center justify-between text-sm font-medium text-navy">
            Notes de visite
            <span className="h-4 text-xs text-n500" aria-live="polite">
              {LIBELLE[notesSave]}
            </span>
          </span>
          <textarea
            value={value.notes}
            disabled={locked}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={3}
            className="rounded-md border border-n200 bg-n0 px-3 py-2 text-sm text-navy outline-none focus:border-navy disabled:bg-n50"
          />
        </label>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={gener2}
          disabled={pending || locked}
          className="h-10 rounded-md border border-navy px-4 text-sm font-medium text-navy hover:bg-n50 disabled:opacity-50"
        >
          Générer
        </button>
        <span className="text-xs text-n500" aria-live="polite">
          {gen}
        </span>
      </div>

      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between text-sm font-medium text-navy">
          Texte de la section
          <span className="h-4 text-xs text-n500" aria-live="polite">
            {LIBELLE[texteSave]}
          </span>
        </span>
        <textarea
          value={value.texte}
          disabled={locked}
          onChange={(e) => onChange({ texte: e.target.value })}
          rows={10}
          className="rounded-md border border-n200 bg-n0 px-3 py-2 font-mono text-sm text-navy outline-none focus:border-navy disabled:bg-n50"
          placeholder="Générez un premier jet, puis modifiez-le librement."
        />
      </label>

      {aMarqueurManquant(value.texte) && (
        <p className="rounded-md bg-amber-tint px-3 py-2 text-sm text-warning">
          ⚠ Un marqueur « [Information manquante : … ] » reste à combler avant de confirmer.
        </p>
      )}
      {erreur && <p className="rounded-md bg-error-tint px-3 py-2 text-sm text-error">{erreur}</p>}

      <div className="flex items-center gap-3">
        {locked ? (
          <button
            type="button"
            onClick={rouvrir}
            disabled={pending}
            className="h-10 rounded-md border border-navy px-4 text-sm font-medium text-navy hover:bg-n50 disabled:opacity-50"
          >
            Rouvrir pour modifier
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={confirmer}
              disabled={pending || bloqueConfirm}
              className="h-10 rounded-md bg-amber px-4 text-sm font-medium text-navy hover:bg-amber-hover disabled:opacity-50"
            >
              Confirmer
            </button>
            <span className="text-xs text-n500">
              Format : «&nbsp;#&nbsp;» + espace = titre, «&nbsp;##&nbsp;» + espace = sous-titre.
              Sans ça, la ligne reste du texte normal.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
