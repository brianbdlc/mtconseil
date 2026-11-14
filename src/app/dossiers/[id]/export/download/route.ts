import { existsSync } from "node:fs";
import { createClient } from "@/lib/supabase/server";
import { buildingPhotos } from "@/lib/building";
import { buildReport, TEMPLATE_PATH } from "@/lib/docx/report";

export async function GET(
  _req: Request,
  { params }: RouteContext<"/dossiers/[id]/export/download">,
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });

  if (!existsSync(TEMPLATE_PATH)) {
    return new Response(
      "Gabarit assets/report-template.docx manquant (voir Phase 2, étape gabarit).",
      { status: 503 },
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("numero_projet, client_nom, client_adresse, type_service")
    .eq("id", id)
    .single();
  if (!project) return new Response("Dossier introuvable", { status: 404 });

  const { data: cards } = await supabase
    .from("equipment_cards")
    .select("*")
    .eq("project_id", id)
    .eq("statut", "confirme")
    .order("position", { ascending: true });

  // Description du bâtiment (Phase 4) : seulement si confirmée → sinon section vide.
  const { data: buildingRow } = await supabase
    .from("building_description")
    .select("*")
    .eq("project_id", id)
    .eq("statut", "confirme")
    .maybeSingle();

  let building = null;
  if (buildingRow) {
    const photos = [];
    for (const { path, titre } of buildingPhotos(buildingRow)) {
      const { data: blob } = await supabase.storage.from("equipment-photos").download(path);
      if (blob) photos.push({ data: Buffer.from(await blob.arrayBuffer()), titre: titre || null });
    }
    building = { row: buildingRow, photos };
  }

  // Photos (US-15) : téléchargées côté serveur depuis Storage, dans l'ordre, par fiche.
  const reportCards = await Promise.all(
    (cards ?? []).map(async (c) => {
      const { data: rows } = await supabase
        .from("card_photos")
        .select("storage_path, titre")
        .eq("card_id", c.id)
        .order("position", { ascending: true });
      const photos = [];
      for (const r of rows ?? []) {
        const { data: blob } = await supabase.storage
          .from("equipment-photos")
          .download(r.storage_path);
        if (blob)
          photos.push({ data: Buffer.from(await blob.arrayBuffer()), titre: r.titre });
      }
      return { titre: c.titre, intro: c.intro, row: c, photos };
    }),
  );

  const buffer = await buildReport(project, reportCards, building);
  const nom = `${project.numero_projet?.trim() || "rapport"}.docx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nom}"`,
    },
  });
}
