-- Phase 1 — Socle : profiles + projects (dossiers), RLS
-- Additif strict (schéma public vide avant cette migration).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'ingenieur' check (role in ('ingenieur', 'admin')),
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  numero_projet text,
  client_nom text,
  client_adresse text,
  type_service text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;

-- profiles : lecture pour tout utilisateur connecté (affichage « créé par »).
-- Pas d'insert/update côté client : seul le service_role (hors RLS) écrit.
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- projects : toute la firme voit/crée/édite tous les dossiers. Pas de delete.
create policy "projects_select_authenticated"
  on public.projects for select
  to authenticated
  using (true);

create policy "projects_insert_authenticated"
  on public.projects for insert
  to authenticated
  with check (true);

create policy "projects_update_authenticated"
  on public.projects for update
  to authenticated
  using (true)
  with check (true);
