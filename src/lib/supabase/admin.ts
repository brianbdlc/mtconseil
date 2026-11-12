import { createClient } from "@supabase/supabase-js";

// Client service_role : contourne la RLS. SERVEUR UNIQUEMENT (server actions).
// Importé seulement depuis des fichiers "use server" ; SUPABASE_SECRET_KEY n'a
// pas de préfixe NEXT_PUBLIC_, donc jamais inlinée dans un bundle client.
// Sert à créer des comptes (auth.admin.createUser).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
