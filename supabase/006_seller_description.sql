-- Adds seller_description: an excerpt of the seller's own ad text (pasted by
-- the user, or extracted from the page), distinct from the user's personal
-- `notes`. Used by the AI expert-analysis pass to scan for suspicious
-- listing language (accident history, grey import, etc.) — see
-- scripts/scrape-and-analyze.mjs's analyzeListing().

alter table public.listings
  add column if not exists seller_description text;
