-- history_highlights: AI-surfaced positive documented-history points from
-- the seller's own description (service records, ownership count, etc).
-- porsche_approved: whether the car is part of Porsche's official certified
-- pre-owned program — set manually or detected by the AI from listing text.
-- Distinct from the options catalog: not an equipment option, a certification signal.

alter table public.listings
  add column if not exists history_highlights jsonb not null default '[]'::jsonb,
  add column if not exists porsche_approved boolean;
