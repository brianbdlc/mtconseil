"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/database.types";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createDossier(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      numero_projet: String(formData.get("numero_projet") ?? "").trim() || null,
      client_nom: String(formData.get("client_nom") ?? "").trim() || null,
      client_adresse:
        String(formData.get("client_adresse") ?? "").trim() || null,
      type_service: String(formData.get("type_service") ?? "").trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw error;
  redirect(`/dossiers/${data.id}`);
}

const FIELDS = [
  "numero_projet",
  "client_nom",
  "client_adresse",
  "type_service",
] as const;

export async function updateDossier(
  id: string,
  values: Record<(typeof FIELDS)[number], string>,
) {
  const supabase = await createClient();
  const patch: TablesUpdate<"projects"> = { updated_at: new Date().toISOString() };
  for (const f of FIELDS) patch[f] = values[f]?.trim() || null;

  const { error } = await supabase.from("projects").update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath("/dossiers");
}
