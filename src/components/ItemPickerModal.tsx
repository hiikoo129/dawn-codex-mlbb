import { useMemo, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import type { EquipCategory, EquipmentItem } from '../types/mlbb';
import { GameImage } from './GameImage';

const CATEGORIES: Array<'Semua' | EquipCategory> = [
  'Semua',
  'Attack',
  'Magic',
  'Defense',
  'Movement',
  'Jungle',
  'Roam',
];

const CATEGORY_LABELS: Record<'Semua' | EquipCategory, string> = {
  Semua: 'Semua',
  Attack: 'Attack',
  Magic: 'Magic',
  Defense: 'Defense',
  Movement: 'Movement (Sepatu)',
  Jungle: 'Jungle (Retri)',
  Roam: 'Roam',
};

interface ItemPickerModalProps {
  open: boolean;
  slotIndex: number | null;
  items: EquipmentItem[];
  currentItem: EquipmentItem | null;
  onSelect: (item: EquipmentItem | null) => void;
  onClose: () => void;
}

export function ItemPickerModal({
  open,
  slotIndex,
  items,
  currentItem,
  onSelect,
  onClose,
}: ItemPickerModalProps) {
  const [category, setCategory] = useState<'Semua' | EquipCategory>('Semua');
  const [onlyCompleted, setOnlyCompleted] = useState(true);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== 'Semua' && item.category !== category) return false;
      // Show all Movement/Jungle/Roam items even if mid-tier, and filter completed for Attack/Magic/Defense when toggled
      if (
        onlyCompleted &&
        item.tier !== 'jadi' &&
        item.category !== 'Movement' &&
        item.category !== 'Jungle' &&
        item.category !== 'Roam'
      ) {
        return false;
      }
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, category, onlyCompleted, query]);

  if (!open) return null;

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

        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Pilih Item {slotIndex !== null ? `Slot ${slotIndex + 1}` : ''}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tersedia Attack, Magic, Defense, Movement (Sepatu), Jungle (Retribution), dan Roam
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentItem && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  onClose();
                }}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-300 hover:bg-rose-500/25 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Lepas</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pemilih item"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 pt-3 pb-3 space-y-3 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0F1520]">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari item (contoh: Ice Retribution, Tough Boots, Sea Halberd)..."
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white dark:bg-[#1A2333] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setOnlyCompleted((v) => !v)}
              className={`min-h-[44px] px-4 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border transition-colors ${
                onlyCompleted
                  ? 'bg-amber-400/20 border-amber-400/60 text-amber-800 dark:text-amber-200'
                  : 'bg-white dark:bg-[#1A2333] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
              }`}
            >
              {onlyCompleted ? 'Item Jadi + Blessing' : 'Semua Tier (Termasuk Mentahan)'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  category === cat
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'bg-white dark:bg-[#1A2333] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-transparent hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Tidak ada item yang ditemukan.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filtered.map((item) => {
                const isSelected = currentItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all min-h-[56px] ${
                      isSelected
                        ? 'bg-amber-400/15 border-amber-400'
                        : 'bg-slate-50 dark:bg-[#1A2333]/80 border-slate-200 dark:border-white/10 hover:border-amber-400/60'
                    }`}
                  >
                    <GameImage
                      src={item.icon}
                      name={item.name}
                      className="w-11 h-11"
                      rounded="full"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.rawTips.join(' · ') || item.passives[0] || 'Item Perlengkapan'}
                      </p>
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
