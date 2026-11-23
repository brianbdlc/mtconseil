"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseNombreFr, nombreFr, montantFr } from "@/lib/format";
import { m3ToGj, gjToKwh, kwhToGj } from "@/lib/units";
import { TAUX_TAXE, PCS_DEFAUT_MJ_M3 } from "@/lib/energyParams";
import { normaliser, type FactureNorm, type Normalisation } from "@/lib/factures/normalize";
import { avertissements } from "@/lib/factures/coherence";
import StatutBadge from "@/components/StatutBadge";
import DateInput from "./DateInput";
import {
  createFacture,
  updateFacture,
  confirmFacture,
  setStatut as setStatutAction,
  deleteFacture,
  saveEnergySettings,
  type FactureRow,
  type FacturePayload,
} from "./actions";

const MOIS = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
const DAY = 86_400_000;

type EditRow = {
  id: string;
  source: "gaz" | "elec";
  compteur: string;
  debut: string; // ISO ou ""
  fin: string;
  conso: string;
  ttc: string;
  avtx: string;
  avtxManuel: boolean;
  puissance: string;
  fichierPath: string | null;
  statut: string;
};

function fromDb(r: FactureRow): EditRow {
  return {
    id: r.id,
    source: (r.source as "gaz" | "elec") ?? "gaz",
    compteur: r.numero_compteur ?? "",
    debut: r.date_debut ?? "",
    fin: r.date_fin ?? "",
    conso: r.consommation != null ? String(r.consommation) : "",
    ttc: r.montant_ttc != null ? String(r.montant_ttc) : "",
    avtx: r.montant_avtx != null ? String(r.montant_avtx) : "",
    avtxManuel: r.montant_avtx_manuel ?? false,
    puissance: r.puissance_appelee != null ? String(r.puissance_appelee) : "",
    fichierPath: r.fichier_path ?? null,
    statut: r.statut,
  };
}

function toPayload(r: EditRow): FacturePayload {
  return {
    source: r.source,
    numero_compteur: r.compteur.trim() || null,
    date_debut: r.debut || null,
    date_fin: r.fin || null,
    consommation: parseNombreFr(r.conso),
    montant_ttc: parseNombreFr(r.ttc),
    montant_avtx: parseNombreFr(r.avtx),
    montant_avtx_manuel: r.avtxManuel,
    puissance_appelee: r.source === "elec" ? parseNombreFr(r.puissance) : null,
  };
}

const dayNum = (iso: string) => Math.floor(new Date(`${iso}T00:00:00Z`).getTime() / DAY);
function joursPeriode(r: EditRow): number | null {
  if (!r.debut || !r.fin) return null;
  const n = dayNum(r.fin) - dayNum(r.debut) + 1;
  return n >= 1 ? n : null;
}
function lendemain(iso: string): string {
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() + DAY).toISOString().slice(0, 10);
}

