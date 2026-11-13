// Formats français (R9) : virgule décimale, espace (insécable) pour les milliers,
// « $ » APRÈS le montant. Utilisé à l'affichage et à l'export.

const ESPACE = " "; // insécable

/** Nombre en FR : « 74 134 », « 12,5 ». `null`/NaN → « n/d ». */
export function nombreFr(n: number | null | undefined, decimales?: number): string {
  if (n == null || !Number.isFinite(n)) return "n/d";
  const s = n.toLocaleString("fr-CA", {
    minimumFractionDigits: decimales ?? 0,
    maximumFractionDigits: decimales ?? 3,
  });
  // fr-CA utilise déjà l'espace insécable ; on force la cohérence au cas où.
  return s.replace(/\s/g, ESPACE);
}

/** Montant : « 12 500,50 $ » (symbole après, 2 décimales). */
export function montantFr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "n/d";
  return `${nombreFr(n, 2)}${ESPACE}$`;
}
