"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Autosave débouncé (US-48). Appelle `save(value)` ~`delay` ms après le dernier
 * changement. Expose un statut pour l'indicateur « Enregistrement… / Enregistré »
 * (US-50). Réutilisable partout où un bloc s'édite.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  delay = 800,
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const saveRef = useRef(save);
  const first = useRef(true);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const run = useCallback(async (v: T) => {
    setStatus("saving");
    try {
      await saveRef.current(v);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // Ne pas enregistrer au montage (valeur initiale déjà en base).
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => run(value), delay);
    return () => clearTimeout(id);
  }, [value, delay, run]);

  return status;
}
