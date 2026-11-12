-- Bootstrap du premier admin (Luis).
-- 1. Créer le compte une fois via le dashboard Supabase (Authentication > Add user).
-- 2. Exécuter ce seed : il crée la ligne `profiles` manquante et la passe en 'admin'.
-- Idempotent (rejouable). Remplacer l'email ci-dessous par celui de Luis.
insert into public.profiles (id, email, role)
select id, email, 'admin'
from auth.users
where email = 'ldelacruz@mtconseil.ca'
on conflict (id) do update set role = 'admin';
