// Pipeline Word — SERVEUR UNIQUEMENT. Patche assets/report-template.docx avec
// patchDocument : on n'écrit aucun style/numérotation/pied/section, tout vient du
// gabarit MT Conseil. Placeholders : {{numero_projet}} {{client}} {{adresse}}
// {{type_service}} dans les pieds, {{fiches}} sous « Systèmes électromécaniques ».
//
// Mise en forme des fiches calquée sur la référence MT Conseil (docs/reference/) :
// les tableaux de la référence sont des images collées (aucun style Word réutilisable),
// donc les constantes ci-dessous sont extraites des éléments NATIFS de la référence
// (bandeau gris D9D9D9, police Fira Sans, bordures noires sz4) et des captures, et
// appliquées via des helpers uniques (une source par élément visuel). Les paragraphes
// réutilisent les vrais styles nommés du gabarit : Titre2 (titre 3.x), TITREFIGURES
// (légende « Figure N : » auto, italique), Puce1 (constats), Grilledutableau (photos).

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
  ImageRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  VerticalAlign,
  TableLayoutType,
  type IImageOptions,
  type ITableBordersOptions,
} from "docx";
import { afficher, parseCardFields, type CardFields, type Field, type Ligne2 } from "@/lib/field";
import { parseBuildingRow, type BuildingFields } from "@/lib/building";
import { idLabels } from "@/lib/equipmentId";
import { imageSize } from "./imageSize";

export const TEMPLATE_PATH = path.join(process.cwd(), "assets", "report-template.docx");

// Valeurs extraites de la référence (voir en-tête).
const FONT = "Fira Sans";
const GREY = "D9D9D9";
const FS = 16; // demi-points → 8 pt (taille du texte des tableaux / légendes)
const CONTENT_DXA = 9518; // largeur utile : page 12240 − marges 1588/1134

const LEGENDE_BODY =
  "Légende : DX : Détente directe | EC : eau chaude | ELE : Électricité | ER : Eau refroidie | GN : Gaz naturel";

const NO = { style: BorderStyle.NONE, size: 0, color: "auto" } as const;
const LINE = { style: BorderStyle.SINGLE, size: 4, color: "000000" } as const;
// Lignes horizontales seulement (tableaux 1, 2 et « Autre »).
const H_BORDERS: ITableBordersOptions = {
  top: LINE,
  bottom: LINE,
  left: NO,
  right: NO,
  insideHorizontal: LINE,
  insideVertical: NO,
};

export type ReportProject = {
  numero_projet: string | null;
  client_nom: string | null;
  client_adresse: string | null;
  type_service: string | null;
};
export type ReportPhoto = { data: Buffer; titre: string | null };
export type ReportCard = {
  titre: string | null;
  intro: string | null;
  row: unknown; // ligne equipment_cards complète (colonnes + fields)
  photos: ReportPhoto[];
};
export type ReportBuilding = {
  row: unknown; // ligne building_description (colonnes + fields)
  photos: ReportPhoto[]; // Figure 1+ (max 4, ordre d'affichage)
};

// --- Paragraphes / cellules (une source par élément) ------------------------

function para(
  text: string,
  o: { bold?: boolean; italics?: boolean; center?: boolean; size?: number } = {},
): Paragraph {
  return new Paragraph({
    alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: 20, after: 20, line: 240, lineRule: "auto" },
    children:
      text === ""
        ? []
        : [new TextRun({ text, bold: o.bold, italics: o.italics, font: FONT, size: o.size ?? FS })],
  });
}

// Cellule d'en-tête : bandeau gris, centrée, grasse ; « \n » = lignes empilées.
function headCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: GREY },
    children: text.split("\n").map((l) => para(l, { bold: true, center: true })),
  });
}

