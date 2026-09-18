import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { listings as fallbackListings, type CarListing } from './data';

interface ListingRow {
  id: string;
  model: string;
  generation: string;
  phase: string;
  image: string;
  price: number;
  mileage: number;
  year: number;
  power: number;
  fuel_type: string;
  transmission: string;
  country: string;
  country_flag: string;
  city: string;
  seller: string;
  seller_type: CarListing['sellerType'];
  seller_rating: number;
  seller_phone: string;
  seller_email: string;
  listing_url: string;
  listing_source: string;
  conformity: number;
  published_days_ago: number;
  options: CarListing['options'];
  vigilance_points: CarListing['vigilancePoints'];
  negotiation_arguments: CarListing['negotiationArguments'];
  price_history: CarListing['priceHistory'];
  value_analysis: CarListing['valueAnalysis'];
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
