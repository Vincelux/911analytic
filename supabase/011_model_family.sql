-- model_family: which Porsche model line a listing is for. The app launched
-- 911-only, so every existing row defaults to '911' — nothing changes for
-- them. New Macan support (extraction, AI analysis, filters) reads this
-- column to pick the right generation list and domain knowledge.

alter table public.listings
  add column if not exists model_family text not null default '911'
  check (model_family in ('911', 'Macan'));