// Cellule de données : une ou plusieurs lignes (ex. débit = PCM puis % air frais).
function bodyCell(
  content: string | string[],
  o: { width?: number; center?: boolean; bold?: boolean } = {},
): TableCell {
  const lines = Array.isArray(content) ? content : [content];
  const center = o.center ?? true;
  return new TableCell({
    width: o.width ? { size: o.width, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: lines.map((t) => para(t, { center, bold: o.bold })),
  });
}

// --- Tableau 1 ---------------------------------------------------------------

// Largeurs ajustées pour que « Refroidissement », « Chauffage » et « Humidificateur »
// tiennent sur une seule ligne dans l'en-tête (colonnes de texte élargies, Description
// légèrement rétrécie). Somme = 9518 (largeur utile).
const W1 = [520, 1240, 1320, 820, 980, 1620, 1060, 1958];
const T1_HEAD = [
  "ID",
  "Description",
  "Marque /\nmodèle",
  "Débit (PCM)\n(min. A.F)",
  "Ventilateur",
  "Refroidissement",
  "Chauffage",
  "Humidificateur",
];

function tableau1(id: string, f: CardFields): Table {
  const data = [
    id,
    afficher(f.description),
    afficher(f.marque_modele),
    "", // débit : traité à part (2 lignes)
    afficher(f.ventilateur),
    afficher(f.refroidissement),
    afficher(f.chauffage),
    afficher(f.humidificateur),
  ];
  const dataCells = data.map((v, i) =>
    i === 3
      ? bodyCell([afficher(f.debit_pcm), afficher(f.pct_air_frais)], { width: W1[3] })
      : bodyCell(v, { width: W1[i] }),
  );
  return new Table({
    columnWidths: W1,
    width: { size: CONTENT_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: H_BORDERS,
    rows: [
      new TableRow({ tableHeader: true, children: T1_HEAD.map((h, i) => headCell(h, W1[i])) }),
      new TableRow({ children: dataCells }),
    ],
  });
}

// --- Tableau 2 (+ légende) ---------------------------------------------------

const W2 = [3000, 3259, 3259]; // somme = 9518

// Unité écrite dans la valeur (« 14 kW », « 80% ») ; « - »/« n/d » laissés tels quels.
function avecUnite(f: Field, unite: string, so: boolean): string {
  if (so) return "-";
  const v = afficher(f);
  if (v === "n/d" || v === "-") return v;
  return unite === "%" ? `${v}%` : `${v} ${unite}`;
}

function ligne2Row(label: string, l: Ligne2, so: boolean): TableRow {
  return new TableRow({
    children: [
      bodyCell(label, { width: W2[0], center: true, bold: false }),
      bodyCell(avecUnite(l.kw, "kW", so), { width: W2[1] }),
      bodyCell(avecUnite(l.eff, "%", so), { width: W2[2] }),
    ],
  });
}

function tableau2(f: CardFields): Table {
  const head = ["Type", "Capacité", "Efficacité"];
  return new Table({
    columnWidths: W2,
    width: { size: CONTENT_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: H_BORDERS,
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h, i) => headCell(h, W2[i])) }),
      ligne2Row("Refroidissement", f.refroid, f.refroidissement.etat === "so"),
      ligne2Row("Chauffage", f.chauff, f.chauffage.etat === "so"),
      // Légende : ligne centrée fusionnée sur les 3 colonnes, trait dessous (bordure bas).
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 3,
            children: [para(LEGENDE_BODY, { center: true })],
          }),
        ],
      }),
    ],
  });
}

// --- « + Autre » : même apparence que le tableau 2 (3 colonnes) --------------

function autresTable(f: CardFields): Table {
  return new Table({
    columnWidths: W2,
    width: { size: CONTENT_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: H_BORDERS,
    rows: f.autres.map(
      (a) =>
        new TableRow({
          children: [
            bodyCell(a.titre.trim() || "Autre", { width: W2[0], center: true, bold: false }),
            bodyCell(a.valeur.trim() || "n/d", { width: W2[1] }),
            bodyCell(a.unite.trim(), { width: W2[2] }),
          ],
        }),
    ),
  });
}

// --- Bandeau « Constat / remarques » ----------------------------------------

function constatBanner(): Table {
  return new Table({
    columnWidths: [CONTENT_DXA],
    width: { size: CONTENT_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: { top: NO, bottom: LINE, left: NO, right: NO, insideHorizontal: NO, insideVertical: NO },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: "auto", fill: GREY },
            children: [para("Constat / remarques", { bold: true, center: true })],
          }),
        ],
      }),
    ],
  });
}

