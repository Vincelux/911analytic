-- Single-row table mirroring the "Filtres avancés" the owner currently has
-- set in the app. The scraping job (scripts/scrape-and-analyze.mjs) reads it
-- so it only extracts/analyzes listings matching these criteria, instead of
-- everything it finds on a source page — this bounds both the volume of
-- junk listings created and the number of paid AI analysis calls per run.
create table if not exists public.search_criteria (
  id boolean primary key default true,
  generation text[] not null default '{}',
  year_min integer not null default 1964,
  year_max integer not null default 2026,
  price_min integer not null default 0,
  price_max integer not null default 500000,
  km_min integer not null default 0,
  km_max integer not null default 300000,
  power_min integer not null default 0,
  fuel_type text not null default 'Toutes',
  transmission text not null default 'Toutes',
  country text not null default 'Europe Globale',
  seller_type text not null default 'Tous',
  updated_at timestamptz not null default now(),
  constraint search_criteria_singleton check (id)
);

alter table public.search_criteria enable row level security;

create policy "Authenticated users can read search criteria"
  on public.search_criteria for select
  to authenticated
  using (true);

create policy "Authenticated users can insert search criteria"
  on public.search_criteria for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update search criteria"
  on public.search_criteria for update
  to authenticated
  using (true)
  with check (true);
