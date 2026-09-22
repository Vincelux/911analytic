import { useState } from 'react';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { type Lang, getT } from './i18n';
import { useAuth } from './lib/auth';
import { textInputClass, labelClass } from './lib/formStyles';

export default function LoginForm({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const t = getT(lang);
  const { sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const err = await sendMagicLink(email);
    setSubmitting(false);
    if (err) setError(t('loginErrorGeneric'));
    else setSent(true);
  };

  return (
    <div className="p-6">
      {sent ? (
        <div className="flex gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
          <p className="text-sm font-light leading-relaxed text-white/70">{t('loginLinkSentDesc')}</p>
        </div>
      ) : (
        <>
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
              <Mail className="h-3.5 w-3.5" />
              {t('loginSendLink')}
            </button>
          </form>
        </>
      )}
      <button
        onClick={onClose}
        className="mt-4 w-full text-center text-xs font-light text-white/30 hover:text-white/50"
      >
        {lang === 'fr' ? 'Annuler' : 'Cancel'}
      </button>
    </div>
  );
}
