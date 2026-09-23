-- warranty: warranty the seller offers, as stated in the listing (e.g.
-- "12 mois", "Garantie constructeur 24 mois"). Free text since durations
-- and terms vary too much across sellers/countries to enumerate. Fed into
-- the AI analysis (vigilance/negotiation/value) as a real buyer-confidence
-- factor, not just a display field.

alter table public.listings
  add column if not exists warranty text;
