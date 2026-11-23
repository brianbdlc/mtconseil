-- Titre éditable du tableau d'aperçu normalisé (par dossier). Null = titre auto par défaut.
alter table public.energy_settings
  add column if not exists titre_apercu text;
