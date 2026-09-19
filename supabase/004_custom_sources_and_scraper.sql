-- 911 Analytics — migration 004 : sources personnalisées en base + support du scraper
-- À exécuter une seule fois dans le SQL Editor de Supabase.

-- "Sources personnalisées" déménage du navigateur vers la base : un robot qui
-- tourne côté serveur (GitHub Actions) doit pouvoir lire cette liste, ce que
-- le localStorage du navigateur ne permet pas.
create table if not exists public.custom_sources (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  label text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.custom_sources enable row level security;

-- Liste privée : seul toi (connecté) peux la consulter et la modifier.
create policy "Authenticated users can read custom sources"
  on public.custom_sources for select
  to authenticated
  using (true);

create policy "Authenticated users can insert custom sources"
  on public.custom_sources for insert
  to authenticated
  with check (true);

create policy "Authenticated users can delete custom sources"
  on public.custom_sources for delete
  to authenticated
  using (true);

-- Empêche le job planifié de créer des doublons quand il repasse sur une
-- annonce déjà connue (upsert par URL).
alter table public.listings add constraint listings_listing_url_key unique (listing_url);

-- Le job de scraping a besoin de savoir quand une annonce a été vue/vérifiée
-- pour la suite (ex: détecter qu'elle a disparu du site source).
alter table public.listings add column if not exists last_seen_at timestamptz not null default now();