// --- Photos : légende « Figure N : » (TITREFIGURES) au-dessus, 2 par rangée --

const PHOTO_W = 300; // px/colonne (≈ pleine demi-largeur comme la référence)
const PHOTO_COLS = [4759, 4759];

function captionCell(p: ReportPhoto): TableCell {
  // Style TITREFIGURES : italique, centré, numérotation auto « Figure N : » (numId 8).
  return new TableCell({
    children: [new Paragraph({ style: "TITREFIGURES", children: [new TextRun(p.titre?.trim() || "")] })],
  });
}
function imageCell(p: ReportPhoto): TableCell {
  const { type, w, h } = imageSize(p.data);
  const img = new ImageRun({
    data: p.data,
    type,
    transformation: { width: PHOTO_W, height: Math.round((PHOTO_W * h) / (w || PHOTO_W)) },
  } as IImageOptions);
  return new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [img] })] });
}
const emptyCell = () => new TableCell({ children: [new Paragraph("")] });

// Grille photos : table bordée (style Grilledutableau), rangées caption/image alternées.
function photosTable(photos: ReportPhoto[]): Table {
  const rows: TableRow[] = [];
  for (let i = 0; i < photos.length; i += 2) {
    const pair = photos.slice(i, i + 2);
    const caps = pair.map(captionCell);
    const imgs = pair.map(imageCell);
    if (pair.length === 1) {
      caps.push(emptyCell());
      imgs.push(emptyCell());
    }
    rows.push(new TableRow({ children: caps }));
    rows.push(new TableRow({ children: imgs }));
  }
  return new Table({
    style: "Grilledutableau",
    columnWidths: PHOTO_COLS,
    width: { size: CONTENT_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows,
  });
}

// --- Assemblage d'une fiche --------------------------------------------------

function spacer() {
  return new Paragraph({ children: [], spacing: { after: 120 } });
}

function ficheBlocks(cards: ReportCard[]): (Paragraph | Table)[] {
  const parsed = cards.map((c) => parseCardFields(c.row));
  const labels = idLabels(parsed);
  const out: (Paragraph | Table)[] = [];
  cards.forEach((c, i) => {
    const f = parsed[i];
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
    out.push(tableau1(labels[i], f), spacer());
    out.push(tableau2(f));
    if (f.autres.length) out.push(autresTable(f));

    const constats = f.constats.filter((x) => x.trim());
    if (constats.length) {
      out.push(spacer(), constatBanner());
      // Puce noire simple « • » (pas la numérotation Puce1, dont le glyphe dépend d'une
      // police absente → rendu en « tofu »). Petite taille (8 pt), interligne serré,
      // léger retrait avec alignement suspendu comme la référence.
      constats.forEach((x) =>
        out.push(
          new Paragraph({
            spacing: { before: 20, after: 40, line: 200, lineRule: "exact" },
            indent: { left: 360, hanging: 180 },
            children: [new TextRun({ text: `•  ${x}`, font: FONT, size: FS })],
          }),
        ),
      );
    }

    const anyEstime = f.debit_pcm.estime || f.refroid.eff.estime || f.chauff.eff.estime;
    if (anyEstime) {
      out.push(new Paragraph({ children: [new TextRun({ text: f.note_estime || "* Estimé", font: FONT, size: FS })] }));
    }

    if (c.photos.length) out.push(spacer(), photosTable(c.photos));
    out.push(spacer());
  });
  return out;
}

// --- Description du bâtiment (Phase 4) --------------------------------------

// Paragraphe de corps au style du gabarit (Corpsdetexte), « Label : valeur ».
function champPara(label: string, f: Field): Paragraph {
  return new Paragraph({
    style: "Corpsdetexte",
    children: [new TextRun({ text: `${label} : `, bold: true }), new TextRun(afficher(f))],
  });
}
function sousTitre(text: string): Paragraph {
  return new Paragraph({ style: "Corpsdetexte", children: [new TextRun({ text, bold: true })] });
}

// Tableau des zones (US-18) : en-tête gris + une ligne par zone, cellules texte simple.
const WZ = [3000, 2000, 1500, 3018]; // somme = 9518
function zonesTable(bf: BuildingFields): Table {
  const head = ["Zone", "Superficie (pi²)", "Étages", "Usage"];
  const cell = (v: string) => bodyCell(v.trim() || "n/d", { center: false });
  return new Table({
    columnWidths: WZ,
    width: { size: CONTENT_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: H_BORDERS,
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h, i) => headCell(h, WZ[i])) }),
      ...bf.zones.map(
        (z) =>
          new TableRow({
            children: [cell(z.nom), cell(z.superficie), cell(z.etages), cell(z.usage)],
          }),
      ),
    ],
  });
}

