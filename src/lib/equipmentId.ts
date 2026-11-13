// IDs d'équipement (R8, US-9) : numérotés selon l'ordre d'apparition, jamais stockés.
// Une fiche de `nb_unites` unités identiques consomme autant d'IDs et s'affiche en plage
// (« 2-3-4 ») ; la fiche suivante continue (« 5 »). Calculé à l'affichage et à l'export.

/** Étiquette d'une fiche démarrant à `start` et couvrant `n` unités : « 2-3-4 ». */
export function rangeLabel(start: number, n: number): string {
  const k = Math.max(1, Math.floor(n) || 1);
  return Array.from({ length: k }, (_, i) => start + i).join("-");
}

/** Pour chaque fiche (dans l'ordre), l'étiquette d'ID : « 1 », « 2-3-4 », « 5 »… */
export function idLabels(cards: { nb_unites?: number | null }[]): string[] {
  let next = 1;
  return cards.map((c) => {
    const n = Math.max(1, Math.floor(Number(c.nb_unites) || 1));
    const label = rangeLabel(next, n);
    next += n;
    return label;
  });
}
