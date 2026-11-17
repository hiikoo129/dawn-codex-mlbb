import { useMemo, useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import type { HeroRole, HeroSummary } from '../types/mlbb';
import { useAppContext } from '../context/AppContext';
import { GameImage } from './GameImage';

const ROLES: Array<'Semua' | HeroRole> = [
  'Semua',
  'Tank',
  'Fighter',
  'Assassin',
  'Mage',
  'Marksman',
  'Support',
];

interface HeroPickerModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  heroes: HeroSummary[];
  selectedHeroId?: number | null;
  disabledHeroIds?: number[];
  onSelect: (hero: HeroSummary) => void;
  onClose: () => void;
}

export function HeroPickerModal({
  open,
  title,
  subtitle,
  heroes,
  selectedHeroId,
  disabledHeroIds = [],
  onSelect,
  onClose,
}: HeroPickerModalProps) {
  const { getHeroDisplayImage } = useAppContext();
  const [role, setRole] = useState<'Semua' | HeroRole>('Semua');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return heroes.filter((h) => {
      if (role !== 'Semua' && !h.roles.includes(role)) return false;
      if (q && !h.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [heroes, role, query]);

  if (!open) return null;

  const disabledSet = new Set(disabledHeroIds);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-3xl max-h-[88vh] flex flex-col bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-3" />

        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pemilih hero"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-3 pb-3 space-y-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0F1520]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama hero..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white dark:bg-[#1A2333] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  role === r
                    ? 'btn-accent font-semibold'
                    : 'bg-white dark:bg-[#1A2333] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-transparent hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Tidak ada hero yang sesuai dengan pencarian.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
              {filtered.map((hero) => {
                const isSelected = selectedHeroId === hero.id;
                const isDisabled = disabledSet.has(hero.id) && !isSelected;

                return (
                  <button
                    key={hero.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      onSelect(hero);
                      onClose();
                    }}
                    className={`perf-card-item group flex flex-col rounded-xl border overflow-hidden text-left transition-all bg-slate-50 dark:bg-[#0B0F17] ${
                      isSelected
                        ? 'border-accent ring-2 ring-amber-400/50'
                        : isDisabled
                        ? 'border-slate-200 dark:border-white/5 opacity-40 cursor-not-allowed'
                        : 'border-slate-200 dark:border-white/10 hover:border-accent'
                    }`}
                  >
                    <div className="relative aspect-[16/10] w-full bg-slate-900 overflow-hidden">
                      <GameImage
                        src={getHeroDisplayImage(hero)}
                        name={hero.name}
                        fullFrame
                        className="w-full h-full"
                        imgClassName="group-hover:scale-105 transition-transform"
                        rounded="none"
                      />
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full btn-accent flex items-center justify-center shadow">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div className="p-2 w-full">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                        {hero.name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">
                        {hero.roles.join(' / ')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
