import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { normalizeUrl, labelFromUrl } from './lib/url';

export interface CustomSource {
  id: string;
  url: string;
  label: string;
  note: string;
  addedAt: number;
}

export type AddSourceError = 'invalidUrl' | 'duplicateUrl' | 'notAuthenticated';

interface SourceRow {
  id: string;
  url: string;
  label: string;
  note: string;
  created_at: string;
}

function fromRow(row: SourceRow): CustomSource {
  return {
    id: row.id,
    url: row.url,
    label: row.label,
    note: row.note,
    addedAt: new Date(row.created_at).getTime(),
  };
}

/**
 * Backed by the `custom_sources` table (not localStorage) so the scheduled
 * scraping job — which runs server-side — can read the same list. Reads and
 * writes both require an authenticated session (RLS-enforced); a logged-out
 * visitor simply sees an empty list.
 */
export function useCustomSources() {
  const [sources, setSources] = useState<CustomSource[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('custom_sources')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setSources((data as SourceRow[]).map(fromRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addSource = async (url: string, label: string, note: string): Promise<AddSourceError | null> => {
    if (!supabase) return 'notAuthenticated';
    const normalized = normalizeUrl(url);
    if (!normalized) return 'invalidUrl';

    const { error } = await supabase.from('custom_sources').insert({
      url: normalized,
      label: label.trim() || labelFromUrl(normalized),
      note: note.trim(),
    });

    if (error) {
      if (error.code === '23505') return 'duplicateUrl';
      return 'notAuthenticated';
    }
    await refresh();
    return null;
  };

  const removeSource = async (id: string) => {
    if (!supabase) return;
    await supabase.from('custom_sources').delete().eq('id', id);
    await refresh();
  };

  return { sources, loading, addSource, removeSource };
}
