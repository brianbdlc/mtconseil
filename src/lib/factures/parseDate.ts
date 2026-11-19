// Analyse d'une date tapée à la main → date standard (R6 : le code calcule, pas d'IA).
// Instantané, gratuit, prévisible, aucune donnée ne sort. Convention québécoise JJ/MM/AAAA.
// Tolère : mois en lettres (accents/casse ignorés, fautes de frappe par troncature),
// abréviations Énergir à 2 lettres, « 1er », séparateurs / - . ou espace, format ISO
// AAAA-MM-JJ, année 2 chiffres → 20xx, année absente → année de référence du dossier.

export type DateParseOk = {
  ok: true;
  iso: string; // AAAA-MM-JJ (valeur stockée / posée dans l'input date)
  jj: string; // JJ/MM/AAAA (affichage)
  enLettres: string; // « 1er janvier 2023 »
  anneeDeduite: boolean; // true = année prise sur l'année de référence
};
export type DateParseErr = { ok: false; erreur: string };
export type DateParseResult = DateParseOk | DateParseErr;

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const MOIS_NORM = MOIS.map(norm);

// Abréviations Énergir à 2 lettres (prioritaires pour un jeton de 2 caractères).
const ENERGIR: Record<string, number> = {
  ja: 1, fe: 2, mr: 3, al: 4, ma: 5, jn: 6,
  jl: 7, au: 8, se: 9, oc: 10, no: 11, de: 12,
};

function joursDansMois(mois: number, annee: number): number {
  const bissextile = (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;
  return [31, bissextile ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mois - 1];
}

// Résout un jeton « mois » (texte ou numérique) → numéro, ou ambigu, ou inconnu.
type MoisRes = { mois: number } | { ambigu: string[] } | { inconnu: true };
function resoudreMois(tok: string): MoisRes {
  if (/^\d{1,2}$/.test(tok)) {
    const n = +tok;
    return n >= 1 && n <= 12 ? { mois: n } : { inconnu: true };
  }
  const t = norm(tok);
  if (t.length === 2 && t in ENERGIR) return { mois: ENERGIR[t] };
  if (t.length < 2) {
    const tous = MOIS_NORM.filter((m) => m.startsWith(t));
    return tous.length ? { ambigu: tous } : { inconnu: true };
  }
  // Correspondance par préfixe : tolère les troncatures (janvie, decembr, sept, déc).
  let cands = MOIS_NORM.map((m, i) => (m.startsWith(t) ? i : -1)).filter((i) => i >= 0);
  // Repli : distance d'édition ≤ 1 (petite faute de frappe) si aucun préfixe.
  if (cands.length === 0)
    cands = MOIS_NORM.map((m, i) => (editDistance(m, t) <= 1 ? i : -1)).filter((i) => i >= 0);
  if (cands.length === 1) return { mois: cands[0] + 1 };
  if (cands.length > 1) return { ambigu: cands.map((i) => MOIS[i]) };
  return { inconnu: true };
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return dp[a.length][b.length];
}

function err(msg: string): DateParseErr {
  return { ok: false, erreur: msg };
}

function finaliser(d: number, mo: number, annee: number, deduite: boolean): DateParseResult {
  if (mo < 1 || mo > 12) return err(`Mois invalide : « ${mo} ».`);
  if (d < 1 || d > joursDansMois(mo, annee))
    return err(`Le ${d} ${MOIS[mo - 1]} ${annee} n'existe pas.`);
  const p2 = (n: number) => String(n).padStart(2, "0");
  return {
    ok: true,
    iso: `${annee}-${p2(mo)}-${p2(d)}`,
    jj: `${p2(d)}/${p2(mo)}/${annee}`,
    enLettres: `${d === 1 ? "1er" : d} ${MOIS[mo - 1]} ${annee}`,
    anneeDeduite: deduite,
  };
}

function resoudreAnnee(tok: string): number | null {
  if (/^\d{4}$/.test(tok)) return +tok;
  if (/^\d{2}$/.test(tok)) return 2000 + +tok; // année 2 chiffres → 20xx
  return null;
}

/** Jour : 1-2 chiffres, « 1er »/« 1 » acceptés. Renvoie le nombre ou null. */
function resoudreJour(tok: string): number | null {
  const m = tok.match(/^(\d{1,2})(?:er|re|e|ere|eme|ieme)?$/i);
  if (!m) return null;
  const n = +m[1];
  return n >= 1 && n <= 31 ? n : null;
}

export function parseDateFr(input: string, anneeReference: number | null): DateParseResult {
  const s = (input ?? "").trim().replace(/\s+/g, " ");
  if (!s) return err("Date vide.");

  // Format ISO AAAA-MM-JJ (jamais ambigu : année en premier).
  const iso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (iso) return finaliser(+iso[3], +iso[2], +iso[1], false);

  const toks = s.split(/[\s/\-.,]+/).filter(Boolean);

  let dayTok: string, moTok: string, yrTok: string | null;
  if (toks.length === 3) {
    if (/^\d{4}$/.test(toks[0])) [yrTok, moTok, dayTok] = [toks[0], toks[1], toks[2]];
    else [dayTok, moTok, yrTok] = [toks[0], toks[1], toks[2]];
  } else if (toks.length === 2) {
    // Jour + mois, année absente → année de référence (convention JJ MM).
    [dayTok, moTok, yrTok] = [toks[0], toks[1], null];
  } else {
    return err(`Date illisible : « ${s} ». Essayez « 15/02/2024 » ou « 15 février 2024 ».`);
  }

  const d = resoudreJour(dayTok);
  if (d == null) return err(`Jour illisible : « ${dayTok} ».`);

  const mr = resoudreMois(moTok);
  if ("ambigu" in mr)
    return err(`Mois ambigu : « ${moTok} » peut être ${mr.ambigu.join(" ou ")}. Précisez.`);
  if ("inconnu" in mr) return err(`Mois non reconnu : « ${moTok} ».`);

  let annee: number;
  let deduite = false;
  if (yrTok == null) {
    if (anneeReference == null)
      return err("Année manquante : précisez l'année (aucune année de référence au dossier).");
    annee = anneeReference;
    deduite = true;
  } else {
    const y = resoudreAnnee(yrTok);
    if (y == null) return err(`Année illisible : « ${yrTok} ».`);
    annee = y;
  }

  return finaliser(d, mr.mois, annee, deduite);
}
