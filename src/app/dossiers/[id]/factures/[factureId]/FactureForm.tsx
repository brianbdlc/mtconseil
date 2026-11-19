"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAutosave } from "@/lib/useAutosave";
import { parseNombreFr, nombreFr } from "@/lib/format";
import { m3ToGj, gjToKwh } from "@/lib/units";
import { TAUX_TAXE } from "@/lib/energyParams";
import StatutBadge from "@/components/StatutBadge";
import {
  confirmFacture,
  deleteFacture,
  savePcs,
  setStatut as setStatutAction,
  updateFacture,
  type FacturePayload,
} from "../actions";
import FactureFichier from "./FactureFichier";

const LIBELLE: Record<string, string> = {
  idle: "",
  saving: "Enregistrement…",
  saved: "Enregistré",
  error: "Échec de l'enregistrement",
};

type FormState = {
  source: "gaz" | "elec";
  compteur: string;
  debut: string;
  fin: string;
  conso: string;
  ttc: string;
  avtx: string;
  avtxManuel: boolean;
  puissance: string;
  statut: string;
  fichierPath: string | null;
  fichierType: string | null;
};

export default function FactureForm({
  projectId,
  factureId,
  initialPcs,
  initial,
}: {
  projectId: string;
  factureId: string;
  initialPcs: number;
  initial: FormState;
}) {
  const [f, setF] = useState<FormState>(initial);
  const [statut, setStatut] = useState(initial.statut);
  const [pcs, setPcs] = useState(String(initialPcs));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const locked = statut === "confirme";
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  // montant_avtx proposé = ttc ÷ taux, tant que non corrigé (patron tonnes→kW).
  function setTtc(v: string) {
    setF((s) => {
      const ttcN = parseNombreFr(v);
      const avtx = s.avtxManuel
        ? s.avtx
        : ttcN != null
          ? nombreFr(ttcN / TAUX_TAXE, 2)
          : "";
      return { ...s, ttc: v, avtx };
    });
  }
  function recalcAvtx() {
    const ttcN = parseNombreFr(f.ttc);
    set("avtx", ttcN != null ? nombreFr(ttcN / TAUX_TAXE, 2) : "");
    set("avtxManuel", false);
  }

  const payload: FacturePayload = useMemo(
    () => ({
      source: f.source,
      numero_compteur: f.compteur.trim() || null,
      date_debut: f.debut || null,
      date_fin: f.fin || null,
      consommation: parseNombreFr(f.conso),
      montant_ttc: parseNombreFr(f.ttc),
      montant_avtx: parseNombreFr(f.avtx),
      montant_avtx_manuel: f.avtxManuel,
      puissance_appelee: f.source === "elec" ? parseNombreFr(f.puissance) : null,
    }),
    [f],
  );
  const save = useAutosave(payload, (v) => updateFacture(factureId, projectId, v));

  // PCS dossier-level (source unique = energy_settings) ; aperçu live GJ/kWh à la frappe.
  const savePcsStatus = useAutosave(pcs, async (v) => {
    const p = parseFloat(v.replace(",", "."));
    await savePcs(projectId, Number.isFinite(p) ? p : initialPcs);
  });

  function confirmer() {
    startTransition(async () => {
      await confirmFacture(factureId, projectId, payload);
      setStatut("confirme");
    });
  }
  function rouvrir() {
    startTransition(async () => {
      await setStatutAction(factureId, projectId, "brouillon");
      setStatut("brouillon");
    });
  }

  const consoN = parseNombreFr(f.conso);
  const pcsN = parseFloat(pcs.replace(",", "."));
  const gj = consoN != null && Number.isFinite(pcsN) ? m3ToGj(consoN, pcsN) : null;
  const confirmable = !!f.debut && !!f.fin && consoN != null;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {/* Saisie */}
      <div className="flex w-full max-w-lg flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link href={`/dossiers/${projectId}/factures`} className="text-sm text-n500 underline underline-offset-4">
            ← Factures
          </Link>
          <div className="flex items-center gap-3">
            <StatutBadge statut={statut} />
            <span className="h-4 text-xs text-n500" aria-live="polite">{LIBELLE[save]}</span>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">Source</span>
          <select
            value={f.source}
            disabled={locked}
            onChange={(e) => set("source", e.target.value as "gaz" | "elec")}
            className="h-11 rounded-md border border-n200 bg-n0 px-3 text-navy outline-none focus:border-navy disabled:bg-n50"
          >
            <option value="gaz">Gaz naturel (m³)</option>
            <option value="elec">Électricité (kWh)</option>
          </select>
        </label>

        <Champ label="Compteur">
          <input value={f.compteur} disabled={locked} onChange={(e) => set("compteur", e.target.value)} className={inputCls} />
        </Champ>

        <div className="grid grid-cols-2 gap-3">
          <Champ label="Début de période">
            <input type="date" value={f.debut} disabled={locked} onChange={(e) => set("debut", e.target.value)} className={inputCls} />
          </Champ>
          <Champ label="Fin de période">
            <input type="date" value={f.fin} disabled={locked} onChange={(e) => set("fin", e.target.value)} className={inputCls} />
          </Champ>
        </div>

        <Champ label={f.source === "gaz" ? "Consommation (m³)" : "Consommation (kWh)"}>
          <input value={f.conso} inputMode="decimal" disabled={locked} onChange={(e) => set("conso", e.target.value)} className={inputCls} />
        </Champ>

        {/* Gaz : PCS dossier-level + aperçu live GJ / kWh équiv. */}
        {f.source === "gaz" && (
          <div className="flex flex-col gap-2 rounded-md bg-n50 p-3">
            <Champ label="Pouvoir calorifique (MJ/m³)">
              <div className="flex items-center gap-2">
                <input
                  value={pcs}
                  inputMode="decimal"
                  disabled={locked}
                  onChange={(e) => setPcs(e.target.value)}
                  className={`${inputCls} w-32`}
                />
                <span className="text-xs text-n500">{LIBELLE[savePcsStatus]}</span>
              </div>
            </Champ>
            <p className="text-xs text-navy">
              {gj != null ? (
                <>
                  = <strong>{nombreFr(gj, 2)} GJ</strong> = {nombreFr(gjToKwh(gj), 0)} kWh équiv.
                </>
              ) : (
                <span className="text-n500">Saisissez consommation + PCS pour l’aperçu GJ.</span>
              )}
            </p>
          </div>
        )}

        <Champ label="Montant taxes incluses ($)">
          <input value={f.ttc} inputMode="decimal" disabled={locked} onChange={(e) => setTtc(e.target.value)} className={inputCls} />
        </Champ>

        <Champ label="Montant avant taxes ($) — proposé = total ÷ 1,14975">
          <div className="flex flex-col gap-1">
            <input
              value={f.avtx}
              inputMode="decimal"
              disabled={locked}
              onChange={(e) => { set("avtx", e.target.value); set("avtxManuel", true); }}
              className={inputCls}
            />
            {f.avtxManuel && f.ttc.trim() && !locked && (
              <button type="button" onClick={recalcAvtx} className="self-start text-xs text-info underline underline-offset-2">
                ↺ Recalculer depuis le total
              </button>
            )}
          </div>
        </Champ>

        {f.source === "elec" && (
          <Champ label="Puissance appelée (kW)">
            <input value={f.puissance} inputMode="decimal" disabled={locked} onChange={(e) => set("puissance", e.target.value)} className={inputCls} />
          </Champ>
        )}

        <div className="mt-2 flex items-center justify-between">
          {locked ? (
            <button type="button" onClick={rouvrir} disabled={pending} className="h-11 rounded-md border border-navy px-4 text-sm font-medium text-navy hover:bg-n50 disabled:opacity-50">
              Rouvrir pour modifier
            </button>
          ) : (
            <button type="button" onClick={confirmer} disabled={pending || save === "saving" || !confirmable} className="h-11 rounded-md bg-amber px-4 text-sm font-medium text-navy hover:bg-amber-hover disabled:opacity-50">
              Confirmer la facture
            </button>
          )}
          <button
            type="button"
            onClick={async () => { if (confirm("Supprimer cette facture ?")) { await deleteFacture(factureId, projectId); router.push(`/dossiers/${projectId}/factures`); } }}
            className="text-sm text-error underline underline-offset-4"
          >
            Supprimer
          </button>
        </div>
        {!locked && !confirmable && (
          <span className="text-xs text-n500">Début, fin et consommation requis pour confirmer.</span>
        )}
        {locked && (
          <p className="text-xs text-success">
            Facture confirmée — sert au bilan normalisé. Rouvrez-la pour la modifier.
          </p>
        )}
      </div>

      {/* Fichier (photo/PDF) à côté (US-32) */}
      <aside className="w-full flex-1">
        <FactureFichier
          factureId={factureId}
          projectId={projectId}
          disabled={locked}
          path={f.fichierPath}
          type={f.fichierType}
          onChange={(path, type) => { set("fichierPath", path); set("fichierType", type); }}
        />
      </aside>
    </div>
  );
}

const inputCls =
  "h-11 rounded-md border border-n200 bg-n0 px-3 text-navy outline-none focus:border-navy disabled:bg-n50 disabled:text-n500";

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-navy">{label}</span>
      {children}
    </label>
  );
}