export default function FacturesClient({
  projectId,
  initialRows,
  initialPcs,
  initialAnnee,
  initialTitre,
}: {
  projectId: string;
  initialRows: FactureRow[];
  initialPcs: number;
  initialAnnee: number | null;
  initialTitre: string;
}) {
  const [rows, setRows] = useState<EditRow[]>(initialRows.map(fromDb));
  const [pcs, setPcs] = useState(String(initialPcs));
  const [annee, setAnnee] = useState(initialAnnee != null ? String(initialAnnee) : "");
  const [titre, setTitre] = useState(initialTitre);
  const [adding, setAdding] = useState(false);

  const anneeNum = /^\d{4}$/.test(annee) ? +annee : null;
  const pcsNum = parseFloat(pcs.replace(",", ".")) || PCS_DEFAUT_MJ_M3;

  // --- Autosave réglages (energy_settings) ---------------------------------
  const settingsSaved = useRef(JSON.stringify({ pcs: initialPcs, annee: initialAnnee, titre: initialTitre }));
  useEffect(() => {
    const payload = {
      pouvoir_calorifique_mj_m3: parseFloat(pcs.replace(",", ".")) || PCS_DEFAUT_MJ_M3,
      annee_reference: /^\d{4}$/.test(annee) ? +annee : null,
      titre_apercu: titre.trim() || null,
    };
    const ser = JSON.stringify({ pcs: payload.pouvoir_calorifique_mj_m3, annee: payload.annee_reference, titre: payload.titre_apercu });
    if (ser === settingsSaved.current) return;
    const t = setTimeout(async () => {
      await saveEnergySettings(projectId, payload);
      settingsSaved.current = ser;
    }, 800);
    return () => clearTimeout(t);
  }, [pcs, annee, titre, projectId]);

  // --- Autosave par ligne ---------------------------------------------------
  const rowSaved = useRef<Record<string, string>>({});
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const r of rows) {
      const ser = JSON.stringify(toPayload(r));
      if (rowSaved.current[r.id] === undefined) {
        rowSaved.current[r.id] = ser; // déjà en base (montage ou ligne ajoutée) → pas de save
        continue;
      }
      if (rowSaved.current[r.id] === ser) continue;
      const t = setTimeout(async () => {
        await updateFacture(r.id, projectId, toPayload(r));
        rowSaved.current[r.id] = ser;
        setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, statut: "brouillon" } : x)));
      }, 800);
      timers.push(t);
    }
    return () => timers.forEach(clearTimeout);
  }, [rows, projectId]);

  function patch(id: string, p: Partial<EditRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? appliquer(r, p) : r)));
  }
  // Applique un patch + propose montant av.tx = ttc ÷ taux tant que non corrigé.
  function appliquer(r: EditRow, p: Partial<EditRow>): EditRow {
    const n = { ...r, ...p };
    if ("ttc" in p && !n.avtxManuel) {
      const ttcN = parseNombreFr(n.ttc);
      n.avtx = ttcN != null ? nombreFr(ttcN / TAUX_TAXE, 2) : "";
    }
    return n;
  }

  async function ajouter() {
    setAdding(true);
    try {
      const prev = rows[rows.length - 1];
      const prefill = prev
        ? {
            source: prev.source,
            numero_compteur: prev.compteur || null,
            date_debut: prev.fin ? lendemain(prev.fin) : null,
          }
        : undefined;
      const row = await createFacture(projectId, prefill);
      setRows((rs) => [...rs, fromDb(row)]);
    } finally {
      setAdding(false);
    }
  }

  async function confirmer(r: EditRow) {
    await confirmFacture(r.id, projectId, toPayload(r));
    rowSaved.current[r.id] = JSON.stringify(toPayload(r));
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, statut: "confirme" } : x)));
  }
  async function rouvrir(r: EditRow) {
    await setStatutAction(r.id, projectId, "brouillon");
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, statut: "brouillon" } : x)));
  }
  async function supprimer(r: EditRow) {
    if (!confirm("Supprimer cette facture ?")) return;
    setRows((rs) => rs.filter((x) => x.id !== r.id));
    delete rowSaved.current[r.id];
    await deleteFacture(r.id, projectId);
  }

  // --- Aperçu normalisé (client, instantané) --------------------------------
  const { norm, averts } = useMemo(() => {
    if (anneeNum == null) return { norm: null, averts: [] as string[] };
    const input: FactureNorm[] = rows
      .filter((r) => r.debut && r.fin)
      .map((r) => ({
        source: r.source,
        compteur: r.compteur,
        debut: new Date(`${r.debut}T00:00:00Z`),
        fin: new Date(`${r.fin}T00:00:00Z`),
        consommation: parseNombreFr(r.conso),
        coutAvtx: parseNombreFr(r.avtx),
      }));
    return { norm: normaliser(input, anneeNum), averts: avertissements(input, anneeNum) };
  }, [rows, anneeNum]);

  return (
    <div className="flex flex-col gap-6">
      {/* Réglages énergie */}
      <fieldset className="flex flex-col gap-3 rounded-md border border-n200 p-4">
        <legend className="px-1 text-sm font-semibold text-navy">Réglages énergie</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-navy">Année de référence</span>
            <input
              type="number"
              aria-label="Année de référence"
              value={annee}
              placeholder="ex. 2024"
              onChange={(e) => setAnnee(e.target.value)}
              className="h-11 w-40 rounded-md border border-n200 bg-n0 px-3 text-navy outline-none focus:border-navy"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-navy">Pouvoir calorifique (MJ/m³)</span>
            <input
              type="number"
              step="0.01"
              aria-label="Pouvoir calorifique"
              value={pcs}
              onChange={(e) => setPcs(e.target.value)}
              className="h-11 w-40 rounded-md border border-n200 bg-n0 px-3 text-navy outline-none focus:border-navy"
            />
          </label>
        </div>
      </fieldset>

      {/* Liste des factures */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-navy">Factures ({rows.length})</h2>
        <button
          type="button"
          onClick={ajouter}
          disabled={adding}
          className="h-11 rounded-md bg-amber px-4 text-sm font-medium text-navy hover:bg-amber-hover disabled:opacity-50"
        >
          + Ajouter une facture
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-n500">Aucune facture. Ajoutez-en une pour commencer la saisie.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <FactureBloc
              key={r.id}
              projectId={projectId}
              r={r}
              anneeReference={anneeNum}
              jours={joursPeriode(r)}
              onPatch={(p) => patch(r.id, p)}
              onConfirm={() => confirmer(r)}
              onRouvrir={() => rouvrir(r)}
              onDelete={() => supprimer(r)}
            />
          ))}
        </ul>
      )}

      {/* Avertissements de cohérence (non bloquants) */}
      {averts.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md bg-amber-tint p-3 text-sm text-warning" role="alert">
          {averts.map((a, i) => (
            <span key={i}>⚠ {a}</span>
          ))}
        </div>
      )}

      {/* Aperçu 12 mois normalisés */}
      <Apercu norm={norm} annee={anneeNum} pcs={pcsNum} titre={titre} onTitre={setTitre} />
    </div>
  );
}

