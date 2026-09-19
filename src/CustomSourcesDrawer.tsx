import { useState } from 'react';
import { X, Plus, Link as LinkIcon, ExternalLink, Trash2, AlertCircle, PlayCircle } from 'lucide-react';
import { type Lang, type TranslationKey, getT } from './i18n';
import { useAuth } from './lib/auth';
import { textInputClass, labelClass } from './lib/formStyles';
import LoginForm from './LoginForm';
import type { AddSourceError, CustomSource } from './customSources';

interface CustomSourcesDrawerProps {
  lang: Lang;
  sources: CustomSource[];
  onAdd: (url: string, label: string, note: string) => Promise<AddSourceError | null>;
  onRemove: (id: string) => Promise<void>;
  onClose: () => void;
}

const errorKey: Record<AddSourceError, TranslationKey> = {
  invalidUrl: 'customSourcesInvalidUrl',
  duplicateUrl: 'customSourcesDuplicateUrl',
  notAuthenticated: 'loginErrorGeneric',
};

const SCRAPE_WORKFLOW_URL = 'https://github.com/Vincelux/911analytic/actions/workflows/scrape.yml';

function SourcesPanel({
  lang,
  sources,
  onAdd,
  onRemove,
}: {
  lang: Lang;
  sources: CustomSource[];
  onAdd: (url: string, label: string, note: string) => Promise<AddSourceError | null>;
  onRemove: (id: string) => Promise<void>;
}) {
  const t = getT(lang);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<AddSourceError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await onAdd(url, label, note);
    setSubmitting(false);
    if (result) {
      setError(result);
      return;
    }
    setError(null);
    setUrl('');
    setLabel('');
    setNote('');
  };

  return (
    <div className="space-y-6 p-6">
      <p className="text-xs font-light leading-relaxed text-white/40">{t('customSourcesDesc')}</p>

      <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
        <div className="mb-2 flex items-center gap-2">
          <PlayCircle className="h-4 w-4 text-amber-300/80" />
          <span className="text-xs font-medium text-white/80">{t('runScrapeNow')}</span>
        </div>
        <p className="mb-3 text-[11px] font-light leading-relaxed text-white/40">{t('runScrapeNowDesc')}</p>
        <a
          href={SCRAPE_WORKFLOW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-medium text-amber-200 transition-all hover:bg-amber-400/20"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t('openGithubActions')}
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div>
          <label htmlFor="customSourceUrl" className={labelClass}>
            {t('customSourcesUrlLabel')}
          </label>
          <input
            id="customSourceUrl"
            type="text"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('customSourcesUrlPlaceholder')}
            className={textInputClass}
          />
        </div>
        <div>
          <label htmlFor="customSourceLabel" className={labelClass}>
            {t('customSourcesNameLabel')}
          </label>
          <input
            id="customSourceLabel"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('customSourcesNamePlaceholder')}
            className={textInputClass}
          />
        </div>
        <div>
          <label htmlFor="customSourceNote" className={labelClass}>
            {t('customSourcesNoteLabel')}
          </label>
          <input
            id="customSourceNote"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('customSourcesNotePlaceholder')}
            className={textInputClass}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] font-light text-red-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{t(errorKey[error])}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400/15 px-4 py-2.5 text-xs font-medium text-amber-300 transition-all hover:bg-amber-400/25 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('customSourcesAdd')}
        </button>
      </form>

      <div>
        {sources.length === 0 ? (
          <p className="rounded-xl border border-white/5 bg-white/[0.01] px-4 py-6 text-center text-xs font-light text-white/30">
            {t('customSourcesEmpty')}
          </p>
        ) : (
          <ul className="space-y-2">
            {sources.map((source) => (
              <li key={source.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-light text-white/85">{source.label}</p>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 flex items-center gap-1 text-[11px] font-light text-amber-300/80 hover:text-amber-300"
                    >
                      <span className="truncate">{source.url}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    {source.note && (
                      <p className="mt-1.5 text-[11px] font-light leading-relaxed text-white/40">{source.note}</p>
                    )}
                  </div>
                  <button
                    onClick={() => void onRemove(source.id)}
                    aria-label={t('customSourcesRemove')}
                    className="shrink-0 rounded-lg border border-white/10 p-1.5 text-white/30 transition-all hover:border-red-400/30 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function CustomSourcesDrawer({
  lang,
  sources,
  onAdd,
  onRemove,
  onClose,
}: CustomSourcesDrawerProps) {
  const t = getT(lang);
  const { user, loading } = useAuth();

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0d0d0d] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[#0d0d0d]/95 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
              <LinkIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-light tracking-wide text-white">
                {user ? t('customSources') : t('loginTitle')}
              </h2>
              {user && (
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                  {sources.length} {t('customSourcesCountSuffix')}
                </p>
              )}
            </div>
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
          <SourcesPanel lang={lang} sources={sources} onAdd={onAdd} onRemove={onRemove} />
        ) : (
          <LoginForm lang={lang} onClose={onClose} />
        )}
      </div>
    </>
  );
}
