"use client";

import type { Etat, Field } from "@/lib/field";

// Champ 3 états (R2) : saisie libre + bascule valeur / n/d / - . Réutilisable partout.
// L'état « nd »/« so » désactive la saisie (la valeur n'a pas de sens). Cible ≥ 44px.

const ETATS: { value: Etat; label: string; title: string }[] = [
  { value: "valeur", label: "Valeur", title: "Une valeur saisie" },
  { value: "nd", label: "n/d", title: "Information non disponible" },
  { value: "so", label: "-", title: "Sans objet" },
];

export default function Field3State({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: Field;
  onChange: (f: Field) => void;
  disabled?: boolean;
}) {
  const saisie = value.etat === "valeur";
  return (
    <div className="flex flex-col gap-1.5" data-field={label}>
      <span className="text-sm font-medium text-navy">{label}</span>
      <div className="flex items-stretch gap-2">
        <input
          value={saisie ? value.valeur : ""}
          disabled={disabled || !saisie}
          placeholder={saisie ? "" : ETATS.find((e) => e.value === value.etat)?.label}
          onChange={(e) => onChange({ ...value, valeur: e.target.value })}
          className="h-11 min-w-0 flex-1 rounded-md border border-n200 bg-n0 px-3 text-navy outline-none focus:border-navy disabled:bg-n50 disabled:text-n500 disabled:italic"
        />
        <div className="flex overflow-hidden rounded-md border border-n200">
          {ETATS.map((e) => (
            <button
              key={e.value}
              type="button"
              title={e.title}
              disabled={disabled}
              aria-pressed={value.etat === e.value}
              onClick={() => onChange({ ...value, etat: e.value })}
              className={`h-11 px-3 text-sm font-medium transition-colors disabled:opacity-50 ${
                value.etat === e.value
                  ? "bg-navy text-n0"
                  : "bg-n0 text-n500 hover:bg-n50"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
