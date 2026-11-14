-- Bootstrap du premier admin (Luis).
-- 1. Créer le compte une fois via le dashboard Supabase (Authentication > Add user).
-- 2. Exécuter ce seed : il crée la ligne `profiles` manquante et la passe en 'admin'.
-- Idempotent (rejouable). Remplacer l'email ci-dessous par celui de Luis.
insert into public.profiles (id, email, role)
select id, email, 'admin'
from auth.users
where email = 'ldelacruz@mtconseil.ca'
on conflict (id) do update set role = 'admin';

-- Phase 5 — types de section de départ (Luis affine les instructions via /admin/sections).
-- Idempotent : `on conflict (cle) do nothing` ne touche pas les types déjà ajustés.
insert into public.section_types (cle, titre, zone, ordre, instructions, requiert_batiment)
values
  ('humidification', 'Humidification', 'apres_fiches', 10,
   'Rédige la section Humidification dans le ton MT Conseil à partir des données confirmées et des notes de visite. Décris les systèmes d''humidification présents, leur état et les constats.',
   false),
  ('controles', 'Contrôles', 'apres_fiches', 20,
   'Rédige la section Contrôles (régulation, automatisation du bâtiment) dans le ton MT Conseil à partir des données confirmées et des notes. Décris les systèmes de contrôle et leurs constats.',
   false),
  ('electricite', 'Électricité', 'apres_fiches', 30,
   'Rédige la section Électricité (entrée électrique, distribution, éclairage) dans le ton MT Conseil à partir des données confirmées et des notes, avec sous-titres si pertinent.',
   false),
  ('sommaire_site', 'Sommaire du site', 'apres_description', 10,
   'Présente le site et sa superficie brute totale, puis chaque zone avec sa superficie, sans jamais deviner l''usage d''une zone. Reste strictement fidèle à la description du bâtiment confirmée.',
   true),
  ('analyse_bilan', 'Analyse du bilan', 'bilan', 10,
   'Rédige l''analyse du bilan énergétique (section 4.3) à partir des chiffres confirmés et des notes. N''invente aucun chiffre ; ne calcule jamais.',
   false)
on conflict (cle) do nothing;

-- Version initiale pour chaque type qui n'en a pas encore (R10).
insert into public.section_type_versions (section_type_id, titre, instructions)
select st.id, st.titre, st.instructions
from public.section_types st
where not exists (
  select 1 from public.section_type_versions v where v.section_type_id = st.id
);
