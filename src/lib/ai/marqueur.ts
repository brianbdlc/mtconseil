// R5/US-26 : détecteur du marqueur d'information manquante. Pur (client + serveur).
// Un texte contenant « [Information manquante » ne peut pas être confirmé.
export function aMarqueurManquant(texte: string): boolean {
  return texte.includes("[Information manquante");
}
