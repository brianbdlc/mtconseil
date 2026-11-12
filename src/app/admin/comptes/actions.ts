"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role === "admin";
}

export async function createCompte(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  if (!(await requireAdmin())) return "Accès refusé.";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "ingenieur");

  if (!email || password.length < 6) {
    return "Courriel requis et mot de passe d'au moins 6 caractères.";
  }
  if (role !== "ingenieur" && role !== "admin") {
    return "Rôle invalide.";
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) return error.message;

  const { error: pErr } = await admin
    .from("profiles")
    .insert({ id: data.user.id, email, role });
  if (pErr) {
    // Compte auth créé mais profil non : nettoyer pour garder l'état cohérent.
    await admin.auth.admin.deleteUser(data.user.id);
    return pErr.message;
  }

  revalidatePath("/admin/comptes");
  return `Compte créé : ${email}`;
}
