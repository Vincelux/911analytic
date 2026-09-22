import { supabase } from './supabaseClient';
import type { FilterState } from '../data';

/**
 * Mirrors "Filtres avancés" server-side so the scraping job can bound what
 * it extracts/analyzes to what the owner is actually looking for, instead
 * of every listing it finds on a source page. Write-only from the app —
 * nothing here reads it back into the UI.
 */
export async function saveSearchCriteria(filters: FilterState): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('search_criteria').upsert(
    {
      id: true,
      generation: filters.generation,
      year_min: filters.yearMin,
      year_max: filters.yearMax,
      price_min: filters.priceMin,
      price_max: filters.priceMax,
      km_min: filters.kmMin,
      km_max: filters.kmMax,
      power_min: filters.powerMin,
      fuel_type: filters.fuelType,
      transmission: filters.transmission,
      country: filters.country,
      seller_type: filters.sellerType,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) console.warn('[911analytics] échec de la sauvegarde des critères de recherche:', error.message);
}
