import { X, Check, ChevronRight, GitCompare } from 'lucide-react';
import { type Lang, getT } from './i18n';

interface ComparatorBarProps {
  count: number;
  onOpen: () => void;
  onClear: () => void;
  lang: Lang;
}

export default function ComparatorBar({ count, onOpen, onClear, lang }: ComparatorBarProps) {
  const t = getT(lang);
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#111111]/95 px-5 py-3 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10">
            <GitCompare className="h-4 w-4 text-amber-300" />
          </div>
          <div>
            <p className="text-sm font-light text-white">{t('comparatorBar')}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/40">
              {count} {t('modelsSelectedShort')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-light text-white/50 transition-all hover:border-white/20 hover:text-white/80"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('clear')}</span>
          </button>
          <button
            onClick={onOpen}
            disabled={count < 2}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-300 to-amber-400 px-4 py-2 text-xs font-medium text-[#0a0a0a] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>{t('compareNow')}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
