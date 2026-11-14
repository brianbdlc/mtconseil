"use client";

import type { Autre } from "@/lib/field";

// Lignes « + Autre » (R3) : titre / valeur / unité, ajoutables et supprimables.
// Partagé : fiches (tableau 1) + description du bâtiment (2 blocs).
export default function ListeAutres({
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
