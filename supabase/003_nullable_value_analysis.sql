-- 911 Analytics — migration 003 : value_analysis réellement absent tant que
-- rien ne l'a évalué (au lieu d'un objet vide '{}' qui faisait planter l'app).
-- À exécuter une seule fois dans le SQL Editor de Supabase.

alter table public.listings alter column value_analysis drop not null;
alter table public.listings alter column value_analysis drop default;
