import { useEffect, useState } from 'react';
import { generateId } from './lib/ids';
import { normalizeUrl, labelFromUrl } from './lib/url';

export interface CustomSource {
  id: string;
  url: string;
  label: string;
  note: string;
  addedAt: number;
}

export type AddSourceError = 'invalidUrl' | 'duplicateUrl';

const STORAGE_KEY = '911analytics.customSources.v1';

function loadSources(): CustomSource[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CustomSource =>
        !!item && typeof item.id === 'string' && typeof item.url === 'string' && typeof item.label === 'string'
    );
  } catch {
    return [];
  }
}

function saveSources(sources: CustomSource[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  } catch {
    // Private browsing / quota exceeded — sources stay in-memory for this session only.
  }
}

export function useCustomSources() {
  const [sources, setSources] = useState<CustomSource[]>(() => loadSources());

  useEffect(() => {
    saveSources(sources);
  }, [sources]);

  const addSource = (url: string, label: string, note: string): AddSourceError | null => {
    const normalized = normalizeUrl(url);
    if (!normalized) return 'invalidUrl';
    if (sources.some((s) => s.url.toLowerCase() === normalized.toLowerCase())) {
      return 'duplicateUrl';
    }
    const entry: CustomSource = {
      id: generateId(),
      url: normalized,
      label: label.trim() || labelFromUrl(normalized),
      note: note.trim(),
      addedAt: Date.now(),
    };
    setSources((prev) => [entry, ...prev]);
    return null;
  };

  const removeSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  return { sources, addSource, removeSource };
}
