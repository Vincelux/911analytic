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
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
} from 'lucide-react';
import type { PricePoint, ValueAnalysisData } from './data';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR').format(price) + ' €';
}

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
      <p className="text-sm font-medium text-amber-300">{formatPrice(data.price)}</p>
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

function RetentionGauge({ score, label }: { score: number; label: string }) {
  const pct = (score / 10) * 100;
  const color =
    score >= 8 ? 'from-emerald-400 to-emerald-500' : score >= 6 ? 'from-amber-400 to-amber-500' : 'from-red-400 to-red-500';
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.15em] text-white/30">Score de rétention</span>
        <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-light text-white/50">
          Rareté: {label}
        </span>
      </div>
      <div className="flex items-end gap-4">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-light tracking-tight text-white">{score}</span>
          <span className="text-lg font-light text-white/30">/10</span>
        </div>
        <div className="flex-1 pb-2">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ValueAnalysisProps {
  priceHistory: PricePoint[];
  analysis: ValueAnalysisData;
  accent: 'amber' | 'sky';
}

export default function ValueAnalysis({ priceHistory, analysis, accent }: ValueAnalysisProps) {
  const accentColor = accent === 'amber' ? '#fbbf24' : '#38bdf8';
  const gradientId = accent === 'amber' ? 'priceGradAmber' : 'priceGradSky';

  return (
    <div className="space-y-4">
      {/* Line chart */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className={`h-4 w-4 ${accent === 'amber' ? 'text-amber-300' : 'text-sky-300'}`} />
          <h4 className="text-sm font-light tracking-[0.1em] text-white/80">COTE HISTORIQUE</h4>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
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
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: accentColor, strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="price"
                stroke={accentColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={{ fill: accentColor, r: 2, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: accentColor, stroke: '#0a0a0a', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Retention score + trend */}
      <div className="grid gap-4 sm:grid-cols-2">
        <RetentionGauge score={analysis.retentionScore} label={analysis.rarityLabel} />
        <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <span className="mb-3 text-xs uppercase tracking-[0.15em] text-white/30">Tendance future</span>
          <TrendBadge trend={analysis.trend} label={analysis.trendLabel} />
          <p className="mt-3 text-sm font-light leading-relaxed text-white/40">
            {analysis.trend === 'up'
              ? 'La cote de ce modèle est orientée à la hausse. L\'achat actuel peut générer une plus-value à moyen terme.'
              : analysis.trend === 'stable'
              ? 'La cote de ce modèle s\'est stabilisée. Risque de décote résiduelle faible, valeur préservée.'
              : 'La cote de ce modèle continue de décroître. Prudence sur la valeur de revente.'}
          </p>
        </div>
      </div>

      {/* Speculation factors */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <p className="mb-3 text-xs uppercase tracking-[0.15em] text-white/30">Facteurs clés de spéculation</p>
        <ul className="space-y-2">
          {analysis.factors.map((factor, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <div
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  accent === 'amber' ? 'bg-amber-400' : 'bg-sky-400'
                }`}
              />
              <span className="text-sm font-light leading-relaxed text-white/55">{factor}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
