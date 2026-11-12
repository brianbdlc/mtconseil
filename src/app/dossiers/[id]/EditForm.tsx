"use client";

import { useState } from "react";
import { useAutosave } from "@/lib/useAutosave";
import { updateDossier } from "../actions";

const CHAMPS = [
  { name: "numero_projet", label: "Numéro de projet" },
  { name: "client_nom", label: "Nom du client" },
  { name: "client_adresse", label: "Adresse du client" },
  { name: "type_service", label: "Type de service" },
] as const;

type Values = Record<(typeof CHAMPS)[number]["name"], string>;

const LIBELLE: Record<string, string> = {
  idle: "",
  saving: "Enregistrement…",
  saved: "Enregistré",
  error: "Échec de l'enregistrement",
};

export default function EditForm({
  id,
  initial,
}: {
  id: string;
  initial: Values;
}) {
  const [values, setValues] = useState<Values>(initial);
  const status = useAutosave(values, (v) => updateDossier(id, v));

  return (
    <div className="mt-8 flex flex-col gap-4">
      <div className="h-5 text-sm" aria-live="polite">
        <span
          className={
            status === "error"
              ? "text-error"
              : status === "saved"
                ? "text-success"
                : "text-n500"
          }
        >
          {LIBELLE[status]}
        </span>
      </div>

      {CHAMPS.map((c) => (
        <label key={c.name} className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">{c.label}</span>
          <input
            value={values[c.name]}
            onChange={(e) =>
              setValues((v) => ({ ...v, [c.name]: e.target.value }))
            }
            className="h-11 rounded-md border border-n200 bg-n0 px-3 text-navy outline-none focus:border-navy"
          />
        </label>
      ))}
    </div>
  );
}
