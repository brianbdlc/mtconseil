-- Phase 5 — sections « Autre » ad hoc par dossier. Additif (pas de DROP/RENAME).
-- Une section « Autre » = ligne report_sections SANS section_type_id (type admin) mais
-- AVEC un titre libre. section_type_id devient nullable ; `unique(project_id, section_type_id)`
-- reste valide (Postgres autorise plusieurs NULL → plusieurs « Autre » par dossier).

alter table public.report_sections alter column section_type_id drop not null;
alter table public.report_sections add column if not exists titre text;

notify pgrst, 'reload schema';
