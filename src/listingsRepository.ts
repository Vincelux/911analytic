import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { generateId } from './lib/ids';
import { listings as fallbackListings, type CarListing } from './data';

interface ListingRow {
  id: string;
  model: string | null;
  generation: string | null;
  phase: string | null;
  image: string | null;
  price: number | null;
  mileage: number | null;
  year: number | null;
  power: number | null;
  fuel_type: string | null;
  transmission: string | null;
  country: string | null;
  country_flag: string | null;
  city: string | null;
  seller: string | null;
  seller_type: CarListing['sellerType'];
  seller_rating: number | null;
  seller_phone: string | null;
  seller_email: string | null;
  listing_url: string | null;
  listing_source: string | null;
  conformity: number | null;
  published_days_ago: number;
  options: CarListing['options'];
  vigilance_points: CarListing['vigilancePoints'];
  negotiation_arguments: CarListing['negotiationArguments'];
  price_history: CarListing['priceHistory'];
  value_analysis: CarListing['valueAnalysis'];
  notes: string | null;
}

function fromRow(row: ListingRow): CarListing {
  return {
    id: row.id,
    model: row.model,
    generation: row.generation,
    phase: row.phase,
    image: row.image,
    price: row.price,
    mileage: row.mileage,
    year: row.year,
    power: row.power,
    fuelType: row.fuel_type,
    transmission: row.transmission,
    country: row.country,
    countryFlag: row.country_flag,
    city: row.city,
    seller: row.seller,
    sellerType: row.seller_type,
    sellerRating: row.seller_rating,
    sellerPhone: row.seller_phone,
    sellerEmail: row.seller_email,
    listingUrl: row.listing_url,
    listingSource: row.listing_source,
    conformity: row.conformity,
    publishedDaysAgo: row.published_days_ago,
    options: row.options,
    vigilancePoints: row.vigilance_points,
    negotiationArguments: row.negotiation_arguments,
    priceHistory: row.price_history,
    valueAnalysis: row.value_analysis,
    notes: row.notes,
  };
}

/**
 * Reads listings from Supabase once VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * are set (see supabase/setup.sql). Falls back to the local demo data so the
 * app keeps working before the database is configured.
 */
export async function fetchListings(): Promise<CarListing[]> {
  if (!supabase || !isSupabaseConfigured) {
    console.warn(
      '[911analytics] Supabase non configuré (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants dans .env.local) — affichage des données de démonstration locales.'
    );
    return fallbackListings;
  }

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .order('published_days_ago', { ascending: true });

  if (error) throw error;
  return (data as ListingRow[]).map(fromRow);
}

/**
 * Every field is optional: a listing can be saved with only a few fields
 * known (e.g. just a pasted URL) and completed later via updateListing.
 */
export interface ListingInput {
  model?: string | null;
  generation?: string | null;
  phase?: string | null;
  image?: string | null;
  price?: number | null;
  mileage?: number | null;
  year?: number | null;
  power?: number | null;
  fuelType?: string | null;
  transmission?: string | null;
  country?: string | null;
  countryFlag?: string | null;
  city?: string | null;
  seller?: string | null;
  sellerType?: CarListing['sellerType'] | null;
  sellerRating?: number | null;
  sellerPhone?: string | null;
  sellerEmail?: string | null;
  listingUrl?: string | null;
  listingSource?: string | null;
  notes?: string | null;
}

function toRowPatch(input: ListingInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if ('model' in input) patch.model = input.model;
  if ('generation' in input) patch.generation = input.generation;
  if ('phase' in input) patch.phase = input.phase;
  if ('image' in input) patch.image = input.image;
  if ('price' in input) patch.price = input.price;
  if ('mileage' in input) patch.mileage = input.mileage;
  if ('year' in input) patch.year = input.year;
  if ('power' in input) patch.power = input.power;
  if ('fuelType' in input) patch.fuel_type = input.fuelType;
  if ('transmission' in input) patch.transmission = input.transmission;
  if ('country' in input) patch.country = input.country;
  if ('countryFlag' in input) patch.country_flag = input.countryFlag;
  if ('city' in input) patch.city = input.city;
  if ('seller' in input) patch.seller = input.seller;
  if ('sellerType' in input) patch.seller_type = input.sellerType;
  if ('sellerRating' in input) patch.seller_rating = input.sellerRating;
  if ('sellerPhone' in input) patch.seller_phone = input.sellerPhone;
  if ('sellerEmail' in input) patch.seller_email = input.sellerEmail;
  if ('listingUrl' in input) patch.listing_url = input.listingUrl;
  if ('listingSource' in input) patch.listing_source = input.listingSource;
  if ('notes' in input) patch.notes = input.notes;
  return patch;
}

/**
 * Inserts a manually-found listing. Requires an authenticated Supabase session —
 * the `listings` table's RLS policy rejects inserts from the anonymous role.
 */
export async function insertListing(input: ListingInput): Promise<CarListing> {
  if (!supabase) throw new Error('Supabase non configuré.');

  const { data, error } = await supabase
    .from('listings')
    .insert({ id: generateId(), image: null, conformity: null, ...toRowPatch(input) })
    .select()
    .single();

  if (error) throw error;
  return fromRow(data as ListingRow);
}

/** Updates only the given fields, so completing a draft listing over several edits is safe. */
export async function updateListing(id: string, patch: ListingInput): Promise<CarListing> {
  if (!supabase) throw new Error('Supabase non configuré.');

  const { data, error } = await supabase
    .from('listings')
    .update(toRowPatch(patch))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return fromRow(data as ListingRow);
}
