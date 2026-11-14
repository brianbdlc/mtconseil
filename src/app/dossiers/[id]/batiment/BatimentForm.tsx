"use client";

import { useMemo, useState, useTransition } from "react";
import { useAutosave } from "@/lib/useAutosave";
import {
  confirmable,
  ecartZones,
  toBuildingColumns,
  type BuildingFields,
  type Zone,
} from "@/lib/building";
import { nombreFr } from "@/lib/format";
import type { Field } from "@/lib/field";
import Field3State from "@/components/Field3State";
import ListeAutres from "@/components/ListeAutres";
import StatutBadge from "@/components/StatutBadge";
import BuildingPhoto from "./BuildingPhoto";
import { confirmBuilding, saveBuilding, setBuildingStatut } from "./actions";

const LIBELLE: Record<string, string> = {
  idle: "",
  saving: "Enregistrement…",
  saved: "Enregistré",
  error: "Échec de l'enregistrement",
};

export default function BatimentForm({
  projectId,
  initial,
  statut: statutInitial,
  photos,
  loadError = null,
}: {
  projectId: string;
  initial: BuildingFields;
  statut: string;
  photos: { path: string; titre: string }[];
  loadError?: string | null;
}) {
  const [bf, setBf] = useState<BuildingFields>(initial);
  const [statut, setStatut] = useState(statutInitial);
  const [erreur, setErreur] = useState<string | null>(loadError);
  const [pending, startTransition] = useTransition();

  const locked = statut === "confirme";
  const payload = useMemo(() => toBuildingColumns(bf), [bf]);
  // Autosave : jette si l'action échoue pour que l'indicateur passe « Échec ».
  const save = useAutosave(payload, async (v) => {
    const r = await saveBuilding(projectId, v);
    if (!r.ok) {
      setErreur(r.message);
      throw new Error(r.message);
    }
    setErreur(null);
  });

  const set = (k: keyof BuildingFields, f: Field) => setBf((s) => ({ ...s, [k]: f }));
  const ecart = ecartZones(bf);

  function confirmer() {
    startTransition(async () => {
      const r = await confirmBuilding(projectId, toBuildingColumns(bf));
      if (!r.ok) {
        setErreur(r.message);
        return;
      }
      setErreur(null);
      setStatut("confirme");
    });
  }
  function rouvrir() {
    startTransition(async () => {
      const r = await setBuildingStatut(projectId, "brouillon");
      if (!r.ok) {
        setErreur(r.message);
        return;
      }
      setErreur(null);
      setStatut("brouillon");
    });
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-navy">Description du bâtiment</h2>
        <div className="flex items-center gap-3">
          <StatutBadge statut={statut} />
          <span className="h-4 text-xs text-n500" aria-live="polite">
            {LIBELLE[save]}
          </span>
        </div>
      </div>

      {erreur && (
        <p
          className="rounded-md bg-error-tint px-3 py-2 text-sm text-error"
          role="alert"
        >
          Enregistrement impossible : {erreur}
        </p>
      )}

      {/* Bloc « Le bâtiment » */}
      <Groupe titre="Le bâtiment">
        <Field3State
          label="Superficie brute totale (pi²) — obligatoire"
          value={bf.superficie_brute_totale}
          disabled={locked}
          onChange={(f) => set("superficie_brute_totale", f)}
        />
        <Field3State label="Année de construction" value={bf.annee_construction} disabled={locked} onChange={(f) => set("annee_construction", f)} />
        <Field3State label="Nombre d'étages" value={bf.nombre_etages} disabled={locked} onChange={(f) => set("nombre_etages", f)} />
        <Field3State label="Type de construction" value={bf.type_construction} disabled={locked} onChange={(f) => set("type_construction", f)} />
        <Field3State label="Usage principal" value={bf.usage_principal} disabled={locked} onChange={(f) => set("usage_principal", f)} />
        <ListeAutres
          autres={bf.autres_batiment}
          disabled={locked}
          onChange={(autres_batiment) => setBf((s) => ({ ...s, autres_batiment }))}
        />
      </Groupe>

      {/* Zones (US-18) */}
      <Groupe titre="Zones">
        <ZonesEditor
          zones={bf.zones}
          disabled={locked}
          onChange={(zones) => setBf((s) => ({ ...s, zones }))}
        />
        {/* Avertissement d'écart (US-20), non bloquant. */}
        {ecart.ecart && (
          <div className="flex flex-col gap-2 rounded-md bg-amber-tint p-3 text-sm text-warning">
            <span>
              ⚠ Somme des zones ({nombreFr(ecart.somme)} pi²) ≠ superficie brute totale (
              {nombreFr(ecart.total)} pi²).
            </span>
            <label className="flex items-center gap-2 text-navy">
              <input
                type="checkbox"
                checked={bf.ecart_voulu}
                disabled={locked}
                onChange={(e) => setBf((s) => ({ ...s, ecart_voulu: e.target.checked }))}
              />
              Écart voulu
            </label>
          </div>
        )}
        {(bf.ecart_voulu || ecart.ecart) && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-navy">Note sur l&apos;écart (optionnel)</span>
            <input
              value={bf.ecart_note}
              disabled={locked}
              onChange={(e) => setBf((s) => ({ ...s, ecart_note: e.target.value }))}
              className="h-9 rounded-md border border-n200 bg-n0 px-3 text-sm text-navy outline-none focus:border-navy disabled:bg-n50"
            />
          </label>
        )}
      </Groupe>

      {/* Bloc « Alimentation en énergie » */}
      <Groupe titre="Alimentation en énergie">
        <Field3State label="Électricité (fournisseur / entrée)" value={bf.elec} disabled={locked} onChange={(f) => set("elec", f)} />
        <Field3State label="Gaz (fournisseur / présence)" value={bf.gaz} disabled={locked} onChange={(f) => set("gaz", f)} />
        <ListeAutres
          autres={bf.autres_energie}
          disabled={locked}
          onChange={(autres_energie) => setBf((s) => ({ ...s, autres_energie }))}
        />
      </Groupe>

      <BuildingPhoto projectId={projectId} disabled={locked} initial={photos} />

      <div className="mt-2 flex items-center gap-4">
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
            disabled={pending || save === "saving" || !confirmable(bf)}
            className="h-11 rounded-md bg-amber px-4 text-sm font-medium text-navy hover:bg-amber-hover disabled:opacity-50"
          >
            Confirmer la description
          </button>
        )}
        {!locked && !confirmable(bf) && (
          <span className="text-xs text-n500">
            Saisissez la superficie brute totale pour confirmer.
          </span>
        )}
      </div>
      {locked && (
        <p className="text-xs text-success">
          Description confirmée — incluse dans l&apos;export. Rouvrez-la pour la modifier.
        </p>
      )}
    </div>
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

