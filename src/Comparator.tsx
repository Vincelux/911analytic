import { X, Check, Share2, Zap, Volume2, Timer, Armchair, ShieldCheck, Gauge, Star, Car as CarIcon } from 'lucide-react';
import type { CarListing } from './data';
import { type Lang, getT, translateOption, translateOptionLabel } from './i18n';

function formatPrice(price: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB').format(price) + ' €';
}

function formatMileage(km: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB').format(km) + ' km';
}

const flagEmoji: Record<string, string> = {
  FR: '🇫🇷', DE: '🇩🇪', IT: '🇮🇹', ES: '🇪🇸', BE: '🇧🇪',
  NL: '🇳🇱', CH: '🇨🇭', AT: '🇦🇹', PT: '🇵🇹', LU: '🇱🇺',
};

const optionIcons: Record<string, typeof Zap> = {
  x51: Zap,
  pse: Volume2,
  chrono: Timer,
  sportSeats: Armchair,
  sportChrono: Timer,
  carbonBrakes: ShieldCheck,
  pasm: Gauge,
  pdcc: Gauge,
  lsd: Gauge,
  rearSteering: Gauge,
  matrixLed: Zap,
  bose: Volume2,
  axleLift: Zap,
  pts: Star,
  carbonTrim: ShieldCheck,
  fullLeather: Armchair,
};

interface ComparatorProps {
  cars: CarListing[];
  lang: Lang;
  onClose: () => void;
  onRemove: (id: string) => void;
}

