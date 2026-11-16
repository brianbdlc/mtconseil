-- Phase 6 — Dépendances, régénération & versions. Additif strict (pas de DROP/RENAME).
-- Péremption d'une section confirmée (US-27/28) : on stocke l'empreinte des sources au
-- moment de la confirmation ; le statut « à régénérer » est calculé à l'affichage, jamais
-- stocké. Historique de texte (US-49) : snapshot à chaque confirmation, rollback en brouillon.

alter table public.report_sections add column if not exists source_hash_confirme text;

create table if not exists public.report_section_versions (
  id uuid primary key default gen_random_uuid(),
  report_section_id uuid not null references public.report_sections (id) on delete cascade,
  titre text,
  texte text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists report_section_versions_section_idx
  on public.report_section_versions (report_section_id, created_at desc);

alter table public.report_section_versions enable row level security;

-- Policies calquées sur report_sections (tout utilisateur authentifié de la firme).
create policy "report_section_versions_select_authenticated"
  on public.report_section_versions for select to authenticated using (true);
create policy "report_section_versions_insert_authenticated"
  on public.report_section_versions for insert to authenticated with check (true);
create policy "report_section_versions_update_authenticated"
  on public.report_section_versions for update to authenticated using (true) with check (true);
create policy "report_section_versions_delete_authenticated"
  on public.report_section_versions for delete to authenticated using (true);
