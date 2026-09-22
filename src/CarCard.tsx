import { Star, ShieldCheck, Gauge, Calendar, MapPin, Store, User, Car as CarIcon } from 'lucide-react';
import type { CarListing } from './data';
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

interface CarCardProps {
  car: CarListing;
  isSelected: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
  lang: Lang;
}

export default function CarCard({ car, isSelected, onToggleSelect, onClick, lang }: CarCardProps) {
  const t = getT(lang);

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent transition-all duration-300 hover:border-amber-400/30 hover:shadow-2xl"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {car.image ? (
          <img
            src={car.image}
            alt={car.model ?? ''}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/[0.03]">
            <CarIcon className="h-10 w-10 text-white/15" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />

        {/* Country flag + Porsche Approved */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {car.country && (
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2 py-1 backdrop-blur-md">
              <span className="text-sm leading-none">{(car.countryFlag && flagEmoji[car.countryFlag]) || '🇪🇺'}</span>
              <span className="text-[10px] font-light text-white/70">{car.country}</span>
            </div>
          )}
          {car.porscheApproved && (
            <div className="flex items-center gap-1.5 rounded-lg border border-sky-400/20 bg-sky-950/60 px-2 py-1 backdrop-blur-md">
              <ShieldCheck className="h-3 w-3 text-sky-300" />
              <span className="text-[10px] font-medium text-sky-300">Porsche Approved</span>
            </div>
          )}
        </div>

        {/* Checkbox */}
        <div className="absolute bottom-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onToggleSelect}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-light backdrop-blur-md transition-all ${
              isSelected
                ? 'border-amber-400/40 bg-amber-400/20 text-amber-200'
                : 'border-white/15 bg-black/40 text-white/60 hover:border-white/30 hover:text-white/90'
            }`}
          >
            <div
              className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                isSelected ? 'border-amber-300 bg-amber-400' : 'border-white/30 bg-transparent'
              }`}
            >
              {isSelected && (
                <svg className="h-3 w-3 text-[#0a0a0a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span>{isSelected ? t('selected') : t('addToComparator')}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-lg font-light tracking-wide text-white">{car.model || t('untitledListing')}</h3>
          <p className="text-xs font-light text-white/40">
            {[car.generation, car.phase, car.year].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-light text-white/50">
          {car.mileage != null && (
            <span className="flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-white/30" />
              {formatMileage(car.mileage, lang)}
            </span>
          )}
          {car.year != null && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-white/30" />
              {car.year}
            </span>
          )}
          {car.city && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-white/30" />
              {car.city}
            </span>
          )}
        </div>

        {/* Seller info row */}
        <div className="mb-3 flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
          <div className="flex items-center gap-2">
            {car.sellerType === 'Professionnel' ? (
              <Store className="h-3.5 w-3.5 text-sky-300/70" />
            ) : (
              <User className="h-3.5 w-3.5 text-amber-300/70" />
            )}
            <span className="text-xs font-light text-white/70">{car.seller || t('sellerUnknown')}</span>
            {car.sellerType && (
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                car.sellerType === 'Professionnel'
                  ? 'bg-sky-400/10 text-sky-300/80'
                  : 'bg-amber-400/10 text-amber-300/80'
              }`}>
                {car.sellerType === 'Professionnel' ? t('pro') : t('private')}
              </span>
            )}
          </div>
          {car.sellerRating != null && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
              <span className="text-xs font-light text-white/60">{car.sellerRating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/30">{t('price')}</span>
            <p className="text-xl font-light tracking-tight text-white">
              {car.price != null ? formatPrice(car.price, lang) : '—'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-white/30">{car.transmission || '—'}</span>
            <p className="text-xs font-light text-white/50">{car.power != null ? `${car.power} ch` : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