export default function Comparator({ cars, lang, onClose, onRemove }: ComparatorProps) {
  const t = getT(lang);
  const gridCols = cars.length <= 2 ? 'lg:grid-cols-2' : cars.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';

  const allOptionKeys = Array.from(new Set(cars.flatMap((c) => c.options.map((o) => o.key))));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0a0a0a]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-transparent">
              <span className="text-sm font-semibold text-amber-300">911</span>
            </div>
            <div>
              <h1 className="text-base font-light tracking-[0.15em] text-white">{t('comparator')}</h1>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">
                {cars.length} {t('modelsSelected')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-light text-white/70 transition-all hover:border-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">{t('backToListing')}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        {/* Car cards row */}
        <div className={`grid gap-4 ${gridCols}`}>
          {cars.map((car) => (
            <div key={car.id} className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent">
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden">
                {car.image ? (
                  <img src={car.image} alt={car.model ?? ''} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/[0.03]">
                    <CarIcon className="h-8 w-8 text-white/15" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                <button
                  onClick={() => onRemove(car.id)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-white/50 backdrop-blur-md transition-all hover:border-red-400/40 hover:text-red-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {car.country && (
                  <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                    <span className="text-sm">{(car.countryFlag && flagEmoji[car.countryFlag]) || '🇪🇺'}</span>
                    <span className="text-xs font-light text-white/70">{car.country}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="text-base font-light text-white">{car.model || t('untitledListing')}</h3>
                <p className="mb-3 text-xs font-light text-white/40">{[car.generation, car.phase, car.year].filter(Boolean).join(' · ')}</p>

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="font-light text-white/40">{t('price')}</span>
                    <span className="font-light text-white">{car.price != null ? formatPrice(car.price, lang) : '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="font-light text-white/40">{t('km')}</span>
                    <span className="font-light text-white">{car.mileage != null ? formatMileage(car.mileage, lang) : '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="font-light text-white/40">{t('power')}</span>
                    <span className="font-light text-white">{car.power != null ? `${car.power} ch` : '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="font-light text-white/40">{t('fTransmission')}</span>
                    <span className="font-light text-white">{car.transmission ? translateOption(lang, car.transmission) : '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="font-light text-white/40">{t('sellerContact')}</span>
                    <span className="font-light text-white">{car.seller || t('sellerUnknown')}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1.5">
                    <span className="font-light text-white/40">{t('rating')}</span>
                    <span className="font-light text-white">{car.sellerRating != null ? `${car.sellerRating.toFixed(1)}/5` : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light text-white/40">{t('conformityAI')}</span>
                    {car.conformity != null ? (
                      <span className={`font-medium ${car.conformity >= 85 ? 'text-emerald-300' : car.conformity >= 65 ? 'text-amber-300' : 'text-red-300'}`}>
                        {car.conformity}%
                      </span>
                    ) : (
                      <span className="font-light text-white/30">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Options comparison table */}
        <div className="mt-8">
          <h2 className="mb-4 text-xs uppercase tracking-[0.3em] text-white/30">{t('optionsComparison')}</h2>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-xs font-light uppercase tracking-wider text-white/40">{t('detectedOptions')}</th>
                  {cars.map((car) => (
                    <th key={car.id} className="px-4 py-3 text-center text-xs font-light text-white/60">
                      {[car.generation, car.phase].filter(Boolean).join(' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allOptionKeys.map((optKey, rowIdx) => {
                  const frLabel = cars.map((c) => c.options.find((o) => o.key === optKey)).find(Boolean)?.label || optKey;
                  const optLabel = translateOptionLabel(lang, optKey, frLabel);
                  const Icon = optionIcons[optKey] || Zap;
                  return (
                    <tr key={optKey} className={rowIdx % 2 === 0 ? 'bg-white/[0.01]' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-white/40">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm font-light text-white/70">{optLabel}</span>
                        </div>
                      </td>
                      {cars.map((car) => {
                        const opt = car.options.find((o) => o.key === optKey);
                        const present = opt?.present;
                        return (
                          <td key={car.id} className="px-4 py-3 text-center">
                            {present ? (
                              <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15">
                                <Check className="h-3.5 w-3.5 text-emerald-300" />
                              </div>
                            ) : (
                              <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-white/5">
                                <X className="h-3.5 w-3.5 text-white/25" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Value analysis comparison */}
        <div className="mt-8">
          <h2 className="mb-4 text-xs uppercase tracking-[0.3em] text-white/30">{t('futureValue')}</h2>
          <div className={`grid gap-4 ${gridCols}`}>
            {cars.map((car) =>
              car.valueAnalysis ? (
                <div key={car.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-light text-white/50">{[car.generation, car.phase].filter(Boolean).join(' ')}</span>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                      car.valueAnalysis.trend === 'up'
                        ? 'bg-emerald-400/10 text-emerald-300'
                        : car.valueAnalysis.trend === 'stable'
                        ? 'bg-sky-400/10 text-sky-300'
                        : 'bg-red-400/10 text-red-300'
                    }`}>
                      {car.valueAnalysis.trendLabel}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-light text-white">{car.valueAnalysis.retentionScore}</span>
                    <span className="text-sm font-light text-white/30">/10</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${
                        car.valueAnalysis.retentionScore >= 8
                          ? 'bg-emerald-400'
                          : car.valueAnalysis.retentionScore >= 6
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                      style={{ width: `${(car.valueAnalysis.retentionScore / 10) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-white/30">
                    {t('rarity')}: {car.valueAnalysis.rarityLabel}
                  </p>
                </div>
              ) : (
                <div key={car.id} className="flex items-center justify-center rounded-2xl border border-white/5 bg-white/[0.01] p-5 text-center text-xs font-light text-white/30">
                  {[car.generation, car.phase].filter(Boolean).join(' ')} — {t('notEvaluatedYet')}
                </div>
              )
            )}
          </div>
        </div>

        {/* Share button */}
        <div className="mt-8 flex justify-center pb-8">
          <button className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-300 to-amber-400 px-8 py-4 text-sm font-medium tracking-wide text-[#0a0a0a] shadow-lg shadow-amber-500/10 transition-all hover:shadow-amber-500/20 hover:brightness-110 active:scale-[0.98]">
            <span className="relative z-10 flex items-center gap-2.5">
              <Share2 className="h-4 w-4" />
              {t('shareComparison')}
            </span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </button>
        </div>
      </div>
    </div>
  );
}
