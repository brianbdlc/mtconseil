-- Photos multiples du bâtiment (max 4, côté app). Additif : nouvelle colonne tableau.
-- Remplace l'usage de photo_path (unique) ; photo_path conservée (règle additive).
alter table public.building_description
  add column if not exists photo_paths text[] not null default '{}'::text[];

notify pgrst, 'reload schema';
