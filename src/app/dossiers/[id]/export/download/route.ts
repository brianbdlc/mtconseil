import { existsSync } from "node:fs";
import { createClient } from "@/lib/supabase/server";
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
    .select("titre, intro, fields")
    .eq("project_id", id)
    .eq("statut", "confirme")
    .order("position", { ascending: true });

  const buffer = await buildReport(project, cards ?? []);
  const nom = `${project.numero_projet?.trim() || "rapport"}.docx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nom}"`,
    },
  });
}
