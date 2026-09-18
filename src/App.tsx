import { useState, useMemo, useEffect } from 'react';
import { Globe, Link as LinkIcon, Loader2, AlertTriangle } from 'lucide-react';
import {
  type FilterState,
  defaultFilters,
  filterListings,
  type CarListing,
} from './data';
import { fetchListings } from './listingsRepository';
import { type Lang, getT } from './i18n';
import { useCustomSources } from './customSources';
import FilterPanel from './FilterPanel';
import CarCard from './CarCard';
import CarDetail from './CarDetail';
import Comparator from './Comparator';
import ComparatorBar from './ComparatorBar';
import CustomSourcesDrawer from './CustomSourcesDrawer';

type View = 'listing' | 'comparator';

export default function App() {
  const [lang, setLang] = useState<Lang>('fr');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedCar, setSelectedCar] = useState<CarListing | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<View>('listing');
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const { sources: customSources, addSource, removeSource } = useCustomSources();
  const [listings, setListings] = useState<CarListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const t = getT(lang);

  useEffect(() => {
    let cancelled = false;
    fetchListings()
      .then((data) => {
        if (!cancelled) setListings(data);
      })
      .catch((err) => {
        if (!cancelled) setListingsError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setListingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredListings = useMemo(() => filterListings(listings, filters), [listings, filters]);

  const selectedCars = useMemo(
    () => listings.filter((l) => selectedIds.has(l.id)),
    [listings, selectedIds]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 4) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  if (view === 'comparator' && selectedCars.length >= 2) {
    return (
      <Comparator
        cars={selectedCars}
        lang={lang}
        onClose={() => setView('listing')}
        onRemove={(id) => {
          toggleSelect(id);
          if (selectedCars.length - 1 < 2) setView('listing');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-amber-500/[0.04] blur-[120px]" />
        <div className="absolute -top-20 right-1/4 h-80 w-80 rounded-full bg-sky-500/[0.03] blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-transparent">
              <span className="text-sm font-semibold tracking-tight text-amber-300">911</span>
            </div>
            <div>
              <h1 className="text-base font-light tracking-[0.15em] text-white">911 ANALYTICS</h1>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">{t('tagline')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Custom sources */}
            <button
              onClick={() => setSourcesOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-light text-white/60 transition-all hover:border-amber-400/30 hover:text-white"
            >
              <LinkIcon className="h-3.5 w-3.5 text-amber-300/70" />
              <span className="hidden sm:inline">{t('customSources')}</span>
              {customSources.length > 0 && (
                <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                  {customSources.length}
                </span>
              )}
            </button>

            {/* Language switcher */}
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-white/30" />
              <button
                onClick={() => setLang('fr')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  lang === 'fr'
                    ? 'bg-amber-400/15 text-amber-300'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                FR
              </button>
              <span className="text-white/20">|</span>
              <button
                onClick={() => setLang('en')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  lang === 'en'
                    ? 'bg-amber-400/15 text-amber-300'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible filter bar */}
        <FilterPanel filters={filters} onChange={setFilters} lang={lang} />
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        {/* Results header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-light tracking-wide text-white">{t('listings911')}</h2>
            <p className="text-xs font-light text-white/40">
              {filteredListings.length} {t('resultsIn')}
            </p>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-1.5">
              <span className="text-xs font-light text-amber-200/80">
                {selectedIds.size} {t('selectedForComparison')}
              </span>
            </div>
          )}
        </div>

        {/* Listing grid */}
        {listingsLoading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] py-20">
            <Loader2 className="h-6 w-6 animate-spin text-amber-300/70" />
            <p className="mt-3 text-sm font-light text-white/40">{t('loadingListings')}</p>
          </div>
        ) : listingsError ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/5 py-20">
            <AlertTriangle className="h-6 w-6 text-red-300" />
            <p className="mt-3 text-sm font-light text-red-200/80">{t('loadingListingsError')}</p>
            <p className="mt-1 max-w-md text-center text-xs font-light text-white/30">{listingsError}</p>
          </div>
        ) : filteredListings.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                isSelected={selectedIds.has(car.id)}
                onToggleSelect={() => toggleSelect(car.id)}
                onClick={() => setSelectedCar(car)}
                lang={lang}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] py-20">
            <p className="text-lg font-light text-white/50">{t('noResults')}</p>
            <button
              onClick={() => setFilters(defaultFilters)}
              className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-sm font-light text-white/60 transition-all hover:border-white/20 hover:text-white"
            >
              {t('resetFilters')}
            </button>
          </div>
        )}
      </main>

      {/* Detail panel */}
      {selectedCar && (
        <CarDetail car={selectedCar} lang={lang} onClose={() => setSelectedCar(null)} />
      )}

      {/* Custom sources panel */}
      {sourcesOpen && (
        <CustomSourcesDrawer
          lang={lang}
          sources={customSources}
          onAdd={addSource}
          onRemove={removeSource}
          onClose={() => setSourcesOpen(false)}
        />
      )}

      {/* Floating comparator bar */}
      <ComparatorBar
        count={selectedIds.size}
        onOpen={() => setView('comparator')}
        onClear={clearSelection}
        lang={lang}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 py-6">
        <p className="text-center text-xs font-light text-white/20">{t('footer')}</p>
      </footer>
    </div>
  );
}
