"use client";

import { useState, useTransition } from "react";
import { createType, editType, restaurerVersion, type Result } from "./actions";

export type TypeRow = {
  id: string;
  cle: string;
  titre: string;
  zone: string;
  ordre: number;
  instructions: string;
  notes_actives: boolean;
  requiert_batiment: boolean;
  actif: boolean;
};
export type VersionRow = {
  id: string;
  section_type_id: string;
  titre: string | null;
  instructions: string;
  created_at: string;
};

const ZONE_LABEL: Record<string, string> = {
  apres_description: "Après la description du bâtiment",
  apres_fiches: "Après les fiches d'équipement",
  bilan: "Bilan énergétique (section 4)",
};
const ZONES = Object.keys(ZONE_LABEL);

export default function SectionsAdmin({
  types,
  versions,
}: {
  types: TypeRow[];
  versions: VersionRow[];
}) {
  const parZone = ZONES.map((z) => ({ zone: z, items: types.filter((t) => t.zone === z) }));

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-n500">Nouveau type</h2>
        <div className="mt-3">
          <NewTypeForm />
        </div>
      </section>

      {parZone.map(({ zone, items }) => (
        <section key={zone}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-n500">
            {ZONE_LABEL[zone]}
          </h2>
          <div className="mt-3 flex flex-col gap-4">
            {items.length === 0 && <p className="text-xs text-n500">Aucun type dans cette zone.</p>}
            {items.map((t) => (
              <TypeCard key={t.id} type={t} versions={versions.filter((v) => v.section_type_id === t.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function NewTypeForm() {
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 rounded-md border border-navy px-4 text-sm font-medium text-navy hover:bg-n50"
      >
        + Ajouter un type
      </button>
    );
  }
  return (
    <form
      action={(fd) =>
        start(async () => {
          const r = await createType(fd);
          if (!r.ok) setErreur(r.message);
          else {
            setErreur(null);
            setOpen(false);
          }
        })
      }
      className="flex flex-col gap-3 rounded-md border border-n200 p-4"
    >
      <Fields />
      {erreur && <p className="rounded-md bg-error-tint px-3 py-2 text-sm text-error">{erreur}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-md bg-amber px-4 text-sm font-medium text-navy hover:bg-amber-hover disabled:opacity-50"
        >
          Créer
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-10 px-3 text-sm text-n500">
          Annuler
        </button>
      </div>
    </form>
  );
}

function TypeCard({ type, versions }: { type: TypeRow; versions: VersionRow[] }) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const [histo, setHisto] = useState(false);

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setErreur(r.message);
        setOk(false);
      } else {
        setErreur(null);
        setOk(true);
      }
    });

  return (
    <div className={`rounded-md border p-4 ${type.actif ? "border-n200" : "border-n200 bg-n50 opacity-70"}`}>
      <form
        action={(fd) => run(() => editType(type.id, fd))}
        className="flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <code className="font-mono text-xs text-n500">{type.cle}</code>
          {!type.actif && <span className="text-xs font-medium uppercase text-n500">inactif</span>}
        </div>
        <Fields type={type} />
        {erreur && <p className="rounded-md bg-error-tint px-3 py-2 text-sm text-error">{erreur}</p>}
        {ok && <p className="text-xs text-success">Enregistré.</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-md bg-amber px-4 text-sm font-medium text-navy hover:bg-amber-hover disabled:opacity-50"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => setHisto((h) => !h)}
            className="h-10 px-3 text-sm text-info underline underline-offset-2"
          >
            Historique ({versions.length})
          </button>
        </div>
      </form>

      {histo && (
        <ul className="mt-3 flex flex-col gap-2 border-t border-n100 pt-3">
          {versions.map((v) => (
            <li key={v.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="text-navy">{v.titre || "(sans titre)"}</div>
                <div className="truncate text-xs text-n500">{v.instructions || "(aucune instruction)"}</div>
                <div className="text-xs text-n500">{new Date(v.created_at).toLocaleString("fr-CA")}</div>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => restaurerVersion(v.id))}
                className="shrink-0 rounded-md border border-navy px-2 py-1 text-xs font-medium text-navy hover:bg-n50 disabled:opacity-50"
              >
                Restaurer
              </button>
            </li>
          ))}
          {versions.length === 0 && <li className="text-xs text-n500">Aucune version.</li>}
        </ul>
      )}
    </div>
  );
}

// Champs partagés création/édition. `defaultValue`/`defaultChecked` depuis le type si fourni.
function Fields({ type }: { type?: TypeRow }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-navy">Titre</span>
          <input
            name="titre"
            defaultValue={type?.titre ?? ""}
            required
            className="h-10 rounded-md border border-n200 bg-n0 px-3 text-navy outline-none focus:border-navy"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-navy">Zone (emplacement)</span>
          <select
            name="zone"
            defaultValue={type?.zone ?? "apres_fiches"}
            className="h-10 rounded-md border border-n200 bg-n0 px-3 text-navy outline-none focus:border-navy"
          >
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {ZONE_LABEL[z]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-navy">Ordre</span>
          <input
            name="ordre"
            type="number"
            defaultValue={type?.ordre ?? 0}
            className="h-10 w-28 rounded-md border border-n200 bg-n0 px-3 font-mono text-navy outline-none focus:border-navy"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-navy">Instructions de rédaction</span>
        <textarea
          name="instructions"
          defaultValue={type?.instructions ?? ""}
          rows={4}
          className="rounded-md border border-n200 bg-n0 px-3 py-2 text-sm text-navy outline-none focus:border-navy"
        />
      </label>
      <div className="flex flex-wrap gap-5 text-sm text-navy">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="notes_actives" defaultChecked={type?.notes_actives ?? true} />
          Case de notes
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="requiert_batiment" defaultChecked={type?.requiert_batiment ?? false} />
          Requiert la description confirmée
        </label>
        {type && (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="actif" defaultChecked={type.actif} />
            Actif
          </label>
        )}
      </div>
    </>
  );
}
