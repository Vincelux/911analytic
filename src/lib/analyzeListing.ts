import { supabase } from './supabaseClient';
import type { ValueAnalysisData, VigilancePoint } from '../data';

export interface ListingAnalysisResult {
  vigilancePoints: VigilancePoint[];
  negotiationArguments: string[];
  valueAnalysis: ValueAnalysisData;
  historyHighlights: string[];
}

/** Calls the analyze-listing Edge Function to (re)generate a listing's AI analysis. Requires an authenticated session. */
export async function requestListingAnalysis(id: string): Promise<ListingAnalysisResult> {
  if (!supabase) throw new Error('Supabase non configuré.');

  const { data, error } = await supabase.functions.invoke('analyze-listing', {
    body: { id },
  });

  if (error) throw error;
  return data as ListingAnalysisResult;
}
