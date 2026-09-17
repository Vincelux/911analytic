import { useEffect, useId, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Check,
  SlidersHorizontal,
  Star,
  RotateCcw,
} from 'lucide-react';
import {
  defaultFilters,
  generations,
  fuelTypes,
  transmissions,
  sellerTypes,
  publicationDates,
  countries,
  ratingOptions,
  type FilterState,
  type Generation,
  type FuelType,
  type Transmission,
  type SellerType,
  type PublicationDate,
  type Country,
  type Rating,
} from './data';
import { type Lang, getT, translateOption } from './i18n';

function Dropdown({
  label,
  value,
  options,
  onSelect,
  lang,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onSelect: (v: string) => void;
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-[10px] uppercase tracking-[0.15em] text-white/30">
        {label}
      </label>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-light text-white/80 transition-all hover:border-amber-400/30 hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-amber-400/30"
      >
        <span className="truncate">{translateOption(lang, value)}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            aria-label={label}
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-[#111111] shadow-2xl"
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={opt === value}
                onClick={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-xs transition-colors focus:bg-white/5 focus:outline-none ${
                  opt === value
                    ? 'bg-amber-400/10 text-amber-300'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="font-light">{translateOption(lang, opt)}</span>
                {opt === value && <Check className="h-3 w-3 text-amber-300" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  narrow,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  narrow?: boolean;
  min?: number;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const next = Math.max(min, Math.round(parsed));
    setDraft(String(next));
    onChange(next);
  };

  return (
    <div>
      <label className="mb-1.5 block text-[10px] uppercase tracking-[0.15em] text-white/30">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          min={min}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
          aria-label={label}
          className={`w-full rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs font-light text-white/80 transition-all hover:border-white/20 focus:border-amber-400/40 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-amber-400/20 ${narrow ? 'max-w-[80px]' : ''}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-light text-white/25">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function RangeFields({
  label,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
  min = 0,
}: {
  label: string;
  valueMin: number;
  valueMax: number;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
  min?: number;
}) {
  const [draftMin, setDraftMin] = useState(String(valueMin));
  const [draftMax, setDraftMax] = useState(String(valueMax));

  useEffect(() => setDraftMin(String(valueMin)), [valueMin]);
  useEffect(() => setDraftMax(String(valueMax)), [valueMax]);

  const commitMin = () => {
    const parsed = Number(draftMin);
    if (!Number.isFinite(parsed)) {
      setDraftMin(String(valueMin));
      return;
    }
    const next = Math.max(min, Math.min(Math.round(parsed), valueMax));
    setDraftMin(String(next));
    onChangeMin(next);
  };

  const commitMax = () => {
    const parsed = Number(draftMax);
    if (!Number.isFinite(parsed)) {
      setDraftMax(String(valueMax));
      return;
    }
    const next = Math.max(valueMin, Math.round(parsed));
    setDraftMax(String(next));
    onChangeMax(next);
  };

  return (
    <div>
      <label className="mb-1.5 block text-[10px] uppercase tracking-[0.15em] text-white/30">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={min}
          max={valueMax}
          value={draftMin}
          onChange={(e) => setDraftMin(e.target.value)}
          onBlur={commitMin}
          onKeyDown={(e) => e.key === 'Enter' && commitMin()}
          aria-label={`${label} minimum`}
          className="w-full min-w-0 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs font-light text-white/80 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
        />
        <span className="shrink-0 text-white/20">—</span>
        <input
          type="number"
          min={valueMin}
          value={draftMax}
          onChange={(e) => setDraftMax(e.target.value)}
          onBlur={commitMax}
          onKeyDown={(e) => e.key === 'Enter' && commitMax()}
          aria-label={`${label} maximum`}
          className="w-full min-w-0 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs font-light text-white/80 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
        />
      </div>
    </div>
  );
}

function SegmentedControl({
  label,
  options,
  value,
  onChange,
  lang,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
}) {
  return (
    <div>
      <div className="mb-1.5 block text-[10px] uppercase tracking-[0.15em] text-white/30">{label}</div>
      <div role="group" aria-label={label} className="flex gap-0.5 overflow-hidden rounded-lg border border-white/10 bg-white/[0.02] p-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            aria-pressed={opt === value}
            onClick={() => onChange(opt)}
            className={`flex-1 truncate rounded-md px-1 py-1.5 text-[10px] font-light transition-all focus:outline-none focus:ring-1 focus:ring-amber-400/30 ${
              opt === value
                ? 'bg-amber-400/15 text-amber-300'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {translateOption(lang, opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

function StarRating({
  value,
  onChange,
  lang,
}: {
  value: Rating;
  onChange: (v: Rating) => void;
  lang: Lang;
}) {
  const t = getT(lang);
  const ratingMap: Record<Rating, number> = {
    'Toutes': 0,
    '3 étoiles et +': 3,
    '4 étoiles et +': 4,
    '4.5 étoiles et +': 4.5,
  };

  return (
    <div>
      <div className="mb-1.5 block text-[10px] uppercase tracking-[0.15em] text-white/30">{t('sellerRating')}</div>
      <div role="group" aria-label={t('sellerRating')} className="flex flex-wrap gap-1.5">
        {ratingOptions.map((r) => {
          const val = ratingMap[r];
          const active = r === value;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(r)}
              className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-light transition-all focus:outline-none focus:ring-1 focus:ring-amber-400/30 ${
                active
                  ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                  : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/70'
              }`}
            >
              {val > 0 ? (
                <>
                  <Star className={`h-2.5 w-2.5 ${active ? 'fill-amber-300 text-amber-300' : 'text-white/30'}`} />
                  <span>{val}+</span>
                </>
              ) : (
                <span>{translateOption(lang, r)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getActiveSummary(filters: FilterState, lang: Lang): string[] {
  const chips: string[] = [];
  const t = getT(lang);
  if (filters.generation !== 'Toutes') chips.push(`${t('fGeneration')}: ${filters.generation}`);
  if (filters.yearMin > defaultFilters.yearMin || filters.yearMax < defaultFilters.yearMax) {
    chips.push(`${filters.yearMin}–${filters.yearMax}`);
  }
  if (filters.priceMin > defaultFilters.priceMin || filters.priceMax < defaultFilters.priceMax) {
    const min = filters.priceMin > 0 ? `${(filters.priceMin / 1000).toFixed(0)}k` : '0';
    const max = filters.priceMax < defaultFilters.priceMax ? `${(filters.priceMax / 1000).toFixed(0)}k` : '∞';
    chips.push(`${min}–${max} €`);
  }
  if (filters.kmMin > defaultFilters.kmMin || filters.kmMax < defaultFilters.kmMax) {
    const min = filters.kmMin > 0 ? `${(filters.kmMin / 1000).toFixed(0)}k` : '0';
    const max = filters.kmMax < defaultFilters.kmMax ? `${(filters.kmMax / 1000).toFixed(0)}k` : '∞';
    chips.push(`${min}–${max} km`);
  }
  if (filters.powerMin > defaultFilters.powerMin) chips.push(`${filters.powerMin}+ ${lang === 'fr' ? 'ch' : 'hp'}`);
  if (filters.fuelType !== 'Toutes') chips.push(translateOption(lang, filters.fuelType));
  if (filters.transmission !== 'Toutes') chips.push(translateOption(lang, filters.transmission));
  if (filters.country !== 'Europe Globale') chips.push(translateOption(lang, filters.country));
  if (filters.sellerType !== 'Tous') chips.push(translateOption(lang, filters.sellerType));
  if (filters.publicationDate !== 'Toutes') chips.push(translateOption(lang, filters.publicationDate));
  if (filters.rating !== 'Toutes') chips.push(translateOption(lang, filters.rating));
  return chips;
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  lang: Lang;
}

export default function FilterPanel({ filters, onChange, lang }: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const t = getT(lang);

  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const activeChips = getActiveSummary(filters, lang);
  const activeCount = activeChips.length;
  const reset = () => onChange({ ...defaultFilters });

  return (
    <div className="border-b border-white/5 bg-[#0d0d0d]/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center justify-between gap-4 py-3">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className="flex items-center gap-2.5 text-sm font-light text-white/80 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30"
          >
            <SlidersHorizontal className="h-4 w-4 text-amber-300" />
            <span className="tracking-wide">{t('advancedFilters')}</span>
            {activeCount > 0 && (
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">{activeCount}</span>
            )}
            {expanded ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
          </button>

          <div className="flex flex-1 items-center gap-2 overflow-x-auto scrollbar-none">
            {activeChips.length === 0 ? (
              <span className="text-xs font-light text-white/30">{t('noFiltersActive')}</span>
            ) : (
              <>
                {activeChips.map((chip, i) => (
                  <span key={`${chip}-${i}`} className="shrink-0 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-light text-white/60">{chip}</span>
                ))}
                <button
                  type="button"
                  onClick={reset}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 text-[11px] font-light text-white/40 transition-all hover:border-white/20 hover:text-white/70 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                >
                  <RotateCcw className="h-3 w-3" />
                  {t('reset')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <>
          <div className="border-t border-white/5" />
          <div className="mx-auto max-w-7xl px-6 py-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              <Dropdown label={t('fGeneration')} value={filters.generation} options={['Toutes', ...generations]} onSelect={(v) => update('generation', v as Generation | 'Toutes')} lang={lang} />
              <RangeFields label={t('fYear')} valueMin={filters.yearMin} valueMax={filters.yearMax} onChangeMin={(v) => update('yearMin', v)} onChangeMax={(v) => update('yearMax', v)} min={defaultFilters.yearMin} />
              <RangeFields label={t('fBudget')} valueMin={filters.priceMin} valueMax={filters.priceMax} onChangeMin={(v) => update('priceMin', v)} onChangeMax={(v) => update('priceMax', v)} />
              <RangeFields label={t('fMileage')} valueMin={filters.kmMin} valueMax={filters.kmMax} onChangeMin={(v) => update('kmMin', v)} onChangeMax={(v) => update('kmMax', v)} />
              <NumberField label={t('fPower')} value={filters.powerMin} onChange={(v) => update('powerMin', v)} suffix={lang === 'fr' ? 'ch' : 'hp'} narrow />
              <Dropdown label={t('fCountry')} value={filters.country} options={countries} onSelect={(v) => update('country', v as Country)} lang={lang} />
              <SegmentedControl label={t('fFuel')} options={['Toutes', ...fuelTypes]} value={filters.fuelType} onChange={(v) => update('fuelType', v as FuelType | 'Toutes')} lang={lang} />
              <SegmentedControl label={t('fTransmission')} options={['Toutes', ...transmissions]} value={filters.transmission} onChange={(v) => update('transmission', v as Transmission | 'Toutes')} lang={lang} />
              <Dropdown label={t('fSellerType')} value={filters.sellerType} options={sellerTypes} onSelect={(v) => update('sellerType', v as SellerType)} lang={lang} />
              <Dropdown label={t('fPublicationDate')} value={filters.publicationDate} options={publicationDates} onSelect={(v) => update('publicationDate', v as PublicationDate)} lang={lang} />
              <div className="col-span-2 sm:col-span-3 lg:col-span-2 xl:col-span-2">
                <StarRating value={filters.rating} onChange={(v) => update('rating', v)} lang={lang} />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="flex items-center gap-2 rounded-lg bg-amber-400/15 px-4 py-2 text-xs font-medium text-amber-300 transition-all hover:bg-amber-400/25 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              >
                <Check className="h-3.5 w-3.5" />
                {t('applyAndCollapse')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
