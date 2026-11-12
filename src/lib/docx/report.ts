// Pipeline Word — SERVEUR UNIQUEMENT. Patche assets/report-template.docx avec
// patchDocument : on n'écrit aucun style/numérotation/pied/section, tout vient du
// gabarit MT Conseil. Placeholders : {{numero_projet}} {{client}} {{adresse}}
// {{type_service}} dans les pieds, {{fiches}} sous « Systèmes électromécaniques ».

import fs from "node:fs";
import path from "node:path";
import {
  patchDocument,
  PatchType,
  TextRun,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { afficher, parseCardFields } from "@/lib/field";

export const TEMPLATE_PATH = path.join(process.cwd(), "assets", "report-template.docx");

export type ReportProject = {
  numero_projet: string | null;
  client_nom: string | null;
  client_adresse: string | null;
  type_service: string | null;
};
export type ReportCard = {
  titre: string | null;
  intro: string | null;
  fields: unknown;
};

function kvRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
      }),
      new TableCell({ children: [new Paragraph(value)] }),
    ],
  });
}

// Blocs d'une fiche confirmée. Titre = style « Titre2 » du gabarit → numéroté 3.x
// par la numérotation multiniveau liée au style (R8). ID auto = rang (i+1).
function ficheBlocks(cards: ReportCard[]): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  cards.forEach((c, i) => {
    const f = parseCardFields(c.fields);
    out.push(
      new Paragraph({
        style: "Titre2",
        pageBreakBefore: true, // chaque fiche sur une nouvelle page (US-6)
        children: [new TextRun(c.titre?.trim() || "Sans titre")],
      }),
    );
    if (c.intro?.trim()) {
      out.push(new Paragraph({ style: "Corpsdetexte", children: [new TextRun(c.intro)] }));
    }
    // ponytail: tableau squelette Phase 2 (vertical, 2 col, 3 lignes). Forme définitive
    // = tableau 1 complet 8 colonnes horizontales + tableau 2 + constat + photos → Phase 3.
    out.push(
      new Table({
        style: "Grilledutableau",
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          kvRow("ID", String(i + 1)),
          kvRow("Description", afficher(f.description)),
          kvRow("Marque / modèle", afficher(f.marque_modele)),
        ],
      }),
    );
    out.push(new Paragraph({ children: [] }));
  });
  return out;
}

export async function buildReport(
  project: ReportProject,
  cards: ReportCard[],
): Promise<Buffer> {
  const data = fs.readFileSync(TEMPLATE_PATH);
  const txt = (v: string | null) => ({
    type: PatchType.PARAGRAPH,
    children: [new TextRun(v?.trim() || "")],
  });

  // TdM : la mise à jour en un clic (clic droit → « Mettre à jour les champs »)
  // se fait à l'ouverture dans Word (US-42) ; patchDocument n'expose pas d'option
  // pour forcer updateFields, et le contrôle TOC du gabarit est préservé tel quel.
  const out = await patchDocument({
    outputType: "nodebuffer",
    data,
    keepOriginalStyles: true,
    patches: {
      numero_projet: txt(project.numero_projet),
      client: txt(project.client_nom),
      adresse: txt(project.client_adresse),
      type_service: txt(project.type_service),
      fiches: { type: PatchType.DOCUMENT, children: ficheBlocks(cards) },
    },
  });
  return out;
}
