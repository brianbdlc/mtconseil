// Classement d'une ligne de markdown léger (sortie IA) pour l'export Word. Pur, sans
// dépendance docx → testable. « # » → titre2 (3.x numéroté, R8), « ## » → titre3,
// « - » → puce, ligne vide → vide, sinon corps. report.ts construit le Paragraph.

export type Classe =
  | { kind: "titre2"; texte: string }
  | { kind: "titre3"; texte: string }
  | { kind: "puce"; texte: string }
  | { kind: "corps"; texte: string }
  | { kind: "vide" };

export function classerLigne(raw: string): Classe {
  const line = raw.trimEnd();
  if (line.trim() === "") return { kind: "vide" };
  if (line.startsWith("## ")) return { kind: "titre3", texte: line.slice(3) };
  if (line.startsWith("# ")) return { kind: "titre2", texte: line.slice(2) };
  if (line.startsWith("- ")) return { kind: "puce", texte: line.slice(2) };
  return { kind: "corps", texte: line };
}