function descriptionBlocks(building: ReportBuilding): (Paragraph | Table)[] {
  const bf = parseBuildingRow(building.row);
  const out: (Paragraph | Table)[] = [];

  out.push(sousTitre("Le bâtiment"));
  out.push(champPara("Superficie brute totale (pi²)", bf.superficie_brute_totale));
  out.push(champPara("Année de construction", bf.annee_construction));
  out.push(champPara("Nombre d'étages", bf.nombre_etages));
  out.push(champPara("Type de construction", bf.type_construction));
  out.push(champPara("Usage principal", bf.usage_principal));
  for (const a of bf.autres_batiment)
    out.push(
      new Paragraph({
        style: "Corpsdetexte",
        children: [
          new TextRun({ text: `${a.titre.trim() || "Autre"} : `, bold: true }),
          new TextRun(`${a.valeur.trim() || "n/d"}${a.unite.trim() ? ` ${a.unite.trim()}` : ""}`),
        ],
      }),
    );

  if (bf.zones.length) {
    out.push(sousTitre("Zones"), zonesTable(bf), spacer());
    if (bf.ecart_note.trim())
      out.push(new Paragraph({ style: "Corpsdetexte", children: [new TextRun({ text: bf.ecart_note, italics: true })] }));
  }

  out.push(sousTitre("Alimentation en énergie"));
  out.push(champPara("Électricité", bf.elec));
  out.push(champPara("Gaz", bf.gaz));
  for (const a of bf.autres_energie)
    out.push(
      new Paragraph({
        style: "Corpsdetexte",
        children: [
          new TextRun({ text: `${a.titre.trim() || "Autre"} : `, bold: true }),
          new TextRun(`${a.valeur.trim() || "n/d"}${a.unite.trim() ? ` ${a.unite.trim()}` : ""}`),
        ],
      }),
    );

  // Photos du bâtiment + légendes « Figure N : » (1res figures du flux, numérotées par le
  // style TITREFIGURES, numId 8). Grille 2 par rangée, comme les photos d'équipement.
  if (building.photos.length) out.push(spacer(), photosTable(building.photos));

  return out;
}

export async function buildReport(
  project: ReportProject,
  cards: ReportCard[],
  building: ReportBuilding | null = null,
): Promise<Buffer> {
  const data = fs.readFileSync(TEMPLATE_PATH);
  const txt = (v: string | null) => ({
    type: PatchType.PARAGRAPH,
    children: [new TextRun(v?.trim() || "")],
  });

  const out = await patchDocument({
    outputType: "nodebuffer",
    data,
    keepOriginalStyles: true,
    patches: {
      numero_projet: txt(project.numero_projet),
      client: txt(project.client_nom),
      adresse: txt(project.client_adresse),
      type_service: txt(project.type_service),
      description: building
        ? { type: PatchType.DOCUMENT, children: descriptionBlocks(building) }
        : txt(""), // non confirmée → section vide
      fiches: { type: PatchType.DOCUMENT, children: ficheBlocks(cards) },
    },
  });
  return out;
}
