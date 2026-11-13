-- Phase 3 — Fiche d'équipement complète. Additif strict (pas de DROP/RENAME).
-- Champs fixes (tableau 1 + 2) → vraies colonnes ; listes « + Autre » / constats → `fields` jsonb.
-- Photos → table enfant card_photos + bucket Storage. Modèle 3 états R2 porté par
-- <f> (valeur) + <f>_etat ; champs chiffrés estimables → <f>_estime (R4).

-- 1. Colonnes tableau 1 (chaque champ : valeur text + état). --------------------
alter table public.equipment_cards
  add column if not exists description text,
  add column if not exists description_etat text not null default 'valeur'
    check (description_etat in ('valeur','nd','so')),
  add column if not exists marque_modele text,
  add column if not exists marque_modele_etat text not null default 'valeur'
    check (marque_modele_etat in ('valeur','nd','so')),
  add column if not exists debit_pcm text,
  add column if not exists debit_pcm_etat text not null default 'valeur'
    check (debit_pcm_etat in ('valeur','nd','so')),
  add column if not exists debit_pcm_estime boolean not null default false,
  add column if not exists pct_air_frais text,
  add column if not exists pct_air_frais_etat text not null default 'valeur'
    check (pct_air_frais_etat in ('valeur','nd','so')),
  add column if not exists ventilateur text,
  add column if not exists ventilateur_etat text not null default 'valeur'
    check (ventilateur_etat in ('valeur','nd','so')),
  add column if not exists refroidissement text,
  add column if not exists refroidissement_etat text not null default 'valeur'
    check (refroidissement_etat in ('valeur','nd','so')),
  add column if not exists chauffage text,
  add column if not exists chauffage_etat text not null default 'valeur'
    check (chauffage_etat in ('valeur','nd','so')),
  add column if not exists humidificateur text,
  add column if not exists humidificateur_etat text not null default 'valeur'
    check (humidificateur_etat in ('valeur','nd','so')),
  add column if not exists nb_unites integer not null default 1,
  add column if not exists note_estime text;

-- 2. Colonnes tableau 2 (refroidissement / chauffage). --------------------------
alter table public.equipment_cards
  add column if not exists t2_refroid_type text,
  add column if not exists t2_refroid_type_etat text not null default 'valeur'
    check (t2_refroid_type_etat in ('valeur','nd','so')),
  add column if not exists t2_refroid_kw text,
  add column if not exists t2_refroid_kw_etat text not null default 'valeur'
    check (t2_refroid_kw_etat in ('valeur','nd','so')),
  add column if not exists t2_refroid_kw_manuel boolean not null default false,
  add column if not exists t2_refroid_tonnes text,
  add column if not exists t2_refroid_eff text,
  add column if not exists t2_refroid_eff_etat text not null default 'valeur'
    check (t2_refroid_eff_etat in ('valeur','nd','so')),
  add column if not exists t2_refroid_eff_estime boolean not null default false,
  add column if not exists t2_chauff_type text,
  add column if not exists t2_chauff_type_etat text not null default 'valeur'
    check (t2_chauff_type_etat in ('valeur','nd','so')),
  add column if not exists t2_chauff_kw text,
  add column if not exists t2_chauff_kw_etat text not null default 'valeur'
    check (t2_chauff_kw_etat in ('valeur','nd','so')),
  add column if not exists t2_chauff_kw_manuel boolean not null default false,
  add column if not exists t2_chauff_tonnes text,
  add column if not exists t2_chauff_eff text,
  add column if not exists t2_chauff_eff_etat text not null default 'valeur'
    check (t2_chauff_eff_etat in ('valeur','nd','so')),
  add column if not exists t2_chauff_eff_estime boolean not null default false;

-- 3. Backfill dev depuis l'ancien `fields` jsonb (best effort, données de test). --
update public.equipment_cards
  set description = fields->'description'->>'valeur',
      description_etat = coalesce(fields->'description'->>'etat', 'valeur')
  where description is null and fields ? 'description';
update public.equipment_cards
  set marque_modele = fields->'marque_modele'->>'valeur',
      marque_modele_etat = coalesce(fields->'marque_modele'->>'etat', 'valeur')
  where marque_modele is null and fields ? 'marque_modele';
-- Les listes repartent à vide ; l'ancien contenu jsonb est ignoré (Phase 2 n'en avait pas).
update public.equipment_cards
  set fields = jsonb_build_object('autres', '[]'::jsonb, 'constats', '[]'::jsonb)
  where not (fields ? 'autres');

-- 4. Photos (US-15). ------------------------------------------------------------
create table if not exists public.card_photos (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.equipment_cards (id) on delete cascade,
  storage_path text not null,
  titre text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists card_photos_card_id_idx on public.card_photos (card_id);
alter table public.card_photos enable row level security;

create policy "card_photos_select_authenticated"
  on public.card_photos for select to authenticated using (true);
create policy "card_photos_insert_authenticated"
  on public.card_photos for insert to authenticated with check (true);
create policy "card_photos_update_authenticated"
  on public.card_photos for update to authenticated using (true) with check (true);
create policy "card_photos_delete_authenticated"
  on public.card_photos for delete to authenticated using (true);

-- 5. Bucket Storage privé + RLS (pattern : toute la firme, authentifiée). --------
insert into storage.buckets (id, name, public)
  values ('equipment-photos', 'equipment-photos', false)
  on conflict (id) do nothing;

create policy "equipment_photos_select_authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'equipment-photos');
create policy "equipment_photos_insert_authenticated"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'equipment-photos');
create policy "equipment_photos_update_authenticated"
  on storage.objects for update to authenticated
  using (bucket_id = 'equipment-photos') with check (bucket_id = 'equipment-photos');
create policy "equipment_photos_delete_authenticated"
  on storage.objects for delete to authenticated
  using (bucket_id = 'equipment-photos');
