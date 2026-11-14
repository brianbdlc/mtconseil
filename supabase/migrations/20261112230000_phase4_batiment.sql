-- Phase 4 — Description du bâtiment. Additif strict (pas de DROP/RENAME).
-- Une ligne par dossier (project_id unique). Champs fixes 3 états R2 : <f> + <f>_etat.
-- Listes (zones, « + Autre ») + écart → `fields` jsonb. Photo unique → colonne photo_path
-- (bucket equipment-photos réutilisé, préfixe building/<projectId>/...).

create table if not exists public.building_description (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  statut text not null default 'brouillon' check (statut in ('brouillon','confirme')),
  superficie_brute_totale text,
  superficie_brute_totale_etat text not null default 'valeur'
    check (superficie_brute_totale_etat in ('valeur','nd','so')),
  annee_construction text,
  annee_construction_etat text not null default 'valeur'
    check (annee_construction_etat in ('valeur','nd','so')),
  nombre_etages text,
  nombre_etages_etat text not null default 'valeur'
    check (nombre_etages_etat in ('valeur','nd','so')),
  type_construction text,
  type_construction_etat text not null default 'valeur'
    check (type_construction_etat in ('valeur','nd','so')),
  usage_principal text,
  usage_principal_etat text not null default 'valeur'
    check (usage_principal_etat in ('valeur','nd','so')),
  elec text,
  elec_etat text not null default 'valeur'
    check (elec_etat in ('valeur','nd','so')),
  gaz text,
  gaz_etat text not null default 'valeur'
    check (gaz_etat in ('valeur','nd','so')),
  photo_path text,
  fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.building_description enable row level security;

create policy "building_description_select_authenticated"
  on public.building_description for select to authenticated using (true);
create policy "building_description_insert_authenticated"
  on public.building_description for insert to authenticated with check (true);
create policy "building_description_update_authenticated"
  on public.building_description for update to authenticated using (true) with check (true);
create policy "building_description_delete_authenticated"
  on public.building_description for delete to authenticated using (true);

-- Recharge le cache de schéma PostgREST (sinon l'API REST ignore la nouvelle table
-- jusqu'au prochain redémarrage ; un `db push` le fait via trigger, pas une appli MCP).
notify pgrst, 'reload schema';
