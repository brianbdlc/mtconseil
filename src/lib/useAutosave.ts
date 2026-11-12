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
  // Dernière valeur en base : initialisée à la valeur de montage (déjà persistée).
  // Évite d'enregistrer au montage, les écritures redondantes, et le double-effet
  // de StrictMode en dev.
  const lastSaved = useRef(JSON.stringify(value));

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const run = useCallback(async (v: T, serialized: string) => {
    setStatus("saving");
    try {
      await saveRef.current(v);
      lastSaved.current = serialized;
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const serialized = JSON.stringify(value);
    if (serialized === lastSaved.current) return;
    const id = setTimeout(() => run(value, serialized), delay);
    return () => clearTimeout(id);
  }, [value, delay, run]);

  return status;
}
