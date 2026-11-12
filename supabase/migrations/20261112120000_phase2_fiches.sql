-- Phase 2 — Fiches d'équipement (equipment_cards), RLS
-- Additif strict. Modèle de champ 3 états porté par `fields jsonb` (R2),
-- statut brouillon/confirmé (R1), `position` = ordre d'apparition → n° section 3.x + ID (R8).

create table public.equipment_cards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  titre text,
  intro text,
  fields jsonb not null default '{}'::jsonb,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'confirme')),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index equipment_cards_project_id_idx on public.equipment_cards (project_id);

alter table public.equipment_cards enable row level security;

-- Calqué sur projects : toute la firme voit/crée/édite.
-- + delete (retirer une fiche ajoutée par erreur ; absent de projects).
create policy "equipment_cards_select_authenticated"
  on public.equipment_cards for select
  to authenticated
  using (true);

create policy "equipment_cards_insert_authenticated"
  on public.equipment_cards for insert
  to authenticated
  with check (true);

create policy "equipment_cards_update_authenticated"
  on public.equipment_cards for update
  to authenticated
  using (true)
  with check (true);

create policy "equipment_cards_delete_authenticated"
  on public.equipment_cards for delete
  to authenticated
  using (true);
