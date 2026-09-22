import { useState } from 'react';
import {
  X,
  Check,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Share2,
  Zap,
  Volume2,
  Timer,
  Armchair,
  Gauge,
  Calendar,
  Star,
  TrendingDown as TrendingDownIcon,
  ShieldCheck,
  Phone,
  Mail,
  ExternalLink,
  Store,
  User,
  Car as CarIcon,
  StickyNote,
  Pencil,
  Sun,
  Smartphone,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import type { CarListing, ValueAnalysisData, VigilancePoint } from './data';
import { type Lang, getT, translateOption, translateOptionLabel } from './i18n';
import { getAnalysisScore, getIndicativeValue, getValueProjection } from './analysis';
import { useAuth } from './lib/auth';
import { requestListingAnalysis } from './lib/analyzeListing';

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
  sportSuspension: Gauge,
  sunroof: Sun,
  carPlay: Smartphone,
};

function TrendBadge({ trend, label }: { trend: ValueAnalysisData['trend']; label: string }) {
  const config = {
    up: { icon: TrendingUp, color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
    stable: { icon: Minus, color: 'text-sky-300 bg-sky-400/10 border-sky-400/20' },
    down: { icon: TrendingDown, color: 'text-red-300 bg-red-400/10 border-red-400/20' },
  }[trend];
  const Icon = config.icon;
  return (
    <div className={`inline-flex max-w-full items-start gap-2 rounded-lg border px-3 py-1.5 ${config.color}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="line-clamp-2 text-xs font-medium leading-snug tracking-wide">{label}</span>
    </div>
  );
}

export function VigilanceCard({ point }: { point: VigilancePoint }) {
  const config = {
    critical: { icon: AlertTriangle, color: 'text-red-300', bg: 'bg-red-400/10', border: 'border-red-400/20' },
    warning: { icon: AlertTriangle, color: 'text-amber-300', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
    info: { icon: Info, color: 'text-sky-300', bg: 'bg-sky-400/10', border: 'border-sky-400/20' },
  }[point.severity];
  const Icon = config.icon;
  return (
    <div className={`flex gap-3 rounded-xl border ${config.border} ${config.bg} p-4`}>
      <div className={`mt-0.5 shrink-0 ${config.color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className={`text-sm font-medium ${config.color}`}>{point.title}</p>
        <p className="mt-1 text-sm font-light leading-relaxed text-white/50">{point.description}</p>
      </div>
    </div>
  );
}

interface CarDetailProps {
  car: CarListing;
  lang: Lang;
  onClose: () => void;
  onEdit: () => void;
  onReanalyzed?: (listing: CarListing) => void;
}

export default function CarDetail({ car, lang, onClose, onEdit, onReanalyzed }: CarDetailProps) {
  const [shared, setShared] = useState(false);
  const [projectionYears, setProjectionYears] = useState(5);
  const [projectionKmPerYear, setProjectionKmPerYear] = useState(5000);
  const [reanalyzing, setReanalyzing] = useState(false);
  const { user } = useAuth();
  const t = getT(lang);

  // Prefer the AI-reasoned fair price once analyzed; fall back to the instant
  // client-side formula for listings that haven't been analyzed yet.
  const aiPrice = car.valueAnalysis?.estimatedFairPrice;
  const realisticPrice = aiPrice ?? getIndicativeValue(car);
  const analysisScore = getAnalysisScore(car);
  const discount = realisticPrice != null && car.price != null ? car.price - realisticPrice : null;
  const discountPct = discount != null && car.price ? Math.round((discount / car.price) * 100) : null;
  const valueProjection = getValueProjection(car, { years: projectionYears, kmPerYear: projectionKmPerYear });

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      const analysis = await requestListingAnalysis(car.id);
      onReanalyzed?.({ ...car, ...analysis });
    } catch (err) {
      console.warn('[911analytics] échec de la réanalyse:', err);
    } finally {
      setReanalyzing(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?listing=${encodeURIComponent(car.id)}`;
    const title = car.model || t('untitledListing');
    const shareData = {
      title: `${title} — 911 Analytics`,
      text: car.price != null ? `${title} · ${formatPrice(car.price, lang)}` : title,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setShared(true);
    } catch {
      setShared(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#0d0d0d] shadow-2xl">
        <div className="sticky top-4 z-10 ml-auto mr-4 flex w-fit items-center gap-2">
          {user && (
            <button
              onClick={() => void handleReanalyze()}
              disabled={reanalyzing}
              aria-label={t('reanalyze')}
              title={t('reanalyze')}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 backdrop-blur-md transition-all hover:border-amber-400/30 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${reanalyzing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={onEdit}
            aria-label={t('editListing')}
            title={t('editListing')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 backdrop-blur-md transition-all hover:border-amber-400/30 hover:text-amber-200"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            aria-label={lang === 'fr' ? 'Fermer' : 'Close'}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 backdrop-blur-md transition-all hover:border-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative -mt-13 aspect-[16/9] overflow-hidden">
          {car.image ? (
            <img src={car.image} alt={car.model ?? ''} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/[0.03]">
              <CarIcon className="h-14 w-14 text-white/15" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="mb-2 flex items-center gap-2">
              {(car.generation || car.phase) && (
                <span className="rounded-md bg-amber-400/15 px-2.5 py-1 text-xs font-medium text-amber-300">
                  {[car.generation, car.phase].filter(Boolean).join(' · ')}
                </span>
              )}
              {car.porscheApproved && (
                <span className="flex items-center gap-1 rounded-md bg-sky-400/15 px-2.5 py-1 text-xs font-medium text-sky-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Porsche Approved
                </span>
              )}
              {car.country && (
                <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white/70 backdrop-blur-md">
                  {(car.countryFlag && flagEmoji[car.countryFlag]) || '🇪🇺'} {car.country}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-light tracking-wide text-white">{car.model || t('untitledListing')}</h2>
            {(car.city || car.seller) && (
              <p className="text-sm font-light text-white/50">{[car.city, car.seller].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        </div>

        <div className="space-y-8 p-6">
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Calendar, value: car.year != null ? car.year.toString() : '—', label: t('year') },
              { icon: Gauge, value: car.mileage != null ? formatMileage(car.mileage, lang) : '—', label: t('km') },
              { icon: Zap, value: car.power != null ? `${car.power} ch` : '—', label: t('power') },
              { icon: Star, value: car.sellerRating != null ? `${car.sellerRating.toFixed(1)}/5` : '—', label: t('rating') },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                <s.icon className="mx-auto mb-1.5 h-4 w-4 text-amber-300/60" />
                <p className="text-sm font-light text-white/80">{s.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/30">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-transparent p-5">
            <div>
              <span className="text-xs uppercase tracking-wider text-white/30">{t('price')}</span>
              <p className="text-3xl font-light tracking-tight text-white">
                {car.price != null ? formatPrice(car.price, lang) : '—'}
              </p>
              {(car.transmission || car.fuelType) && (
                <p className="mt-1 text-xs font-light text-white/40">
                  {[car.transmission, car.fuelType].filter((v): v is string => Boolean(v)).map((v) => translateOption(lang, v)).join(' · ')}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 ${
                analysisScore >= 85
                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                  : analysisScore >= 65
                  ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
                  : 'border-red-400/20 bg-red-400/10 text-red-300'
              }`}>
                <ShieldCheck className="h-5 w-5" />
                <div>
                  <p className="text-lg font-medium leading-none">{analysisScore}%</p>
                  <p className="text-[10px] uppercase tracking-wider opacity-70">
                    {lang === 'fr' ? "Score d'analyse" : 'Analysis score'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {car.sellerType === 'Professionnel' ? (
                  <Store className="h-4 w-4 text-sky-300" />
                ) : (
                  <User className="h-4 w-4 text-amber-300" />
                )}
                <span className="text-sm font-light text-white/80">{car.seller || t('sellerUnknown')}</span>
                {car.sellerType && (
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                    car.sellerType === 'Professionnel' ? 'bg-sky-400/10 text-sky-300' : 'bg-amber-400/10 text-amber-300'
                  }`}>
                    {car.sellerType === 'Professionnel' ? t('pro') : t('private')}
                  </span>
                )}
              </div>
              {car.sellerRating != null && (
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                  <span className="text-sm font-light text-white/70">{car.sellerRating.toFixed(1)}/5</span>
                </div>
              )}
            </div>
            {(car.sellerPhone || car.sellerEmail) && (
              <div className="grid grid-cols-2 gap-3">
                {car.sellerPhone && (
                  <div className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                    <Phone className="h-4 w-4 shrink-0 text-white/30" />
                    <span className="truncate text-sm font-light text-white/70">{car.sellerPhone}</span>
                  </div>
                )}
                {car.sellerEmail && (
                  <div className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                    <Mail className="h-4 w-4 shrink-0 text-white/30" />
                    <span className="truncate text-sm font-light text-white/70">{car.sellerEmail}</span>
                  </div>
                )}
              </div>
            )}
            {car.listingUrl && (
              <a href={car.listingUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm font-light text-amber-200 transition-all hover:bg-amber-400/20">
                <ExternalLink className="h-4 w-4" />
                {t('seeListingOn')} {car.listingSource || t('externalSite')}
              </a>
            )}
          </div>

          {car.notes && (
            <div className="rounded-xl border border-amber-400/10 bg-amber-400/[0.03] p-5">
              <div className="mb-2 flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-amber-300/70" />
                <h3 className="text-xs uppercase tracking-[0.15em] text-white/40">{t('personalNotes')}</h3>
              </div>
              <p className="text-sm font-light leading-relaxed text-white/60">{car.notes}</p>
            </div>
          )}

          <div>
            <h3 className="mb-3 text-xs uppercase tracking-[0.15em] text-white/30">{t('detectedOptions')}</h3>
            {car.options.length === 0 && (
              <p className="text-xs font-light leading-relaxed text-white/30">{t('optionsNoneDetected')}</p>
            )}
            <div className="space-y-2">
              {car.options.map((opt) => {
                const Icon = optionIcons[opt.key] || Zap;
                return (
                  <div key={opt.key} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-all ${opt.present ? 'border-emerald-400/20 bg-emerald-400/[0.04]' : 'border-white/5 bg-white/[0.01]'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-md ${opt.present ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-white/25'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={`text-sm font-light ${opt.present ? 'text-white/90' : 'text-white/40'}`}>{translateOptionLabel(lang, opt.key, opt.label)}</span>
                    </div>
                    {opt.present ? <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15"><Check className="h-3 w-3 text-emerald-300" /></div> : <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5"><X className="h-3 w-3 text-white/25" /></div>}
                  </div>
                );
              })}
            </div>
          </div>

          {car.valueAnalysis && (
            <div>
              <h3 className="mb-3 text-xs uppercase tracking-[0.15em] text-white/30">{t('valueAnalysis')}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.15em] text-white/30">{t('retentionScore')}</span>
                    <span className="line-clamp-2 max-w-[55%] shrink-0 text-right text-[10px] font-light leading-snug text-white/50">
                      {t('rarity')}: {car.valueAnalysis.rarityLabel}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-light tracking-tight text-white">{car.valueAnalysis.retentionScore}</span>
                    <span className="text-lg font-light text-white/30">/10</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${car.valueAnalysis.retentionScore >= 8 ? 'from-emerald-400 to-emerald-500' : car.valueAnalysis.retentionScore >= 6 ? 'from-amber-400 to-amber-500' : 'from-red-400 to-red-500'} transition-all duration-700`}
                      style={{ width: `${(car.valueAnalysis.retentionScore / 10) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <span className="mb-3 block text-xs uppercase tracking-[0.15em] text-white/30">{t('futureTrend')}</span>
                  <TrendBadge trend={car.valueAnalysis.trend} label={car.valueAnalysis.trendLabel} />
                  <p className="mt-3 text-xs font-light leading-relaxed text-white/40">
                    {car.valueAnalysis.trend === 'up' ? t('trendUpDesc') : car.valueAnalysis.trend === 'stable' ? t('trendStableDesc') : t('trendDownDesc')}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-5"><p className="mb-3 text-xs uppercase tracking-[0.15em] text-white/30">{t('speculationFactors')}</p><ul className="space-y-2">{car.valueAnalysis.factors.map((factor, i) => <li key={i} className="flex items-start gap-2.5"><div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" /><span className="text-sm font-light leading-relaxed text-white/55">{factor}</span></li>)}</ul></div>
            </div>
          )}

          {car.historyHighlights != null && car.historyHighlights.length > 0 && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5">
              <div className="mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-300" />
                <span className="text-xs uppercase tracking-[0.15em] text-emerald-300/80">{t('historyHighlightsTitle')}</span>
              </div>
              <ul className="space-y-2">
                {car.historyHighlights.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                    <span className="text-sm font-light leading-relaxed text-white/70">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="mb-3 text-xs uppercase tracking-[0.15em] text-white/30">{t('expertOpinion')}</h3>
            {car.vigilancePoints.length === 0 ? (
              <p className="text-xs font-light leading-relaxed text-white/30">{t('vigilanceNotAnalyzedYet')}</p>
            ) : (
              <div className="space-y-2.5">{car.vigilancePoints.map((p, i) => <VigilanceCard key={i} point={p} />)}</div>
            )}

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDownIcon className="h-4 w-4 text-amber-300" />
                  <span className="text-sm font-light text-white/80">{t('realisticPrice')}</span>
                </div>
                {realisticPrice != null && <span className="text-lg font-light text-amber-300">{formatPrice(realisticPrice, lang)}</span>}
              </div>
              {realisticPrice != null && car.price != null && discount != null && discountPct != null ? (
                <>
                  <div className="flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-2">
                    <span className="text-xs font-light text-amber-200/80">
                      {t('negotiationMargin')}: <span className="font-medium text-amber-200">{discount >= 0 ? '-' : '+'}{formatPrice(Math.abs(discount), lang)}</span> ({Math.abs(discountPct)}%)
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] font-light leading-relaxed text-white/30">
                    {car.valueAnalysis?.priceRationale || t('realisticPriceExplanation')}
                  </p>
                </>
              ) : (
                <p className="text-xs font-light text-white/30">{t('projectionUnavailable')}</p>
              )}

              <div className="mt-5 border-t border-white/5 pt-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-300" />
                <span className="text-sm font-light text-white/80">{t('valueProjectionTitle')}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cdProjectionYears" className="mb-1.5 block text-[11px] font-light uppercase tracking-wider text-white/30">{t('projectionYears')}</label>
                  <input
                    id="cdProjectionYears"
                    type="number"
                    min={0}
                    max={30}
                    value={projectionYears}
                    onChange={(e) => { const n = Number(e.target.value); setProjectionYears(Number.isFinite(n) ? Math.max(0, n) : 0); }}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-light text-white outline-none transition-colors focus:border-amber-400/40"
                  />
                </div>
                <div>
                  <label htmlFor="cdProjectionKm" className="mb-1.5 block text-[11px] font-light uppercase tracking-wider text-white/30">{t('projectionKmPerYear')}</label>
                  <input
                    id="cdProjectionKm"
                    type="number"
                    min={0}
                    step={1000}
                    value={projectionKmPerYear}
                    onChange={(e) => { const n = Number(e.target.value); setProjectionKmPerYear(Number.isFinite(n) ? Math.max(0, n) : 0); }}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-light text-white outline-none transition-colors focus:border-amber-400/40"
                  />
                </div>
              </div>
              {valueProjection ? (
                <div className="mt-4 flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5">
                  <span className="text-xs font-light text-white/50">{t('projectedValueLabel')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{formatPrice(valueProjection.projectedValue, lang)}</span>
                    <span className={`flex items-center gap-1 text-xs font-light ${valueProjection.deltaAbsolute < 0 ? 'text-red-300' : valueProjection.deltaAbsolute > 0 ? 'text-emerald-300' : 'text-white/40'}`}>
                      {valueProjection.deltaAbsolute < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : valueProjection.deltaAbsolute > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                      {valueProjection.deltaPct > 0 ? '+' : ''}{valueProjection.deltaPct}%
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-xs font-light text-white/30">{t('projectionUnavailable')}</p>
              )}
              <p className="mt-3 text-[11px] font-light leading-relaxed text-white/25">{t('projectionDisclaimer')}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-3 text-xs uppercase tracking-[0.15em] text-white/30">
                {t('negotiationArgsTitle')}{car.negotiationArguments.length > 0 ? ` (${car.negotiationArguments.length})` : ''}
              </p>
              {car.negotiationArguments.length === 0 ? (
                <p className="text-xs font-light leading-relaxed text-white/30">{t('negotiationArgsNone')}</p>
              ) : (
                <div className="space-y-2">{car.negotiationArguments.map((arg, i) => <div key={i} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"><div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-xs font-medium text-amber-300">{i + 1}</div><p className="text-sm font-light leading-relaxed text-white/60">{arg}</p></div>)}</div>
              )}
            </div>
          </div>

          <button onClick={handleShare} className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-amber-300 to-amber-400 px-8 py-4 text-sm font-medium tracking-wide text-[#0a0a0a] shadow-lg shadow-amber-500/10 transition-all hover:shadow-amber-500/20 hover:brightness-110 active:scale-[0.98]">
            <span className="relative z-10 flex items-center justify-center gap-2.5"><Share2 className="h-4 w-4" />{shared ? t('shared') : t('shareToPartner')}</span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </button>
        </div>
      </div>
    </>
  );
}
