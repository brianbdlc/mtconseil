// Conversions métier (R : le code calcule, jamais l'IA). Corrigeables côté UI.

/** Tonnes de réfrigération → kW (US-11). 1 tonne = 3,517 kW, arrondi à 1 décimale. */
export function tonnesToKw(tonnes: number): number {
  return Math.round(tonnes * 3.517 * 10) / 10;
}

/** pi² → m² (1 pi² = 0,092903 m²). */
export function pi2ToM2(pi2: number): number {
  return pi2 * 0.092903;
}
