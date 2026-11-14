"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setBuildingPhotos } from "./actions";

const BUCKET = "equipment-photos";
const MAX = 4;

type Photo = { path: string; titre: string };

// Photos du bâtiment (Figure 1+, US-19), 1 à 4, 2 par rangée, titre optionnel. Même flux
// que PhotoGrid (conversion HEIC, upload client, URL signée) ; chemins + titres stockés en
// tableaux alignés (photo_paths / photo_titles). Pas de réordonnancement ici.
export default function BuildingPhoto({
  projectId,
  disabled,
  initial,
}: {
  projectId: string;
  disabled: boolean;
  initial: Photo[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [supabase] = useState(createClient);

  // URLs signées (bucket privé) pour l'aperçu.
  useEffect(() => {
    let alive = true;
    (async () => {
      const missing = photos.filter((p) => !urls[p.path]);
      if (!missing.length) return;
      const next: Record<string, string> = {};
      for (const p of missing) {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p.path, 3600);
        if (data?.signedUrl) next[p.path] = data.signedUrl;
      }
      if (alive && Object.keys(next).length) setUrls((u) => ({ ...u, ...next }));
    })();
    return () => {
      alive = false;
    };
  }, [photos, urls, supabase]);

  async function persist(next: Photo[], onFail?: () => void) {
    const r = await setBuildingPhotos(projectId, next);
    if (!r.ok) {
      setErr(r.message);
      onFail?.();
    }
    return r.ok;
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setErr("");
    setBusy(true);
    try {
      const added: Photo[] = [];
      for (const file of Array.from(files)) {
        if (photos.length + added.length >= MAX) {
          setErr(`Maximum ${MAX} photos.`);
          break;
        }
        const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
        let blob: Blob = file;
        if (isHeic) {
          const heic2any = (await import("heic2any")).default;
          blob = (await heic2any({ blob: file, toType: "image/jpeg" })) as Blob;
        }
        const ext = isHeic ? "jpg" : file.name.split(".").pop() || "jpg";
        const newPath = `building/${projectId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(newPath, blob, { contentType: blob.type || "image/jpeg" });
        if (error) throw error;
        added.push({ path: newPath, titre: "" });
      }
      if (added.length) {
        const next = [...photos, ...added];
        if (!(await persist(next))) {
          await supabase.storage.from(BUCKET).remove(added.map((p) => p.path)); // annule les orphelins
          return;
        }
        setPhotos(next);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Échec du téléversement.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(path: string) {
    const prev = photos;
    const next = photos.filter((x) => x.path !== path);
    setPhotos(next);
    if (!(await persist(next, () => setPhotos(prev)))) return;
    await supabase.storage.from(BUCKET).remove([path]);
  }

  // Titre édité localement ; persisté au blur (réécrit les deux tableaux).
  function setTitre(path: string, titre: string) {
    setPhotos((ps) => ps.map((x) => (x.path === path ? { ...x, titre } : x)));
  }
  function saveTitre() {
    setErr("");
    persist(photos);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-navy">
          Photos du bâtiment ({photos.length}/{MAX})
        </span>
        {!disabled && (
          <label
            className={`h-9 cursor-pointer rounded-md border border-navy px-3 text-sm font-medium text-navy leading-9 hover:bg-n50 ${
              photos.length >= MAX || busy ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {busy ? "Téléversement…" : "+ Ajouter"}
            <input
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              className="hidden"
              onChange={(e) => {
                onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {err && <p className="text-xs text-error">{err}</p>}

      {photos.length ? (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((p) => (
            <div key={p.path} className="flex flex-col gap-1.5 rounded-md border border-n200 bg-n0 p-2">
              <div className="aspect-video overflow-hidden rounded-sm bg-n50">
                {urls[p.path] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[p.path]} alt={p.titre} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs text-n500">…</span>
                )}
              </div>
              <input
                value={p.titre}
                disabled={disabled}
                placeholder="Titre (optionnel)"
                onChange={(e) => setTitre(p.path, e.target.value)}
                onBlur={saveTitre}
                className="h-9 rounded-md border border-n200 bg-n0 px-2 text-sm text-navy outline-none focus:border-navy disabled:bg-n50"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(p.path)}
                  className="self-start text-xs text-error underline underline-offset-2"
                >
                  Supprimer
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        disabled && <p className="text-xs text-n500">Aucune photo.</p>
      )}
    </div>
  );
}
