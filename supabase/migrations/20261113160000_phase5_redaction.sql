-- Phase 5 — Moteur de rédaction IA. Additif strict (pas de DROP/RENAME).
-- Types de section (admin, modifiables sans redéploiement) + historique d'instructions
-- (R10/US-30) + sections rédigées par dossier (notes US-22, jet IA, texte confirmé).
-- Emplacement export = {zone, ordre} ; zones mappées sur les placeholders existants du
-- gabarit : apres_description / apres_fiches / bilan (bilan stocké mais non exporté — Phase 8).

create table if not exists public.section_types (
  id uuid primary key default gen_random_uuid(),
  cle text not null unique,
  titre text not null,
  zone text not null check (zone in ('apres_description','apres_fiches','bilan')),
  ordre int not null default 0,
  instructions text not null default '',
  notes_actives boolean not null default true,
  requiert_batiment boolean not null default false,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only (US-30/R10). Rollback = réécrire instructions/titre sur section_types
-- (ce qui insère à son tour une nouvelle version).
create table if not exists public.section_type_versions (
  id uuid primary key default gen_random_uuid(),
  section_type_id uuid not null references public.section_types (id) on delete cascade,
  titre text,
  instructions text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists section_type_versions_type_idx
  on public.section_type_versions (section_type_id, created_at desc);

create table if not exists public.report_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  section_type_id uuid not null references public.section_types (id) on delete cascade,
  notes text not null default '',
  texte_genere text,                              -- dernier jet IA (fondation Phase 6)
  texte text not null default '',                 -- éditable/confirmé, ce qui s'exporte
  statut text not null default 'brouillon' check (statut in ('brouillon','confirme')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, section_type_id)
);

create index if not exists report_sections_project_idx
  on public.report_sections (project_id);

alter table public.section_types enable row level security;
alter table public.section_type_versions enable row level security;
alter table public.report_sections enable row level security;

create policy "section_types_select_authenticated"
  on public.section_types for select to authenticated using (true);
create policy "section_types_insert_authenticated"
  on public.section_types for insert to authenticated with check (true);
create policy "section_types_update_authenticated"
  on public.section_types for update to authenticated using (true) with check (true);
create policy "section_types_delete_authenticated"
  on public.section_types for delete to authenticated using (true);

create policy "section_type_versions_select_authenticated"
  on public.section_type_versions for select to authenticated using (true);
create policy "section_type_versions_insert_authenticated"
  on public.section_type_versions for insert to authenticated with check (true);
create policy "section_type_versions_update_authenticated"
  on public.section_type_versions for update to authenticated using (true) with check (true);
create policy "section_type_versions_delete_authenticated"
  on public.section_type_versions for delete to authenticated using (true);

create policy "report_sections_select_authenticated"
  on public.report_sections for select to authenticated using (true);
create policy "report_sections_insert_authenticated"
  on public.report_sections for insert to authenticated with check (true);
create policy "report_sections_update_authenticated"
  on public.report_sections for update to authenticated using (true) with check (true);
create policy "report_sections_delete_authenticated"
  on public.report_sections for delete to authenticated using (true);

-- Recharge le cache de schéma PostgREST (sinon l'API REST ignore les nouvelles tables
-- jusqu'au prochain redémarrage ; un `db push` le fait via trigger, pas une appli MCP).
notify pgrst, 'reload schema';
