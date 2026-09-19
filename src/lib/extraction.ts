import { supabase } from './supabaseClient';

export interface ExtractionResult {
  model?: string;
  generation?: string;
  phase?: string;
  imageUrl?: string;
  price?: number;
  mileage?: number;
  year?: number;
  power?: number;
  fuelType?: string;
  transmission?: string;
  country?: string;
  countryFlag?: string;
  city?: string;
  seller?: string;
  sellerType?: 'Professionnel' | 'Particulier';
  sellerPhone?: string;
  sellerEmail?: string;
  listingSource?: string;
  urlFetched?: boolean;
  urlBlockedReason?: string | null;
}

/** Calls the extract-listing Edge Function. Requires an authenticated session. */
export async function extractListing(url: string, notes: string): Promise<ExtractionResult> {
  if (!supabase) throw new Error('Supabase non configuré.');

  const { data, error } = await supabase.functions.invoke('extract-listing', {
    body: { url: url || undefined, notes: notes || undefined },
  });

  if (error) throw error;
  return data as ExtractionResult;
}
