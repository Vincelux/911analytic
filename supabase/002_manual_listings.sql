-- 911 Analytics — migration 002 : ajout manuel d'annonces
-- À exécuter une seule fois dans le SQL Editor de Supabase, après avoir créé
-- ton utilisateur (Authentication > Users > Add user).

-- Champs que seule une IA saurait calculer (conformité, note vendeur, etc.) :
-- rendus optionnels puisqu'un humain qui ajoute une annonce trouvée ailleurs
-- n'a pas à les inventer.
alter table public.listings alter column image drop not null;
alter table public.listings alter column phase drop not null;
alter table public.listings alter column conformity drop not null;
alter table public.listings alter column seller_rating drop not null;
alter table public.listings alter column seller_phone drop not null;
alter table public.listings alter column seller_email drop not null;
alter table public.listings alter column published_days_ago set default 0;

-- Notes libres, visibles uniquement par toi, pour te souvenir du contexte
-- d'une annonce ajoutée manuellement.
alter table public.listings add column if not exists notes text;

-- Seuls les utilisateurs connectés (toi) peuvent ajouter des annonces.
-- La lecture reste publique (policy déjà en place dans setup.sql).
create policy "Authenticated users can insert listings"
  on public.listings for insert
  to authenticated
  with check (true);
