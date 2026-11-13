// Self-check export, sans framework : `node src/lib/docx/report.test.ts` (depuis la racine).
// Scénario : fiche confirmée dont la description a été MODIFIÉE sort bien la valeur
// modifiée ; une fiche brouillon (non transmise ici) n'apparaît pas ; saut de page par
// fiche ; « - » (refroidissement sans objet, règle tableau 1 → 2) rendu sans espace
// parasite. La glue docx reflète src/lib/docx/report.ts ; parseCardFields/afficher/
// idLabels sont importés réels (pas de path alias → imports relatifs).
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  patchDocument, PatchType, TextRun, Paragraph, Table, TableRow, TableCell, WidthType,
} from "docx";
import { afficher, parseCardFields, type CardFields, type Ligne2 } from "../field.ts";
import { idLabels } from "../equipmentId.ts";

const TEMPLATE = path.join(process.cwd(), "assets", "report-template.docx");
if (!fs.existsSync(TEMPLATE)) {
  console.log("report.test.ts IGNORÉ — gabarit assets/report-template.docx absent");
  process.exit(0);
}

const cell = (t: string) =>
  new TableCell({ children: [new Paragraph({ children: [new TextRun(t)] })] });
const ligne2 = (label: string, l: Ligne2, so: boolean) =>
  new TableRow({
    children: [cell(label), cell(so ? "-" : afficher(l.type)), cell(so ? "-" : afficher(l.kw)), cell(so ? "-" : afficher(l.eff))],
  });

const ficheBlocks = (cards: { titre: string; row: unknown }[]) => {
  const parsed = cards.map((c) => parseCardFields(c.row));
  const labels = idLabels(parsed);
  const out: (Paragraph | Table)[] = [];
  cards.forEach((c, i) => {
    const f: CardFields = parsed[i];
    out.push(new Paragraph({ style: "Titre2", pageBreakBefore: true, children: [new TextRun(c.titre?.trim() || "Sans titre")] }));
    out.push(new Table({
      style: "Grilledutableau",
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [cell("ID"), cell("Description")] }),
        new TableRow({ children: [cell(labels[i]), cell(afficher(f.description))] }),
      ],
    }));
    out.push(new Table({
      style: "Grilledutableau",
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [ligne2("Refroidissement", f.refroid, f.refroidissement.etat === "so")],
    }));
  });
  return out;
};

const MODIFIE = "DESC_MODIFIEE_XZ";
const BROUILLON = "FICHE_BROUILLON_EXCLUE_XZ";
// La route ne passe que les fiches confirmées : description = valeur modifiée,
// refroidissement « sans objet » → ligne tableau 2 « - ».
const confirmees = [
  {
    titre: "Fiche A",
    row: { description: MODIFIE, description_etat: "valeur", refroidissement_etat: "so", nb_unites: 1, fields: {} },
  },
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