// Éditeur de zones : liste en mémoire, 4 champs/zone, réordonner (↑/↓) + supprimer.
function ZonesEditor({
  zones,
  disabled,
  onChange,
}: {
  zones: Zone[];
  disabled: boolean;
  onChange: (z: Zone[]) => void;
}) {
  const upd = (i: number, patch: Partial<Zone>) =>
    onChange(zones.map((z, j) => (j === i ? { ...z, ...patch } : z)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= zones.length) return;
    const next = [...zones];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <>
      {zones.map((z, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-md bg-n50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-navy">Zone {i + 1}</span>
            {!disabled && (
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter" className="flex h-7 w-7 items-center justify-center rounded-md text-n500 hover:bg-n100 disabled:opacity-30">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === zones.length - 1} aria-label="Descendre" className="flex h-7 w-7 items-center justify-center rounded-md text-n500 hover:bg-n100 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => onChange(zones.filter((_, j) => j !== i))} aria-label="Supprimer la zone" className="ml-1 text-error">✕</button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ZoneInput label="Nom" value={z.nom} disabled={disabled} onChange={(v) => upd(i, { nom: v })} />
            <ZoneInput label="Superficie (pi²)" value={z.superficie} disabled={disabled} onChange={(v) => upd(i, { superficie: v })} />
            <ZoneInput label="Étages" value={z.etages} disabled={disabled} onChange={(v) => upd(i, { etages: v })} />
            <ZoneInput label="Usage" value={z.usage} disabled={disabled} onChange={(v) => upd(i, { usage: v })} />
          </div>
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([...zones, { nom: "", superficie: "", etages: "", usage: "" }])}
          className="self-start text-sm text-info underline underline-offset-2"
        >
          + Ajouter une zone
        </button>
      )}
      {!zones.length && <p className="text-xs text-n500">Aucune zone.</p>}
    </>
  );
}

function ZoneInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-navy">
      <span className="text-xs font-medium text-n500">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-n200 bg-n0 px-2 outline-none focus:border-navy disabled:bg-n100"
      />
    </label>
  );
}
