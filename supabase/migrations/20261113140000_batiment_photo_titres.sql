-- Titre optionnel par photo du bâtiment. Additif : tableau aligné sur photo_paths
-- (même index). Les deux tableaux sont toujours écrits ensemble par l'app (pas de dérive).
alter table public.building_description
  add column if not exists photo_titles text[] not null default '{}'::text[];

notify pgrst, 'reload schema';
