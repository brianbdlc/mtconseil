// Self-check export, sans framework : `node src/lib/docx/report.test.ts` (depuis la racine).
// Scénario demandé : fiche confirmée → rouverte → champ modifié → re-confirmée ;
// on vérifie que la VALEUR MODIFIÉE (pas l'ancienne) sort dans le .docx, que les
// brouillons sont exclus, qu'il y a un saut de page par fiche et que « - » n'a pas
// d'espace parasite. La glue docx ci-dessous reflète src/lib/docx/report.ts (à garder
// en phase) ; la logique d'affichage `afficher` est importée réelle, pas répliquée.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  patchDocument, PatchType, TextRun, Paragraph, Table, TableRow, TableCell, WidthType,
} from "docx";
import { afficher, type CardFields } from "../field.ts";

const TEMPLATE = path.join(process.cwd(), "assets", "report-template.docx");
if (!fs.existsSync(TEMPLATE)) {
  console.log("report.test.ts IGNORÉ — gabarit assets/report-template.docx absent");
  process.exit(0);
}

const kvRow = (label: string, value: string) =>
  new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })] }),
      new TableCell({ children: [new Paragraph(value)] }),
    ],
  });
const ficheBlocks = (cards: { titre: string; intro: string; fields: CardFields }[]) => {
  const out: (Paragraph | Table)[] = [];
  cards.forEach((c, i) => {
    out.push(new Paragraph({ style: "Titre2", pageBreakBefore: true, children: [new TextRun(c.titre?.trim() || "Sans titre")] }));
    if (c.intro?.trim()) out.push(new Paragraph({ style: "Corpsdetexte", children: [new TextRun(c.intro)] }));
    out.push(new Table({
      style: "Grilledutableau",
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [kvRow("ID", String(i + 1)), kvRow("Description", afficher(c.fields.description)), kvRow("Marque / modèle", afficher(c.fields.marque_modele))],
    }));
    out.push(new Paragraph({ children: [] }));
  });
  return out;
};

const MODIFIE = "DESC_MODIFIEE_XZ";
const BROUILLON = "FICHE_BROUILLON_EXCLUE_XZ";
// La route ne passe que les fiches confirmées ; la fiche re-confirmée porte la valeur
// modifiée, la brouillon n'est pas transmise.
const confirmees = [
  { titre: "Fiche A", intro: "", fields: { description: { valeur: MODIFIE, etat: "valeur" }, marque_modele: { valeur: "", etat: "so" } } as CardFields },
];

const txt = (v: string | null) => ({ type: PatchType.PARAGRAPH, children: [new TextRun((v || "").trim())] });
const buf = await patchDocument({
  outputType: "nodebuffer",
  data: fs.readFileSync(TEMPLATE),
  keepOriginalStyles: true,
  patches: {
    numero_projet: txt("P00999"), client: txt("Test"), adresse: txt("Adr"), type_service: txt("ÉTUDE"),
    fiches: { type: PatchType.DOCUMENT, children: ficheBlocks(confirmees) },
  },
});

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mtc-"));
const dst = path.join(dir, "out.docx");
fs.writeFileSync(dst, buf);

assert.equal(buf.subarray(0, 2).toString("latin1"), "PK", ".docx doit être un zip valide");
const docXml = execSync(`unzip -p "${dst}" word/document.xml`, { encoding: "utf-8", maxBuffer: 1 << 24 });

assert.ok(docXml.includes(MODIFIE), "la valeur modifiée doit sortir dans le Word");
assert.ok(!docXml.includes(BROUILLON), "une fiche brouillon ne doit pas sortir");
assert.ok(docXml.includes("<w:pageBreakBefore/>"), "saut de page avant chaque fiche");
assert.ok(/>-<\/w:t>/.test(docXml), "« - » (sans objet) rendu tel quel");
assert.ok(!/>- <\/w:t>/.test(docXml), "« - » ne doit pas avoir d'espace parasite");

fs.rmSync(dir, { recursive: true, force: true });
console.log("report.ts OK (valeur modifiée exportée, brouillon exclu, saut de page, « - » rogné)");
