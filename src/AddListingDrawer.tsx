import { useState } from 'react';
import { X, LogIn, LogOut, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  generations,
  fuelTypes,
  transmissions,
  countryFlagCodes,
  type CarListing,
} from './data';
import { type Lang, getT } from './i18n';
import { useAuth } from './lib/auth';
import { insertListing } from './listingsRepository';
import { normalizeUrl } from './lib/url';

interface AddListingDrawerProps {
  lang: Lang;
  onClose: () => void;
  onAdded: (listing: CarListing) => void;
}

const countryOptions = Object.keys(countryFlagCodes);

const textInputClass =
  'w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-light text-white/80 transition-all focus:border-amber-400/40 focus:bg-white/[0.05] focus:outline-none focus:ring-1 focus:ring-amber-400/20';
const labelClass = 'mb-1.5 block text-[10px] uppercase tracking-[0.15em] text-white/30';

function LoginForm({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const t = getT(lang);
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const err = await signIn(email, password);
    setSubmitting(false);
    if (err) setError(t('loginErrorGeneric'));
  };

  return (
    <div className="p-6">
      <p className="mb-4 text-xs font-light leading-relaxed text-white/40">{t('loginDesc')}</p>
      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div>
          <label htmlFor="loginEmail" className={labelClass}>{t('loginEmail')}</label>
          <input
            id="loginEmail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={textInputClass}
          />
        </div>
        <div>
          <label htmlFor="loginPassword" className={labelClass}>{t('loginPassword')}</label>
          <input
            id="loginPassword"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={textInputClass}
          />
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] font-light text-red-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400/15 px-4 py-2.5 text-xs font-medium text-amber-300 transition-all hover:bg-amber-400/25 disabled:opacity-50"
        >
          <LogIn className="h-3.5 w-3.5" />
          {t('loginSubmit')}
        </button>
      </form>
      <button
        onClick={onClose}
        className="mt-4 w-full text-center text-xs font-light text-white/30 hover:text-white/50"
      >
        {lang === 'fr' ? 'Annuler' : 'Cancel'}
      </button>
    </div>
  );
}

interface FormState {
  model: string;
  generation: string;
  phase: string;
  price: string;
  mileage: string;
  year: string;
  power: string;
  fuelType: string;
  transmission: string;
  country: string;
  city: string;
  seller: string;
  sellerType: CarListing['sellerType'];
  sellerRating: string;
  sellerPhone: string;
  sellerEmail: string;
  listingUrl: string;
  listingSource: string;
  notes: string;
}

const emptyForm: FormState = {
  model: '',
  generation: generations[0],
  phase: '',
  price: '',
  mileage: '',
  year: '',
  power: '',
  fuelType: fuelTypes[0],
  transmission: transmissions[0],
  country: countryOptions[0],
  city: '',
  seller: '',
  sellerType: 'Particulier',
  sellerRating: '',
  sellerPhone: '',
  sellerEmail: '',
  listingUrl: '',
  listingSource: '',
  notes: '',
};

function ListingForm({
  lang,
  onAdded,
  onClose,
}: {
  lang: Lang;
  onAdded: (listing: CarListing) => void;
  onClose: () => void;
}) {
  const t = getT(lang);
  const { user, signOut } = useAuth();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const required = [form.model, form.generation, form.price, form.mileage, form.year, form.power, form.city, form.seller, form.listingUrl, form.listingSource];
    if (required.some((v) => !v.trim())) {
      setError(t('addListingRequiredError'));
      return;
    }

    const normalizedUrl = normalizeUrl(form.listingUrl);
    if (!normalizedUrl) {
      setError(t('addListingInvalidUrlError'));
      return;
    }

    setSubmitting(true);
    try {
      const listing = await insertListing({
        model: form.model.trim(),
        generation: form.generation,
        phase: form.phase.trim() || null,
        price: Math.round(Number(form.price)),
        mileage: Math.round(Number(form.mileage)),
        year: Math.round(Number(form.year)),
        power: Math.round(Number(form.power)),
        fuelType: form.fuelType,
        transmission: form.transmission,
        country: form.country,
        countryFlag: countryFlagCodes[form.country] ?? '',
        city: form.city.trim(),
        seller: form.seller.trim(),
        sellerType: form.sellerType,
        sellerRating: form.sellerRating ? Number(form.sellerRating) : null,
        sellerPhone: form.sellerPhone.trim() || null,
        sellerEmail: form.sellerEmail.trim() || null,
        listingUrl: normalizedUrl,
        listingSource: form.listingSource.trim(),
        notes: form.notes.trim() || null,
      });
      onAdded(listing);
      setForm(emptyForm);
      setSuccess(true);
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
            <label htmlFor="alModel" className={labelClass}>{t('fieldModel')}</label>
            <input id="alModel" type="text" value={form.model} onChange={(e) => update('model', e.target.value)} placeholder={t('fieldModelPlaceholder')} className={textInputClass} />
          </div>
          <div>
            <label htmlFor="alGeneration" className={labelClass}>{t('fieldGeneration')}</label>
            <select id="alGeneration" value={form.generation} onChange={(e) => update('generation', e.target.value)} className={textInputClass}>
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
              {fuelTypes.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="alTransmission" className={labelClass}>{t('fieldTransmission')}</label>
            <select id="alTransmission" value={form.transmission} onChange={(e) => update('transmission', e.target.value)} className={textInputClass}>
              {transmissions.map((tr) => <option key={tr} value={tr}>{tr}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="alCountry" className={labelClass}>{t('fieldCountry')}</label>
            <select id="alCountry" value={form.country} onChange={(e) => update('country', e.target.value)} className={textInputClass}>
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
            <select id="alSellerType" value={form.sellerType} onChange={(e) => update('sellerType', e.target.value as CarListing['sellerType'])} className={textInputClass}>
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
            <label htmlFor="alListingUrl" className={labelClass}>{t('fieldListingUrl')}</label>
            <input id="alListingUrl" type="text" inputMode="url" value={form.listingUrl} onChange={(e) => update('listingUrl', e.target.value)} placeholder="https://…" className={textInputClass} />
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
            <span>{t('addListingSuccess')}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400/15 px-4 py-2.5 text-xs font-medium text-amber-300 transition-all hover:bg-amber-400/25 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('addListingSubmit')}
        </button>
      </form>

      <button onClick={onClose} className="mt-4 w-full text-center text-xs font-light text-white/30 hover:text-white/50">
        {lang === 'fr' ? 'Fermer' : 'Close'}
      </button>
    </div>
  );
}

export default function AddListingDrawer({ lang, onClose, onAdded }: AddListingDrawerProps) {
  const t = getT(lang);
  const { user, loading } = useAuth();

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0d0d0d] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[#0d0d0d]/95 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
              <Plus className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-light tracking-wide text-white">
              {user ? t('addListing') : t('loginTitle')}
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
          <ListingForm lang={lang} onAdded={onAdded} onClose={onClose} />
        ) : (
          <LoginForm lang={lang} onClose={onClose} />
        )}
      </div>
    </>
  );
}
