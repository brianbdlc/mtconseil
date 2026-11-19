// Conversions métier (R : le code calcule, jamais l'IA). Corrigeables côté UI.

/** Tonnes de réfrigération → kW (US-11). 1 tonne = 3,517 kW, arrondi à 1 décimale. */
export function tonnesToKw(tonnes: number): number {
  return Math.round(tonnes * 3.517 * 10) / 10;
}

/** pi² → m² (1 pi² = 0,092903 m²). */
export function pi2ToM2(pi2: number): number {
  return pi2 * 0.092903;
}

// Énergie : GJ = valeur maîtresse. Gaz m³ → GJ via pouvoir calorifique (MJ/m³)
// paramétrable ; GJ → kWh équiv. gaz = GJ × 277,7778 (JAMAIS 10,53 kWh/m³). Élec kWh → GJ.

/** Gaz m³ → GJ. `mjParM3` = pouvoir calorifique (MJ/m³, paramétrable par dossier). */
export function m3ToGj(m3: number, mjParM3: number): number {
  return (m3 * mjParM3) / 1000;
}

/** GJ → kWh équivalents (gaz). 1 GJ = 277,7778 kWh. */
export function gjToKwh(gj: number): number {
  return gj * 277.7778;
}

/** Électricité kWh → GJ. 1 kWh = 3,6 MJ = 0,0036 GJ. */
export function kwhToGj(kwh: number): number {
  return kwh * 0.0036;
}
