import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  X,
  Check,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
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
} from 'lucide-react';
import type { CarListing, PricePoint, ValueAnalysisData, VigilancePoint } from './data';
import { type Lang, getT } from './i18n';

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
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PricePoint }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-amber-400/20 bg-[#111111] px-3.5 py-2.5 shadow-2xl">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{data.year}</p>
      <p className="text-sm font-medium text-amber-300">{formatPrice(data.price, 'fr')}</p>
    </div>
  );
}

function TrendBadge({ trend, label }: { trend: ValueAnalysisData['trend']; label: string }) {
  const config = {
    up: { icon: TrendingUp, color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
    stable: { icon: Minus, color: 'text-sky-300 bg-sky-400/10 border-sky-400/20' },
    down: { icon: TrendingDown, color: 'text-red-300 bg-red-400/10 border-red-400/20' },
  }[trend];
  const Icon = config.icon;
  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 ${config.color}`}>
      <Icon className="h-4 w-4" />
      <span className="text-xs font-medium tracking-wide">{label}</span>
    </div>
  );
}

function VigilanceCard({ point }: { point: VigilancePoint }) {
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
}

export default function CarDetail({ car, lang, onClose }: CarDetailProps) {
  const [shared, setShared] = useState(false);
  const t = getT(lang);

  const realisticPrice = Math.round(car.price * 0.88);
  const discount = car.price - realisticPrice;
  const discountPct = Math.round((discount / car.price) * 100);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#0d0d0d] shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="sticky top-4 z-10 ml-auto mr-4 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 backdrop-blur-md transition-all hover:border-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Hero image */}
        <div className="relative h-64 -mt-13 overflow-hidden">
          <img src={car.image} alt={car.model} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-md bg-amber-400/15 px-2.5 py-1 text-xs font-medium text-amber-300">
                {car.generation} · {car.phase}
              </span>
              <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white/70 backdrop-blur-md">
                {flagEmoji[car.countryFlag]} {car.country}
              </span>
            </div>
            <h2 className="text-2xl font-light tracking-wide text-white">{car.model}</h2>
            <p className="text-sm font-light text-white/50">{car.city} · {car.seller}</p>
          </div>
        </div>

        <div className="space-y-8 p-6">
          {/* Key stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Calendar, value: car.year.toString(), label: t('year') },
              { icon: Gauge, value: formatMileage(car.mileage, lang), label: t('km') },
              { icon: Zap, value: `${car.power} ch`, label: t('power') },
              { icon: Star, value: `${car.sellerRating.toFixed(1)}/5`, label: t('rating') },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                <s.icon className="mx-auto mb-1.5 h-4 w-4 text-amber-300/60" />
                <p className="text-sm font-light text-white/80">{s.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/30">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Price + conformity */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-transparent p-5">
            <div>
              <span className="text-xs uppercase tracking-wider text-white/30">{t('price')}</span>
              <p className="text-3xl font-light tracking-tight text-white">{formatPrice(car.price, lang)}</p>
              <p className="mt-1 text-xs font-light text-white/40">{car.transmission} · {car.fuelType}</p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 ${
                car.conformity >= 85
                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                  : car.conformity >= 65
                  ? 'border-amber-400/20 bg-amber-400/10 text-amber-300'
                  : 'border-red-400/20 bg-red-400/10 text-red-300'
              }`}>
                <ShieldCheck className="h-5 w-5" />
                <div>
                  <p className="text-lg font-medium leading-none">{car.conformity}%</p>
                  <p className="text-[10px] uppercase tracking-wider opacity-70">{t('conformityAI')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Seller contact */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {car.sellerType === 'Professionnel' ? (
                  <Store className="h-4 w-4 text-sky-300" />
                ) : (
                  <User className="h-4 w-4 text-amber-300" />
                )}
                <span className="text-sm font-light text-white/80">{car.seller}</span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                  car.sellerType === 'Professionnel'
                    ? 'bg-sky-400/10 text-sky-300'
                    : 'bg-amber-400/10 text-amber-300'
                }`}>
                  {car.sellerType === 'Professionnel' ? t('pro') : t('private')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                <span className="text-sm font-light text-white/70">{car.sellerRating.toFixed(1)}/5</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                <Phone className="h-4 w-4 shrink-0 text-white/30" />
                <span className="truncate text-sm font-light text-white/70">{car.sellerPhone}</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                <Mail className="h-4 w-4 shrink-0 text-white/30" />
                <span className="truncate text-sm font-light text-white/70">{car.sellerEmail}</span>
              </div>
            </div>
            <a
              href={car.listingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm font-light text-amber-200 transition-all hover:bg-amber-400/20"
            >
              <ExternalLink className="h-4 w-4" />
              {t('seeListingOn')} {car.listingSource}
            </a>
          </div>

          {/* Options detected */}
          <div>
            <h3 className="mb-3 text-xs uppercase tracking-[0.15em] text-white/30">{t('detectedOptions')}</h3>
            <div className="space-y-2">
              {car.options.map((opt) => {
                const Icon = optionIcons[opt.key] || Zap;
                return (
                  <div
                    key={opt.key}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-all ${
                      opt.present
                        ? 'border-emerald-400/20 bg-emerald-400/[0.04]'
                        : 'border-white/5 bg-white/[0.01]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-md ${opt.present ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-white/25'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={`text-sm font-light ${opt.present ? 'text-white/90' : 'text-white/40'}`}>{opt.label}</span>
                    </div>
                    {opt.present ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15">
                        <Check className="h-3 w-3 text-emerald-300" />
                      </div>
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/5">
                        <X className="h-3 w-3 text-white/25" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Value analysis */}
          <div>
            <h3 className="mb-3 text-xs uppercase tracking-[0.15em] text-white/30">{t('valueAnalysis')}</h3>

            {/* Line chart */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-5">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <h4 className="text-sm font-light tracking-[0.1em] text-white/80">{t('priceHistory')}</h4>
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={car.priceHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="detailPriceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 300 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                      tickLine={false}
                      interval={1}
                    />
                    <YAxis
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 300 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v / 1000}k`}
                      width={35}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#fbbf24', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#fbbf24"
                      strokeWidth={2}
                      fill="url(#detailPriceGrad)"
                      dot={{ fill: '#fbbf24', r: 2, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#fbbf24', stroke: '#0a0a0a', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Retention + trend */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.15em] text-white/30">{t('retentionScore')}</span>
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-light text-white/50">
                    {t('rarity')}: {car.valueAnalysis.rarityLabel}
                  </span>
                </div>
                <div className="flex items-end gap-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-light tracking-tight text-white">{car.valueAnalysis.retentionScore}</span>
                    <span className="text-lg font-light text-white/30">/10</span>
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${
                          car.valueAnalysis.retentionScore >= 8
                            ? 'from-emerald-400 to-emerald-500'
                            : car.valueAnalysis.retentionScore >= 6
                            ? 'from-amber-400 to-amber-500'
                            : 'from-red-400 to-red-500'
                        } transition-all duration-700`}
                        style={{ width: `${(car.valueAnalysis.retentionScore / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <span className="mb-3 text-xs uppercase tracking-[0.15em] text-white/30">{t('futureTrend')}</span>
                <TrendBadge trend={car.valueAnalysis.trend} label={car.valueAnalysis.trendLabel} />
                <p className="mt-3 text-sm font-light leading-relaxed text-white/40">
                  {car.valueAnalysis.trend === 'up'
                    ? t('trendUpDesc')
                    : car.valueAnalysis.trend === 'stable'
                    ? t('trendStableDesc')
                    : t('trendDownDesc')}
                </p>
              </div>
            </div>

            {/* Speculation factors */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <p className="mb-3 text-xs uppercase tracking-[0.15em] text-white/30">{t('speculationFactors')}</p>
              <ul className="space-y-2">
                {car.valueAnalysis.factors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <span className="text-sm font-light leading-relaxed text-white/55">{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Expert AI */}
          <div>
            <h3 className="mb-3 text-xs uppercase tracking-[0.15em] text-white/30">{t('expertOpinion')}</h3>

            {/* Vigilance points */}
            <div className="space-y-2.5">
              {car.vigilancePoints.map((p, i) => (
                <VigilanceCard key={i} point={p} />
              ))}
            </div>

            {/* Negotiation slider */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDownIcon className="h-4 w-4 text-amber-300" />
                  <span className="text-sm font-light text-white/80">{t('realisticPrice')}</span>
                </div>
                <span className="text-lg font-light text-amber-300">{formatPrice(realisticPrice, lang)}</span>
              </div>
              <div className="relative mb-2 h-2 rounded-full bg-white/10">
                <div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-amber-400/40 to-amber-400/80" style={{ width: '88%' }} />
                <div className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-300 bg-[#0a0a0a] shadow-lg" style={{ left: '88%' }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-light text-white/30">{formatPrice(car.price, lang)}</span>
                <span className="font-light text-white/30">{formatPrice(Math.round(car.price * 1.1), lang)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-2">
                <span className="text-xs font-light text-amber-200/80">
                  {t('negotiationMargin')}: <span className="font-medium text-amber-200">-{formatPrice(discount, lang)}</span> ({discountPct}%)
                </span>
              </div>
            </div>

            {/* Negotiation arguments */}
            <div className="mt-4">
              <p className="mb-3 text-xs uppercase tracking-[0.15em] text-white/30">{t('negotiationArgs')}</p>
              <div className="space-y-2">
                {car.negotiationArguments.map((arg, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-xs font-medium text-amber-300">
                      {i + 1}
                    </div>
                    <p className="text-sm font-light leading-relaxed text-white/60">{arg}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Share button */}
          <button
            onClick={() => setShared(true)}
            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-amber-300 to-amber-400 px-8 py-4 text-sm font-medium tracking-wide text-[#0a0a0a] shadow-lg shadow-amber-500/10 transition-all hover:shadow-amber-500/20 hover:brightness-110 active:scale-[0.98]"
          >
            <span className="relative z-10 flex items-center justify-center gap-2.5">
              <Share2 className="h-4 w-4" />
              {shared ? t('shared') : t('shareToPartner')}
            </span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </button>
        </div>
      </div>
    </>
  );
}
