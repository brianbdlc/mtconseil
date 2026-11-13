"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useAutosave } from "@/lib/useAutosave";
import {
  afficher,
  toCardColumns,
  type Autre,
  type CardFields,
  type Field,
  type Ligne2,
} from "@/lib/field";
import { rangeLabel } from "@/lib/equipmentId";
import { tonnesToKw } from "@/lib/units";
import { nombreFr } from "@/lib/format";
import Field3State from "@/components/Field3State";
import StatutBadge from "@/components/StatutBadge";
import PhotoGrid, { type Photo } from "./PhotoGrid";
import { confirmCard, deleteCard, setStatut as setStatutAction, updateCard } from "../actions";

const LIBELLE: Record<string, string> = {
  idle: "",
  saving: "Enregistrement…",
  saved: "Enregistré",
  error: "Échec de l'enregistrement",
};

// Légende fixe sous le tableau 2 (codes de refroidissement/chauffage).
const LEGENDE = "DX : Détente directe | EC : eau chaude | ELE : Électricité | ER : Eau refroidie | GN : Gaz naturel";

export default function FicheForm({
  projectId,
  cardId,
  ordinal,
  startId,
  photos,
  initial,
}: {
  projectId: string;
  cardId: string;
  ordinal: number;
  startId: number;
  photos: Photo[];
  initial: { titre: string; intro: string; fields: CardFields; statut: string };
}) {
  const [titre, setTitre] = useState(initial.titre);
  const [intro, setIntro] = useState(initial.intro);
  const [fields, setFields] = useState<CardFields>(initial.fields);
  const [statut, setStatut] = useState(initial.statut);
  const [pending, startTransition] = useTransition();

  const locked = statut === "confirme";

  const payload = useMemo(
    () => ({ titre, intro, columns: toCardColumns(fields) }),
    [titre, intro, fields],
  );
  const save = useAutosave(payload, (v) => updateCard(cardId, projectId, v));

  function confirmer() {
    startTransition(async () => {
      await confirmCard(cardId, projectId, { titre, intro, columns: toCardColumns(fields) });
      setStatut("confirme");
    });
  }
  function rouvrir() {
    startTransition(async () => {
      await setStatutAction(cardId, projectId, "brouillon");
      setStatut("brouillon");
    });
  }

  const set = (k: keyof CardFields, f: Field) =>
    setFields((s) => ({ ...s, [k]: f }));
  const setL2 = (side: "refroid" | "chauff", patch: Partial<Ligne2>) =>
    setFields((s) => ({ ...s, [side]: { ...s[side], ...patch } }));

  const sectionNo = `3.${ordinal}`;
  const idLabel = rangeLabel(startId, fields.nb_unites);
  const anyEstime =
    fields.debit_pcm.estime || fields.refroid.eff.estime || fields.chauff.eff.estime;

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
            rows={3}
            disabled={locked}
            onChange={(e) => setIntro(e.target.value)}
            className="rounded-md border border-n200 bg-n0 px-3 py-2 text-navy outline-none focus:border-navy disabled:bg-n50 disabled:text-n500"
          />
        </label>

        {/* Tableau 1 */}
        <Groupe titre="Tableau 1 — Description">
          <label className="flex items-center gap-2 text-sm font-medium text-navy">
            Nombre d&apos;unités identiques
            <input
              type="number"
              min={1}
              value={fields.nb_unites}
              disabled={locked}
              onChange={(e) =>
                setFields((s) => ({ ...s, nb_unites: Math.max(1, Number(e.target.value) || 1) }))
              }
              className="h-9 w-20 rounded-md border border-n200 bg-n0 px-2 text-navy outline-none focus:border-navy disabled:bg-n50"
            />
            <span className="font-mono text-xs text-n500">ID {idLabel}</span>
          </label>
          <Field3State label="Description" value={fields.description} disabled={locked} onChange={(f) => set("description", f)} />
          <Field3State label="Marque / modèle" value={fields.marque_modele} disabled={locked} onChange={(f) => set("marque_modele", f)} />
          <ChampEstime label="Débit (PCM)" value={fields.debit_pcm} disabled={locked} onChange={(f) => set("debit_pcm", f)} />
          <Field3State label="% air frais" value={fields.pct_air_frais} disabled={locked} onChange={(f) => set("pct_air_frais", f)} />
          <Field3State label="Ventilateur" value={fields.ventilateur} disabled={locked} onChange={(f) => set("ventilateur", f)} />
          <Field3State label="Refroidissement (code)" value={fields.refroidissement} disabled={locked} onChange={(f) => set("refroidissement", f)} />
          <Field3State label="Chauffage (code)" value={fields.chauffage} disabled={locked} onChange={(f) => set("chauffage", f)} />
          <Field3State label="Humidificateur" value={fields.humidificateur} disabled={locked} onChange={(f) => set("humidificateur", f)} />
        </Groupe>

        {/* Tableau 2 */}
        <Groupe titre="Tableau 2 — Capacités">
          <Ligne2Editor
            titre="Refroidissement"
            l={fields.refroid}
            so={fields.refroidissement.etat === "so"}
            disabled={locked}
            onChange={(patch) => setL2("refroid", patch)}
          />
          <Ligne2Editor
            titre="Chauffage"
            l={fields.chauff}
            so={fields.chauffage.etat === "so"}
            disabled={locked}
            onChange={(patch) => setL2("chauff", patch)}
          />
          <p className="text-xs text-n500">{LEGENDE}</p>
        </Groupe>

        {/* Lignes « + Autre » (R3) */}
        <Groupe titre="Autres variables">
          <ListeAutres
            autres={fields.autres}
            disabled={locked}
            onChange={(autres) => setFields((s) => ({ ...s, autres }))}
          />
        </Groupe>

        {/* Constats (US-14) */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Constats / remarques (une puce par ligne)</span>
          <textarea
            value={fields.constats.join("\n")}
            rows={3}
            disabled={locked}
            onChange={(e) =>
              setFields((s) => ({ ...s, constats: e.target.value.split("\n") }))
            }
            className="rounded-md border border-n200 bg-n0 px-3 py-2 text-navy outline-none focus:border-navy disabled:bg-n50 disabled:text-n500"
          />
        </label>

        {/* Note estimé (R4) */}
        {anyEstime && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-navy">Note « estimé »</span>
            <input
              value={fields.note_estime}
              disabled={locked}
              onChange={(e) => setFields((s) => ({ ...s, note_estime: e.target.value }))}
              className="h-9 rounded-md border border-n200 bg-n0 px-3 text-sm text-navy outline-none focus:border-navy disabled:bg-n50"
            />
          </label>
        )}

        {/* Photos (US-15) */}
        <PhotoGrid cardId={cardId} projectId={projectId} disabled={locked} initial={photos} />

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
              if (confirm("Supprimer cette fiche ?")) await deleteCard(cardId, projectId);
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

      {/* Aperçu dans le gabarit */}
      <aside className="w-full flex-1 rounded-md border border-n200 bg-n0 p-6">
        <p className="mb-3 text-xs font-medium tracking-wide text-n500 uppercase">Aperçu</p>
        <h3 className="font-display text-base font-bold text-navy">
          <span className="font-mono text-n500">{sectionNo}</span>{" "}
          {titre.trim() || "Sans titre"}
        </h3>
        {intro.trim() && <p className="mt-2 text-sm text-navy">{intro}</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-n50 text-left text-navy">
                {["ID", "Description", "Marque / modèle", "Débit (PCM)", "% air frais", "Ventilateur", "Refroid.", "Chauffage", "Humidif."].map((h) => (
                  <th key={h} className="border border-n200 px-2 py-1 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="text-navy">
                <td className="border border-n200 px-2 py-1 font-mono">{idLabel}</td>
                <td className="border border-n200 px-2 py-1">{afficher(fields.description)}</td>
                <td className="border border-n200 px-2 py-1">{afficher(fields.marque_modele)}</td>
                <td className="border border-n200 px-2 py-1">{afficher(fields.debit_pcm)}</td>
                <td className="border border-n200 px-2 py-1">{afficher(fields.pct_air_frais)}</td>
                <td className="border border-n200 px-2 py-1">{afficher(fields.ventilateur)}</td>
                <td className="border border-n200 px-2 py-1">{afficher(fields.refroidissement)}</td>
                <td className="border border-n200 px-2 py-1">{afficher(fields.chauffage)}</td>
                <td className="border border-n200 px-2 py-1">{afficher(fields.humidificateur)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <table className="mt-3 w-full border-collapse text-xs text-navy">
          <thead>
            <tr className="bg-n50 text-left">
              <th className="border border-n200 px-2 py-1 font-medium"></th>
              <th className="border border-n200 px-2 py-1 font-medium">Type</th>
              <th className="border border-n200 px-2 py-1 font-medium">Capacité (kW)</th>
              <th className="border border-n200 px-2 py-1 font-medium">Efficacité (%)</th>
            </tr>
          </thead>
          <tbody>
            {apercuL2("Refroidissement", fields.refroid, fields.refroidissement.etat === "so")}
            {apercuL2("Chauffage", fields.chauff, fields.chauffage.etat === "so")}
          </tbody>
        </table>
        <p className="mt-1 text-[10px] text-n500">{LEGENDE}</p>

        {fields.autres.length > 0 && (
          <table className="mt-3 w-full border-collapse text-xs text-navy">
            <tbody>
              {fields.autres.map((a, i) => (
                <tr key={i}>
                  <th className="border border-n200 bg-n50 px-2 py-1 text-left font-medium">{a.titre || "Autre"}</th>
                  <td className="border border-n200 px-2 py-1">
                    {a.valeur.trim() || "n/d"} {a.unite}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {fields.constats.some((c) => c.trim()) && (
          <ul className="mt-3 list-disc pl-5 text-sm text-navy">
            {fields.constats.filter((c) => c.trim()).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        )}
        {anyEstime && <p className="mt-2 text-xs text-n500">{fields.note_estime}</p>}
      </aside>
    </div>
  );
}

function apercuL2(titre: string, l: Ligne2, so: boolean) {
  return (
    <tr>
      <th className="border border-n200 bg-n50 px-2 py-1 text-left font-medium">{titre}</th>
      <td className="border border-n200 px-2 py-1">{so ? "-" : afficher(l.type)}</td>
      <td className="border border-n200 px-2 py-1">{so ? "-" : afficher(l.kw)}</td>
      <td className="border border-n200 px-2 py-1">{so ? "-" : afficher(l.eff)}</td>
    </tr>
  );
}

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-n200 p-4">
      <legend className="px-1 text-sm font-semibold text-navy">{titre}</legend>
      {children}
    </fieldset>
  );
}

// Field3State + case « estimé » (R4), pour les champs chiffrés estimables.
function ChampEstime({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: Field;
  disabled: boolean;
  onChange: (f: Field) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Field3State label={label} value={value} disabled={disabled} onChange={onChange} />
      <label className="flex items-center gap-2 text-xs text-n500">
        <input
          type="checkbox"
          checked={value.estime === true}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, estime: e.target.checked })}
        />
        Estimé (astérisque + note)
      </label>
    </div>
  );
}

// Ligne de tableau 2. tonnes → kW auto (tant que kw_manuel=false) ; éditer le kW le fige.
function Ligne2Editor({
  titre,
  l,
  so,
  disabled,
  onChange,
}: {
  titre: string;
  l: Ligne2;
  so: boolean;
  disabled: boolean;
  onChange: (patch: Partial<Ligne2>) => void;
}) {
  if (so) {
    return (
      <div className="flex items-center gap-2 text-sm text-n500" data-l2={titre} data-l2-so="1">
        <span className="font-medium text-navy">{titre}</span> : «&nbsp;-&nbsp;» (sans objet au tableau 1)
      </div>
    );
  }
  function setTonnes(val: string) {
    const t = parseFloat(val.replace(",", "."));
    const kw: Field = l.kw_manuel
      ? l.kw
      : { valeur: Number.isFinite(t) ? nombreFr(tonnesToKw(t), 1) : "", etat: "valeur" };
    onChange({ tonnes: val, kw });
  }
  return (
    <div className="flex flex-col gap-2 rounded-md bg-n50 p-3" data-l2={titre}>
      <span className="text-sm font-semibold text-navy">{titre}</span>
      <Field3State label="Type" value={l.type} disabled={disabled} onChange={(type) => onChange({ type })} />
      <label className="flex items-center gap-2 text-sm text-navy">
        <span className="w-28 font-medium">Capacité (tonnes)</span>
        <input
          value={l.tonnes}
          disabled={disabled}
          placeholder="ex. 10"
          onChange={(e) => setTonnes(e.target.value)}
          className="h-9 w-28 rounded-md border border-n200 bg-n0 px-2 outline-none focus:border-navy disabled:bg-n100"
        />
        <span className="text-xs text-n500">→ kW auto</span>
      </label>
      <Field3State
        label="Capacité (kW)"
        value={l.kw}
        disabled={disabled}
        onChange={(kw) => onChange({ kw, kw_manuel: true })}
      />
      {l.kw_manuel && l.tonnes.trim() && !disabled && (
        <button
          type="button"
          onClick={() =>
            onChange({
              kw_manuel: false,
              kw: {
                valeur: nombreFr(tonnesToKw(parseFloat(l.tonnes.replace(",", "."))), 1),
                etat: "valeur",
              },
            })
          }
          className="self-start text-xs text-info underline underline-offset-2"
        >
          ↺ Recalculer depuis les tonnes
        </button>
      )}
      <ChampEstime label="Efficacité (%)" value={l.eff} disabled={disabled} onChange={(eff) => onChange({ eff })} />
    </div>
  );
}

function ListeAutres({
  autres,
  disabled,
  onChange,
}: {
  autres: Autre[];
  disabled: boolean;
  onChange: (a: Autre[]) => void;
}) {
  const upd = (i: number, patch: Partial<Autre>) =>
    onChange(autres.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  return (
    <>
      {autres.map((a, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={a.titre}
            disabled={disabled}
            onChange={(e) => upd(i, { titre: e.target.value })}
            className="h-9 w-32 rounded-md border border-n200 bg-n0 px-2 text-sm text-navy outline-none focus:border-navy disabled:bg-n50"
          />
          <input
            value={a.valeur}
            disabled={disabled}
            placeholder="valeur"
            onChange={(e) => upd(i, { valeur: e.target.value })}
            className="h-9 flex-1 rounded-md border border-n200 bg-n0 px-2 text-sm text-navy outline-none focus:border-navy disabled:bg-n50"
          />
          <input
            value={a.unite}
            disabled={disabled}
            placeholder="unité"
            onChange={(e) => upd(i, { unite: e.target.value })}
            className="h-9 w-20 rounded-md border border-n200 bg-n0 px-2 text-sm text-navy outline-none focus:border-navy disabled:bg-n50"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(autres.filter((_, j) => j !== i))}
              aria-label="Supprimer la ligne"
              className="text-error"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([...autres, { titre: "Autre", valeur: "", unite: "" }])}
          className="self-start text-sm text-info underline underline-offset-2"
        >
          + Autre
        </button>
      )}
    </>
  );
}
