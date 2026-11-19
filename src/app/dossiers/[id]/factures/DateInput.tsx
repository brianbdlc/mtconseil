"use client";

import { useEffect, useRef, useState } from "react";
import { parseDateFr } from "@/lib/factures/parseDate";

// Saisie de date : calendrier natif (type=date) ET saisie libre au clavier. Entrée/blur
// → le texte est converti par parseDateFr (code pur, pas d'IA) et affiché en JJ/MM/AAAA,
// avec la date en lettres en dessous. Les deux remplissent la même valeur ISO.
// Entrée VALIDE la date, n'envoie pas de formulaire (preventDefault).

function isoVers(iso: string, champ: "jj" | "enLettres"): string {
  if (!iso) return "";
  const r = parseDateFr(iso, null);
  return r.ok ? r[champ] : "";
}

export default function DateInput({
  value,
  anneeReference,
  disabled,
  onChange,
  ariaLabel,
}: {
  value: string;
  anneeReference: number | null;
  disabled?: boolean;
  onChange: (iso: string) => void;
  ariaLabel: string;
}) {
  const [text, setText] = useState(() => isoVers(value, "jj"));
  const [note, setNote] = useState(() => isoVers(value, "enLettres"));
  const [erreur, setErreur] = useState("");
  const focusRef = useRef(false);

  // Synchronise depuis l'extérieur (préremplissage d'une nouvelle ligne, choix calendrier)
  // sans écraser une frappe en cours.
  useEffect(() => {
    if (focusRef.current) return;
    setText(isoVers(value, "jj"));
    setNote(isoVers(value, "enLettres"));
    setErreur("");
  }, [value]);

  function valider() {
    if (!text.trim()) {
      onChange("");
      setNote("");
      setErreur("");
      return;
    }
    const r = parseDateFr(text, anneeReference);
    if (r.ok) {
      onChange(r.iso);
      setText(r.jj);
      setNote(r.enLettres + (r.anneeDeduite ? " (année de référence)" : ""));
      setErreur("");
    } else {
      setErreur(r.erreur);
      setNote("");
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <input
          type="text"
          aria-label={ariaLabel}
          value={text}
          disabled={disabled}
          placeholder="JJ/MM/AAAA"
          inputMode="numeric"
          onFocus={() => (focusRef.current = true)}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            focusRef.current = false;
            valider();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // valide la date, n'envoie pas le formulaire
              valider();
            }
          }}
          className="h-10 w-28 rounded-md border border-n200 bg-n0 px-2 text-sm text-navy outline-none focus:border-navy disabled:bg-n50 disabled:text-n500 tabular-nums"
        />
        <input
          type="date"
          aria-label={`${ariaLabel} (calendrier)`}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 rounded-md border border-n200 bg-n0 px-1 text-sm text-navy outline-none focus:border-navy disabled:bg-n50"
        />
      </div>
      {erreur ? (
        <span className="text-[11px] text-error">{erreur}</span>
      ) : note ? (
        <span className="text-[11px] text-n500">= {note}</span>
      ) : null}
    </div>
  );
}
