import { useState } from 'react';
import { X, LogOut, Plus, Save, AlertCircle, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import {
  generations,
  fuelTypes,
  transmissions,
  countryFlagCodes,
  allOptions,
  type CarListing,
  type OptionKey,
} from './data';
import { type Lang, getT, translateOptionLabel } from './i18n';
import { useAuth } from './lib/auth';
import { insertListing, updateListing, type ListingInput } from './listingsRepository';
import { extractListing, type ExtractionResult } from './lib/extraction';
import { requestListingAnalysis } from './lib/analyzeListing';
import { normalizeUrl } from './lib/url';
import { textInputClass, labelClass } from './lib/formStyles';
import LoginForm from './LoginForm';

interface AddListingDrawerProps {
  lang: Lang;
  onClose: () => void;
  onAdded: (listing: CarListing) => void;
  onUpdated?: (listing: CarListing) => void;
  /** When set, the drawer edits this listing instead of creating a new one. */
  editingListing?: CarListing;
}

const countryOptions = Object.keys(countryFlagCodes);
const sellerTypeOptions = ['Professionnel', 'Particulier'] as const;

interface FormState {
  model: string;
  generation: string;
  phase: string;
  image: string;
  price: string;
  mileage: string;
  year: string;
  power: string;
  fuelType: string;
  transmission: string;
  country: string;
  city: string;
  seller: string;
  sellerType: string;
  sellerRating: string;
  sellerPhone: string;
  sellerEmail: string;
  listingUrl: string;
  listingSource: string;
  notes: string;
}

const emptyForm: FormState = {
  model: '', generation: '', phase: '', image: '', price: '', mileage: '', year: '', power: '',
  fuelType: '', transmission: '', country: '', city: '', seller: '', sellerType: '',
  sellerRating: '', sellerPhone: '', sellerEmail: '', listingUrl: '', listingSource: '', notes: '',
};

function formFromListing(car: CarListing): FormState {
  return {
    model: car.model ?? '',
    generation: car.generation ?? '',
    phase: car.phase ?? '',
    image: car.image ?? '',
    price: car.price != null ? String(car.price) : '',
    mileage: car.mileage != null ? String(car.mileage) : '',
    year: car.year != null ? String(car.year) : '',
    power: car.power != null ? String(car.power) : '',
    fuelType: car.fuelType ?? '',
    transmission: car.transmission ?? '',
    country: car.country ?? '',
    city: car.city ?? '',
    seller: car.seller ?? '',
    sellerType: car.sellerType ?? '',
    sellerRating: car.sellerRating != null ? String(car.sellerRating) : '',
    sellerPhone: car.sellerPhone ?? '',
    sellerEmail: car.sellerEmail ?? '',
    listingUrl: car.listingUrl ?? '',
    listingSource: car.listingSource ?? '',
    notes: car.notes ?? '',
  };
}

function matchOption(value: string | undefined, options: readonly string[]): string {
  if (!value) return '';
  return options.find((o) => o.toLowerCase() === value.toLowerCase()) ?? '';
}

const optionKeys = allOptions.map((o) => o.key);
function isOptionKey(value: string): value is OptionKey {
  return (optionKeys as string[]).includes(value);
}

function ListingForm({
  lang,
  onAdded,
  onUpdated,
  onClose,
  editingListing,
}: {
  lang: Lang;
  onAdded: (listing: CarListing) => void;
  onUpdated?: (listing: CarListing) => void;
  onClose: () => void;
  editingListing?: CarListing;
}) {
  const t = getT(lang);
  const { user, signOut } = useAuth();
  const isEditing = !!editingListing;
  const [form, setForm] = useState<FormState>(editingListing ? formFromListing(editingListing) : emptyForm);
  const [touched, setTouched] = useState<Set<keyof FormState>>(new Set());
  const [selectedOptions, setSelectedOptions] = useState<Set<OptionKey>>(
    new Set(editingListing?.options.filter((o) => o.present).map((o) => o.key) ?? [])
  );
  const [optionsTouched, setOptionsTouched] = useState(false);
  const [pasteText, setPasteText] = useState(editingListing?.sellerDescription ?? '');
  const [pasteTextTouched, setPasteTextTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionNote, setExtractionNote] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => new Set(prev).add(key));
  };

  const toggleOption = (key: OptionKey) => {
    setOptionsTouched(true);
    setSelectedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExtract = async () => {
    if (!form.listingUrl.trim() && !pasteText.trim()) return;
    setExtracting(true);
    setExtractionNote(null);
    setError(null);
    try {
      const result: ExtractionResult = await extractListing(form.listingUrl.trim(), pasteText.trim());
      setForm((prev) => {
        const next = { ...prev };
        const maybeSet = (key: keyof FormState, value: string | undefined) => {
          if (!value || touched.has(key) || next[key].trim() !== '') return;
          next[key] = value;
        };
        maybeSet('model', result.model);
        maybeSet('image', result.imageUrl);
        maybeSet('generation', matchOption(result.generation, generations) || undefined);
        maybeSet('phase', result.phase);
        maybeSet('price', result.price != null ? String(Math.round(result.price)) : undefined);
        maybeSet('mileage', result.mileage != null ? String(Math.round(result.mileage)) : undefined);
        maybeSet('year', result.year != null ? String(Math.round(result.year)) : undefined);
        maybeSet('power', result.power != null ? String(Math.round(result.power)) : undefined);
        maybeSet('fuelType', matchOption(result.fuelType, fuelTypes) || undefined);
        maybeSet('transmission', matchOption(result.transmission, transmissions) || undefined);
        maybeSet('country', matchOption(result.country, countryOptions) || undefined);
        maybeSet('city', result.city);
        maybeSet('seller', result.seller);
        maybeSet('sellerType', matchOption(result.sellerType, sellerTypeOptions) || undefined);
        maybeSet('sellerPhone', result.sellerPhone);
        maybeSet('sellerEmail', result.sellerEmail);
        maybeSet('listingSource', result.listingSource);
        return next;
      });
      if (!optionsTouched && result.options?.length) {
        setSelectedOptions((prev) => new Set([...prev, ...result.options!.filter(isOptionKey)]));
      }
      if (!pasteTextTouched && !pasteText.trim() && result.sellerDescriptionExcerpt) {
        setPasteText(result.sellerDescriptionExcerpt);
      }
      if (result.urlBlockedReason) {
        setExtractionNote(t('extractionUrlBlocked'));
      } else if (result.urlFetched === false && !pasteText.trim()) {
        setExtractionNote(t('extractionNothingToAnalyze'));
      } else {
        setExtractionNote(t('extractionDone'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('extractionError'));
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const hasAnyValue = Object.values(form).some((v) => v.trim() !== '');
    if (!hasAnyValue) {
      setError(t('addListingEmptyError'));
      return;
    }

    let normalizedUrl: string | null = null;
    if (form.listingUrl.trim()) {
      normalizedUrl = normalizeUrl(form.listingUrl);
      if (!normalizedUrl) {
        setError(t('addListingInvalidUrlError'));
        return;
      }
    }

    const patch: ListingInput = {
      model: form.model.trim() || null,
      generation: form.generation || null,
      phase: form.phase.trim() || null,
      image: form.image.trim() || null,
      price: form.price.trim() ? Math.round(Number(form.price)) : null,
      mileage: form.mileage.trim() ? Math.round(Number(form.mileage)) : null,
      year: form.year.trim() ? Math.round(Number(form.year)) : null,
      power: form.power.trim() ? Math.round(Number(form.power)) : null,
      fuelType: form.fuelType || null,
      transmission: form.transmission || null,
      country: form.country || null,
      countryFlag: form.country ? countryFlagCodes[form.country] ?? null : null,
      city: form.city.trim() || null,
      seller: form.seller.trim() || null,
      sellerType: (form.sellerType || null) as CarListing['sellerType'] | null,
      sellerRating: form.sellerRating.trim() ? Number(form.sellerRating) : null,
      sellerPhone: form.sellerPhone.trim() || null,
      sellerEmail: form.sellerEmail.trim() || null,
      listingUrl: normalizedUrl,
      listingSource: form.listingSource.trim() || null,
      notes: form.notes.trim() || null,
      sellerDescription: pasteText.trim() || null,
      options: allOptions
        .filter((o) => selectedOptions.has(o.key))
        .map((o) => ({ key: o.key, label: o.label, present: true })),
    };

    setSubmitting(true);
    try {
      let listing: CarListing;
      if (isEditing && editingListing) {
        listing = await updateListing(editingListing.id, patch);
        onUpdated?.(listing);
      } else {
        listing = await insertListing(patch);
        onAdded(listing);
        setForm(emptyForm);
        setTouched(new Set());
        setSelectedOptions(new Set());
        setOptionsTouched(false);
        setPasteText('');
        setPasteTextTouched(false);
      }
      setSuccess(true);
      // Fire-and-forget: refresh the AI analysis in the background so vigilance
      // points / negotiation arguments / AI price estimate stay current without
      // needing the manual batch job. A failure here doesn't affect the save —
      // the listing just keeps showing its previous (or empty) analysis state.
      requestListingAnalysis(listing.id)
        .then((analysis) => onUpdated?.({ ...listing, ...analysis }))
        .catch((err) => console.warn('[911analytics] analyse IA différée échouée:', err));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('addListingGenericError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
        <span className="truncate text-xs font-light text-white/50">
          {t('loggedInAs')} <span className="text-white/70">{user?.email}</span>
        </span>
        <button
          onClick={() => void signOut()}
          className="flex shrink-0 items-center gap-1.5 text-xs font-light text-white/40 hover:text-white/70"
        >
          <LogOut className="h-3.5 w-3.5" />
          {t('logout')}
        </button>
      </div>

      <p className="mb-4 text-xs font-light leading-relaxed text-white/40">{t('addListingDesc')}</p>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label htmlFor="alListingUrl" className={labelClass}>{t('fieldListingUrl')}</label>
            <input id="alListingUrl" type="text" inputMode="url" value={form.listingUrl} onChange={(e) => update('listingUrl', e.target.value)} placeholder="https://…" className={textInputClass} />
          </div>
          <div className="col-span-2">
            <label htmlFor="alPasteText" className={labelClass}>{t('fieldPasteText')}</label>
            <textarea
              id="alPasteText"
              rows={4}
              value={pasteText}
              onChange={(e) => { setPasteText(e.target.value); setPasteTextTouched(true); }}
              placeholder={t('fieldPasteTextPlaceholder')}
              className={textInputClass}
            />
            <p className="mt-1.5 text-[11px] font-light leading-relaxed text-white/30">{t('pasteTextKeptNote')}</p>
          </div>
          <div className="col-span-2">
            <button
              type="button"
              onClick={() => void handleExtract()}
              disabled={extracting || (!form.listingUrl.trim() && !pasteText.trim())}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs font-medium text-amber-200 transition-all hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t('extractionButton')}
            </button>
            {extractionNote && (
              <p className="mt-2 text-[11px] font-light leading-relaxed text-amber-200/70">{extractionNote}</p>
            )}
          </div>

          <div className="col-span-2 border-t border-white/5 pt-3" />

          <div className="col-span-2">
            <label htmlFor="alModel" className={labelClass}>{t('fieldModel')}</label>
            <input id="alModel" type="text" value={form.model} onChange={(e) => update('model', e.target.value)} placeholder={t('fieldModelPlaceholder')} className={textInputClass} />
          </div>
          <div className="col-span-2">
            <label htmlFor="alImage" className={labelClass}>{t('fieldImage')}</label>
            <div className="flex items-center gap-3">
              {form.image.trim() && (
                <img
                  src={form.image}
                  alt=""
                  className="h-12 w-16 shrink-0 rounded-md border border-white/10 object-cover"
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                />
              )}
              <input id="alImage" type="text" inputMode="url" value={form.image} onChange={(e) => update('image', e.target.value)} placeholder={t('fieldImagePlaceholder')} className={textInputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="alGeneration" className={labelClass}>{t('fieldGeneration')}</label>
            <select id="alGeneration" value={form.generation} onChange={(e) => update('generation', e.target.value)} className={textInputClass}>
              <option value="">—</option>
              {generations.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="alPhase" className={labelClass}>{t('fieldPhase')}</label>
            <input id="alPhase" type="text" value={form.phase} onChange={(e) => update('phase', e.target.value)} placeholder={t('fieldPhasePlaceholder')} className={textInputClass} />
          </div>
          <div>
            <label htmlFor="alPrice" className={labelClass}>{t('fieldPrice')}</label>
            <input id="alPrice" type="number" min={0} value={form.price} onChange={(e) => update('price', e.target.value)} className={textInputClass} />
          </div>
          <div>
            <label htmlFor="alMileage" className={labelClass}>{t('fieldMileage')}</label>
            <input id="alMileage" type="number" min={0} value={form.mileage} onChange={(e) => update('mileage', e.target.value)} className={textInputClass} />
          </div>
          <div>
            <label htmlFor="alYear" className={labelClass}>{t('fieldYear')}</label>
            <input id="alYear" type="number" min={1960} max={2100} value={form.year} onChange={(e) => update('year', e.target.value)} className={textInputClass} />
          </div>
          <div>
            <label htmlFor="alPower" className={labelClass}>{t('fieldPower')}</label>
            <input id="alPower" type="number" min={0} value={form.power} onChange={(e) => update('power', e.target.value)} className={textInputClass} />
          </div>
          <div>
            <label htmlFor="alFuelType" className={labelClass}>{t('fieldFuelType')}</label>
            <select id="alFuelType" value={form.fuelType} onChange={(e) => update('fuelType', e.target.value)} className={textInputClass}>
              <option value="">—</option>
              {fuelTypes.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="alTransmission" className={labelClass}>{t('fieldTransmission')}</label>
            <select id="alTransmission" value={form.transmission} onChange={(e) => update('transmission', e.target.value)} className={textInputClass}>
              <option value="">—</option>
              {transmissions.map((tr) => <option key={tr} value={tr}>{tr}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="alCountry" className={labelClass}>{t('fieldCountry')}</label>
            <select id="alCountry" value={form.country} onChange={(e) => update('country', e.target.value)} className={textInputClass}>
              <option value="">—</option>
              {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="alCity" className={labelClass}>{t('fieldCity')}</label>
            <input id="alCity" type="text" value={form.city} onChange={(e) => update('city', e.target.value)} className={textInputClass} />
          </div>
          <div>
            <label htmlFor="alSeller" className={labelClass}>{t('fieldSeller')}</label>
            <input id="alSeller" type="text" value={form.seller} onChange={(e) => update('seller', e.target.value)} className={textInputClass} />
          </div>
          <div>
            <label htmlFor="alSellerType" className={labelClass}>{t('fieldSellerType')}</label>
            <select id="alSellerType" value={form.sellerType} onChange={(e) => update('sellerType', e.target.value)} className={textInputClass}>
              <option value="">—</option>
              <option value="Particulier">Particulier</option>
              <option value="Professionnel">Professionnel</option>
            </select>
          </div>
          <div>
            <label htmlFor="alSellerRating" className={labelClass}>{t('fieldSellerRating')}</label>
            <input id="alSellerRating" type="number" min={0} max={5} step={0.1} value={form.sellerRating} onChange={(e) => update('sellerRating', e.target.value)} className={textInputClass} />
          </div>
          <div>
            <label htmlFor="alSellerPhone" className={labelClass}>{t('fieldSellerPhone')}</label>
            <input id="alSellerPhone" type="text" value={form.sellerPhone} onChange={(e) => update('sellerPhone', e.target.value)} className={textInputClass} />
          </div>
          <div>
            <label htmlFor="alSellerEmail" className={labelClass}>{t('fieldSellerEmail')}</label>
            <input id="alSellerEmail" type="email" value={form.sellerEmail} onChange={(e) => update('sellerEmail', e.target.value)} className={textInputClass} />
          </div>
          <div className="col-span-2">
            <span className={labelClass}>{t('fieldOptions')}</span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
              {allOptions.map((o) => (
                <label key={o.key} className="flex cursor-pointer items-center gap-2 text-xs font-light text-white/60 hover:text-white/80">
                  <input
                    type="checkbox"
                    checked={selectedOptions.has(o.key)}
                    onChange={() => toggleOption(o.key)}
                    className="h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-transparent accent-amber-400"
                  />
                  <span>
                    {translateOptionLabel(lang, o.key, o.label)}
                    {o.tier === 'high' && <span className="ml-1.5 text-[9px] font-medium uppercase tracking-wider text-amber-300/70">★</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label htmlFor="alListingSource" className={labelClass}>{t('fieldListingSource')}</label>
            <input id="alListingSource" type="text" value={form.listingSource} onChange={(e) => update('listingSource', e.target.value)} placeholder={t('fieldListingSourcePlaceholder')} className={textInputClass} />
          </div>
          <div className="col-span-2">
            <label htmlFor="alNotes" className={labelClass}>{t('fieldNotes')}</label>
            <textarea id="alNotes" rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder={t('fieldNotesPlaceholder')} className={textInputClass} />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] font-light text-red-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-light text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>{isEditing ? t('editListingSuccess') : t('addListingSuccess')}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400/15 px-4 py-2.5 text-xs font-medium text-amber-300 transition-all hover:bg-amber-400/25 disabled:opacity-50"
        >
          {isEditing ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {isEditing ? t('editListingSubmit') : t('addListingSubmit')}
        </button>
      </form>

      <button onClick={onClose} className="mt-4 w-full text-center text-xs font-light text-white/30 hover:text-white/50">
        {lang === 'fr' ? 'Fermer' : 'Close'}
      </button>
    </div>
  );
}

export default function AddListingDrawer({ lang, onClose, onAdded, onUpdated, editingListing }: AddListingDrawerProps) {
  const t = getT(lang);
  const { user, loading } = useAuth();

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0d0d0d] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[#0d0d0d]/95 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
              {editingListing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </div>
            <h2 className="text-sm font-light tracking-wide text-white">
              {user ? (editingListing ? t('editListing') : t('addListing')) : t('loginTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={lang === 'fr' ? 'Fermer' : 'Close'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 transition-all hover:border-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? null : user ? (
          <ListingForm lang={lang} onAdded={onAdded} onUpdated={onUpdated} onClose={onClose} editingListing={editingListing} />
        ) : (
          <LoginForm lang={lang} onClose={onClose} />
        )}
      </div>
    </>
  );
}
