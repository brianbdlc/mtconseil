-- Phase 7 — Factures : saisie par facture + normalisation mensuelle. Additif strict.
-- energy_settings : 1 ligne/dossier (PCS gaz + année de référence, dossier-level).
-- factures : 1 ligne/facture (période, conso, montants, puissance élec) ; 1 fichier/facture
-- → colonnes fichier_path/fichier_type (pas de table enfant ; 1 seul fichier par facture).
-- Bucket Storage privé facture-fichiers (image ou PDF). Pas de base_dj ici (Phase 8).

-- 1. Réglages énergie du dossier. ----------------------------------------------
create table if not exists public.energy_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  pouvoir_calorifique_mj_m3 numeric not null default 37.89,
  annee_reference integer,
  updated_at timestamptz not null default now()
);

alter table public.energy_settings enable row level security;

create policy "energy_settings_select_authenticated"
  on public.energy_settings for select to authenticated using (true);
create policy "energy_settings_insert_authenticated"
  on public.energy_settings for insert to authenticated with check (true);
create policy "energy_settings_update_authenticated"
  on public.energy_settings for update to authenticated using (true) with check (true);
create policy "energy_settings_delete_authenticated"
  on public.energy_settings for delete to authenticated using (true);

-- 2. Factures (1 ligne par facture/période). ----------------------------------
create table if not exists public.factures (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  statut text not null default 'brouillon' check (statut in ('brouillon','confirme')),
  position int not null default 0,
  source text not null default 'gaz' check (source in ('gaz','elec')),
  numero_compteur text,
  date_debut date,
  date_fin date,
  consommation numeric,
  montant_ttc numeric,
  montant_avtx numeric,
  montant_avtx_manuel boolean not null default false,
  puissance_appelee numeric,
  fichier_path text,
  fichier_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists factures_project_id_idx on public.factures (project_id);

alter table public.factures enable row level security;

create policy "factures_select_authenticated"
  on public.factures for select to authenticated using (true);
create policy "factures_insert_authenticated"
  on public.factures for insert to authenticated with check (true);
create policy "factures_update_authenticated"
  on public.factures for update to authenticated using (true) with check (true);
create policy "factures_delete_authenticated"
  on public.factures for delete to authenticated using (true);

-- 3. Bucket Storage privé + RLS (toute la firme, authentifiée). ----------------
insert into storage.buckets (id, name, public)
  values ('facture-fichiers', 'facture-fichiers', false)
  on conflict (id) do nothing;

create policy "facture_fichiers_select_authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'facture-fichiers');
create policy "facture_fichiers_insert_authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'facture-fichiers');
create policy "facture_fichiers_update_authenticated"
  on storage.objects for update to authenticated
  using (bucket_id = 'facture-fichiers') with check (bucket_id = 'facture-fichiers');
create policy "facture_fichiers_delete_authenticated"
  on storage.objects for delete to authenticated
  using (bucket_id = 'facture-fichiers');

-- Recharge le cache de schéma PostgREST (sinon l'API REST ignore les nouvelles tables).
notify pgrst, 'reload schema';