// ---------------------------------------------------------------------------
function FactureBloc({
  projectId,
  r,
  anneeReference,
  jours,
  onPatch,
  onConfirm,
  onRouvrir,
  onDelete,
}: {
  projectId: string;
  r: EditRow;
  anneeReference: number | null;
  jours: number | null;
  onPatch: (p: Partial<EditRow>) => void;
  onConfirm: () => void;
  onRouvrir: () => void;
  onDelete: () => void;
}) {
  const locked = r.statut === "confirme";
  const inp =
    "h-10 rounded-md border border-n200 bg-n0 px-2 text-sm text-navy outline-none focus:border-navy disabled:bg-n50 disabled:text-n500";
  return (
    <li data-facture-row className="flex flex-col gap-3 rounded-md border border-n200 bg-n0 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-n500">Source</span>
          <select aria-label="Source" value={r.source} disabled={locked} onChange={(e) => onPatch({ source: e.target.value as "gaz" | "elec" })} className={`${inp} w-28`}>
            <option value="gaz">Gaz (m³)</option>
            <option value="elec">Élec (kWh)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-n500">Compteur</span>
          <input aria-label="Compteur" value={r.compteur} disabled={locked} onChange={(e) => onPatch({ compteur: e.target.value })} className={`${inp} w-32`} />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-n500">Début</span>
          <DateInput value={r.debut} anneeReference={anneeReference} disabled={locked} onChange={(iso) => onPatch({ debut: iso })} ariaLabel="Début de période" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-n500">Fin</span>
          <DateInput value={r.fin} anneeReference={anneeReference} disabled={locked} onChange={(iso) => onPatch({ fin: iso })} ariaLabel="Fin de période" />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-n500">Jours</span>
          <span data-jours className="flex h-10 w-14 items-center justify-center rounded-md bg-n50 text-sm font-mono text-navy">
            {jours ?? "—"}
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-n500">{r.source === "gaz" ? "Conso (m³)" : "Conso (kWh)"}</span>
          <input aria-label="Consommation" value={r.conso} inputMode="decimal" disabled={locked} onChange={(e) => onPatch({ conso: e.target.value })} className={`${inp} w-28`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-n500">Montant taxes incl. ($)</span>
          <input aria-label="Montant taxes incluses" value={r.ttc} inputMode="decimal" disabled={locked} onChange={(e) => onPatch({ ttc: e.target.value })} className={`${inp} w-32`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-n500">
            Montant av. taxes ($){" "}
            {!r.avtxManuel && r.avtx && <span className="rounded-sm bg-info-tint px-1 text-[10px] text-info">calculé</span>}
          </span>
          <div className="flex items-center gap-1">
            <input aria-label="Montant avant taxes" value={r.avtx} inputMode="decimal" disabled={locked} onChange={(e) => onPatch({ avtx: e.target.value, avtxManuel: true })} className={`${inp} w-32`} />
            {r.avtxManuel && r.ttc.trim() && !locked && (
              <button type="button" aria-label="Recalculer le montant avant taxes" onClick={() => onPatch({ avtxManuel: false, avtx: parseNombreFr(r.ttc) != null ? nombreFr(parseNombreFr(r.ttc)! / TAUX_TAXE, 2) : "" })} className="text-xs text-info underline">↺</button>
            )}
          </div>
        </label>
        {r.source === "elec" && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-n500">Puissance (kW)</span>
            <input aria-label="Puissance appelée" value={r.puissance} inputMode="decimal" disabled={locked} onChange={(e) => onPatch({ puissance: e.target.value })} className={`${inp} w-28`} />
          </label>
        )}
      </div>

      <div className="flex items-center gap-3">
        <StatutBadge statut={r.statut} />
        {locked ? (
          <button type="button" onClick={onRouvrir} className="h-9 rounded-md border border-navy px-3 text-sm font-medium text-navy hover:bg-n50">Rouvrir</button>
        ) : (
          <button type="button" onClick={onConfirm} className="h-9 rounded-md bg-amber px-3 text-sm font-medium text-navy hover:bg-amber-hover">Confirmer</button>
        )}
        <Link href={`/dossiers/${projectId}/factures/${r.id}`} className="text-sm text-info underline underline-offset-2">
          📎 Fichier{r.fichierPath ? " ✓" : ""}
        </Link>
        <button type="button" onClick={onDelete} className="ml-auto text-sm text-error underline underline-offset-2">Supprimer</button>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
function Apercu({ norm, annee, pcs, titre, onTitre }: { norm: Normalisation | null; annee: number | null; pcs: number; titre: string; onTitre: (v: string) => void }) {
  if (annee == null)
    return (
      <section className="flex flex-col gap-2">
        <h3 className="font-display text-base font-bold text-navy">Aperçu — 12 mois normalisés</h3>
        <p className="text-sm text-n500">Choisissez une année de référence pour voir la normalisation.</p>
      </section>
    );

  const titreDefaut = `Aperçu — 12 mois normalisés (${annee})`;

  const n = norm!;
  // Totaux annuels : « incomplet » si au moins un mois est manquant (jamais de somme
  // partielle présentée comme complète).
  const total = (arr: (number | null)[]) => {
    const presents = arr.filter((x): x is number => x != null);
    return { somme: presents.reduce((s, x) => s + x, 0), complet: presents.length === 12 };
  };
  const gazConso = total(n.gaz.map((m) => m.consommation));
  const gazCout = total(n.gaz.map((m) => m.cout));
  const elecConso = total(n.elec.map((m) => m.consommation));
  const elecCout = total(n.elec.map((m) => m.cout));

  return (
    <section className="flex flex-col gap-2" data-apercu>
      <input
        aria-label="Titre de l'aperçu"
        value={titre}
        placeholder={titreDefaut}
        onChange={(e) => onTitre(e.target.value)}
        className="w-full border-b border-transparent bg-transparent font-display text-base font-bold text-navy outline-none placeholder:text-navy hover:border-n200 focus:border-navy"
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs whitespace-nowrap tabular-nums">
          <thead>
            <tr className="bg-n50 text-left text-navy">
              {["Mois","Gaz (m³)","Gaz (GJ)","Gaz (kWh éq.)","Coût (av.tx)","Élec (kWh)","Élec (GJ)","Coût (av.tx)"].map((h, i) => (
                <th key={i} className="border border-n200 px-2 py-1 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOIS.map((mois, m) => {
              const g = n.gaz[m];
              const e = n.elec[m];
              return (
                <tr key={m} data-mois={mois} className="text-navy">
                  <td className="border border-n200 px-2 py-1 font-medium">{mois}</td>
                  <Cell v={g.consommation} fmt={(x) => nombreFr(x, 0)} />
                  <Cell v={g.consommation} fmt={(x) => nombreFr(m3ToGj(x, pcs), 2)} />
                  <Cell v={g.consommation} fmt={(x) => nombreFr(gjToKwh(m3ToGj(x, pcs)), 0)} />
                  <Cell v={g.cout} fmt={montantFr} />
                  <Cell v={e.consommation} fmt={(x) => nombreFr(x, 0)} />
                  <Cell v={e.consommation} fmt={(x) => nombreFr(kwhToGj(x), 2)} />
                  <Cell v={e.cout} fmt={montantFr} />
                </tr>
              );
            })}
            <tr className="bg-n50 font-semibold text-navy" data-total>
              <td className="border border-n200 px-2 py-1">Total</td>
              <Total t={gazConso} fmt={(x) => nombreFr(x, 0)} />
              <Total t={{ somme: m3ToGj(gazConso.somme, pcs), complet: gazConso.complet }} fmt={(x) => nombreFr(x, 0)} />
              <Total t={{ somme: gjToKwh(m3ToGj(gazConso.somme, pcs)), complet: gazConso.complet }} fmt={(x) => nombreFr(x, 0)} />
              <Total t={gazCout} fmt={montantFr} />
              <Total t={elecConso} fmt={(x) => nombreFr(x, 0)} />
              <Total t={{ somme: kwhToGj(elecConso.somme), complet: elecConso.complet }} fmt={(x) => nombreFr(x, 0)} />
              <Total t={elecCout} fmt={montantFr} />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Cell({ v, fmt }: { v: number | null; fmt: (x: number) => string }) {
  if (v == null)
    return <td className="border border-n200 bg-amber-tint px-2 py-1 text-warning">manquant</td>;
  return <td className="border border-n200 px-2 py-1">{fmt(v)}</td>;
}

function Total({ t, fmt }: { t: { somme: number; complet: boolean }; fmt: (x: number) => string }) {
  return (
    <td className="border border-n200 px-2 py-1">
      {fmt(t.somme)}
      {!t.complet && <span className="ml-1 text-[10px] text-warning">(incomplet)</span>}
    </td>
  );
}
