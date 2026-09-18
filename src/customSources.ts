import { useEffect, useState } from 'react';

export interface CustomSource {
  id: string;
  url: string;
  label: string;
  note: string;
  addedAt: number;
}

export type AddSourceError = 'invalidUrl' | 'duplicateUrl';

const STORAGE_KEY = '911analytics.customSources.v1';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Only http(s) URLs are accepted — rejects javascript:, data: and other schemes before the URL is ever rendered as a link. */
function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!parsed.hostname.includes('.')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function labelFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

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
