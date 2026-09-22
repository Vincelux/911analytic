import { useState } from 'react';
import { LogIn, AlertCircle, Mail } from 'lucide-react';
import { type Lang, getT } from './i18n';
import { useAuth } from './lib/auth';
import { textInputClass, labelClass } from './lib/formStyles';

export default function LoginForm({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const t = getT(lang);
  const { requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sendCode = async () => {
    setSubmitting(true);
    setError(null);
    const err = await requestOtp(email);
    setSubmitting(false);
    if (err) setError(t('loginErrorGeneric'));
    else setStep('code');
  };

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    void sendCode();
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const err = await verifyOtp(email, code);
    setSubmitting(false);
    if (err) setError(t('loginErrorCode'));
  };

  return (
    <div className="p-6">
      <p className="mb-4 text-xs font-light leading-relaxed text-white/40">
        {step === 'email' ? t('loginDesc') : t('loginCodeSentDesc')}
      </p>

      {step === 'email' ? (
        <form onSubmit={handleSendCode} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
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
            {t('loginSendCode')}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div>
            <label htmlFor="loginCode" className={labelClass}>{t('loginCode')}</label>
            <input
              id="loginCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
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
            {t('loginVerifyCode')}
          </button>
          <div className="flex items-center justify-between pt-1 text-[11px] font-light text-white/40">
            <button type="button" onClick={() => { setStep('email'); setCode(''); setError(null); }} className="hover:text-white/70">
              {t('loginChangeEmail')}
            </button>
            <button type="button" onClick={() => void sendCode()} className="hover:text-white/70">
              {t('loginResendCode')}
            </button>
          </div>
        </form>
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
