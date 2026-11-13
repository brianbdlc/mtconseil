"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import {
  addPhoto,
  deletePhoto,
  reorderPhotos,
  updatePhotoTitle,
} from "../actions";

const BUCKET = "equipment-photos";
const MAX = 6;

export type Photo = { id: string; storage_path: string; titre: string | null };

// US-15 : 1-6 photos, 2 par rangée, titre optionnel, glisser-déposer (tactile terrain),
// suppression, formats téléphone dont HEIC (converti en JPEG côté client avant upload).
export default function PhotoGrid({
  cardId,
  projectId,
  disabled,
  initial,
}: {
  cardId: string;
  projectId: string;
  disabled: boolean;
  initial: Photo[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [supabase] = useState(createClient);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));

  // URLs signées (bucket privé) pour l'aperçu.
  useEffect(() => {
    let alive = true;
    (async () => {
      const paths = photos.filter((p) => !urls[p.id]).map((p) => p);
      if (!paths.length) return;
      const next: Record<string, string> = {};
      for (const p of paths) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(p.storage_path, 3600);
        if (data?.signedUrl) next[p.id] = data.signedUrl;
      }
      if (alive && Object.keys(next).length)
        setUrls((u) => ({ ...u, ...next }));
    })();
    return () => {
      alive = false;
    };
  }, [photos, urls, supabase]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setErr("");
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (photos.length >= MAX) {
          setErr(`Maximum ${MAX} photos par fiche.`);
          break;
        }
        const isHeic =
          /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
        let blob: Blob = file;
        if (isHeic) {
          const heic2any = (await import("heic2any")).default;
          blob = (await heic2any({ blob: file, toType: "image/jpeg" })) as Blob;
        }
        const ext = isHeic ? "jpg" : file.name.split(".").pop() || "jpg";
        const path = `${cardId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: blob.type || "image/jpeg" });
        if (error) throw error;
        await addPhoto(cardId, projectId, path);
        // ponytail: l'insert renvoie via revalidate ; on relit l'id en re-SELECT léger.
        const { data } = await supabase
          .from("card_photos")
          .select("id, storage_path, titre")
          .eq("storage_path", path)
          .single();
        if (data) setPhotos((ps) => [...ps, data]);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Échec du téléversement.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Photo) {
    setPhotos((ps) => ps.filter((x) => x.id !== p.id));
    await deletePhoto(p.id, projectId, p.storage_path);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = photos.findIndex((p) => p.id === active.id);
    const to = photos.findIndex((p) => p.id === over.id);
    const next = arrayMove(photos, from, to);
    setPhotos(next);
    reorderPhotos(
      projectId,
      next.map((p) => p.id),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-navy">
          Photos ({photos.length}/{MAX})
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

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((p) => (
              <PhotoCell
                key={p.id}
                photo={p}
                url={urls[p.id]}
                disabled={disabled}
                onDelete={() => remove(p)}
                onTitle={(t) => {
                  setPhotos((ps) =>
                    ps.map((x) => (x.id === p.id ? { ...x, titre: t } : x)),
                  );
                  updatePhotoTitle(p.id, projectId, t);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {!photos.length && (
        <p className="text-xs text-n500">Aucune photo. 1 à 6 par fiche.</p>
      )}
    </div>
  );
}

function PhotoCell({
  photo,
  url,
  disabled,
  onDelete,
  onTitle,
}: {
  photo: Photo;
  url?: string;
  disabled: boolean;
  onDelete: () => void;
  onTitle: (t: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col gap-1.5 rounded-md border border-n200 bg-n0 p-2 ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <div className="relative aspect-video overflow-hidden rounded-sm bg-n50">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={photo.titre ?? ""} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-n500">
            …
          </span>
        )}
        {!disabled && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Déplacer la photo"
            className="absolute top-1 left-1 flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-sm bg-navy/80 text-n0"
          >
            ⠿
          </button>
        )}
      </div>
      <input
        value={photo.titre ?? ""}
        disabled={disabled}
        placeholder="Titre (optionnel)"
        onChange={(e) => onTitle(e.target.value)}
        className="h-9 rounded-md border border-n200 bg-n0 px-2 text-sm text-navy outline-none focus:border-navy disabled:bg-n50"
      />
      {!disabled && (
        <button
          type="button"
          onClick={onDelete}
          className="self-start text-xs text-error underline underline-offset-2"
        >
          Supprimer
        </button>
      )}
    </div>
  );
}
