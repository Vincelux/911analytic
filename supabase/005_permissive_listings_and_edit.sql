-- 911 Analytics — migration 005 : formulaire permissif + édition ultérieure
-- À exécuter une seule fois dans le SQL Editor de Supabase.

-- Plus aucun champ n'est obligatoire pour enregistrer une annonce : tu peux
-- sauvegarder avec seulement une URL ou un nom de modèle, et compléter le
-- reste plus tard.
alter table public.listings alter column model drop not null;
alter table public.listings alter column generation drop not null;
alter table public.listings alter column price drop not null;
alter table public.listings alter column mileage drop not null;
alter table public.listings alter column year drop not null;
alter table public.listings alter column power drop not null;
alter table public.listings alter column fuel_type drop not null;
alter table public.listings alter column transmission drop not null;
alter table public.listings alter column country drop not null;
alter table public.listings alter column country_flag drop not null;
alter table public.listings alter column city drop not null;
alter table public.listings alter column seller drop not null;
alter table public.listings alter column seller_type drop not null;
alter table public.listings alter column listing_url drop not null;
alter table public.listings alter column listing_source drop not null;

-- Autorise à revenir compléter/corriger une annonce déjà enregistrée.
create policy "Authenticated users can update listings"
  on public.listings for update
  to authenticated
  using (true)
  with check (true);
