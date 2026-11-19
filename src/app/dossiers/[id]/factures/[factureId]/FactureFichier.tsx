"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setFichier, deleteFichier } from "../actions";

const BUCKET = "facture-fichiers";

// Fichier source d'UNE facture (US-32) : 1 image OU PDF, affiché à côté de la saisie pour
// recopier/vérifier. Image → zoom + rotation (CSS transform) ; PDF → iframe. HEIC converti.
// Pas de lecture automatique (Phase 7b).
export default function FactureFichier({
  factureId,
  projectId,
  disabled,
  path,
  type,
  onChange,
}: {
  factureId: string;
  projectId: string;
  disabled: boolean;
  path: string | null;
  type: string | null;
  onChange: (path: string | null, type: string | null) => void;
}) {
  const [url, setUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [supabase] = useState(createClient);

  useEffect(() => {
    if (!path) return; // le rendu masque l'aperçu quand path est null
    let alive = true;
    (async () => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (alive && data?.signedUrl) setUrl(data.signedUrl);
    })();
    return () => { alive = false; };
  }, [path, supabase]);

  async function onFile(file: File | null) {
    if (!file) return;
    setErr("");
    setBusy(true);
    try {
      const isPdf = /pdf/i.test(file.type) || /\.pdf$/i.test(file.name);
      const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
      let blob: Blob = file;
      let ext = file.name.split(".").pop() || "bin";
      if (isHeic) {
        const heic2any = (await import("heic2any")).default;
        blob = (await heic2any({ blob: file, toType: "image/jpeg" })) as Blob;
        ext = "jpg";
      }
      const kind = isPdf ? "pdf" : "image";
      const p = `${factureId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(p, blob, { contentType: blob.type || (isPdf ? "application/pdf" : "image/jpeg") });
      if (error) throw error;
      await setFichier(factureId, projectId, p, kind);
      onChange(p, kind);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Échec du téléversement.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!path) return;
    const old = path;
    onChange(null, null);
    await deleteFichier(factureId, projectId, old);
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-n200 bg-n0 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-navy">Facture (photo ou PDF)</span>
        {!disabled && !path && (
          <label className={`h-9 cursor-pointer rounded-md border border-navy px-3 text-sm font-medium text-navy leading-9 hover:bg-n50 ${busy ? "pointer-events-none opacity-50" : ""}`}>
            {busy ? "Téléversement…" : "+ Téléverser"}
            <input
              type="file"
              accept="image/*,.heic,.heif,application/pdf"
              className="hidden"
              onChange={(e) => { onFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
            />
          </label>
        )}
        {!disabled && path && (
          <button type="button" onClick={remove} className="text-xs text-error underline underline-offset-2">
            Supprimer le fichier
          </button>
        )}
      </div>
      {err && <p className="text-xs text-error">{err}</p>}

      {!path && <p className="text-xs text-n500">Aucun fichier. Téléversez la facture pour la recopier.</p>}

      {path && type === "pdf" && url && (
        <iframe src={url} title="Facture PDF" className="h-[70vh] w-full rounded-sm border border-n200" />
      )}

      {path && type !== "pdf" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Btn onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>−</Btn>
            <span className="w-14 text-center font-mono text-xs text-n500">{Math.round(zoom * 100)}%</span>
            <Btn onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>+</Btn>
            <Btn onClick={() => setRot((r) => (r + 90) % 360)}>⟳ Rotation</Btn>
          </div>
          <div className="max-h-[70vh] overflow-auto rounded-sm border border-n200 bg-n50">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt="Facture"
                style={{ transform: `scale(${zoom}) rotate(${rot}deg)`, transformOrigin: "top left" }}
                className="max-w-none"
              />
            ) : (
              <span className="flex h-40 items-center justify-center text-xs text-n500">…</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 rounded-md border border-n200 px-2 text-sm text-navy hover:bg-n50"
    >
      {children}
    </button>
  );
}
