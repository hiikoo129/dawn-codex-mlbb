import { memo, useMemo, useState } from 'react';
import {
  Search,
  X,
  ArrowRight,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  BookOpen,
  Swords,
} from 'lucide-react';
import type { EquipCategory, EquipmentItem, ItemRecipeNode } from '../types/mlbb';
import { buildItemRecipeTree, getItemUpgrades } from '../services/mlbbApi';
import { getItemCounterGuide } from '../utils/mlbbParser';
import { useAppContext } from '../context/AppContext';
import { GameImage } from '../components/GameImage';

const SECTION_CONFIG: Array<{
  category: EquipCategory;
  title: string;
  subtitle: string;
  accent: string;
}> = [
  {
    category: 'Attack',
    title: 'Physical Attack',
    subtitle: 'Item serangan fisik, critical, attack speed, lifesteal, dan penetrasi armor',
    accent: 'text-rose-600 dark:text-rose-300',
  },
  {
    category: 'Magic',
    title: 'Magic Damage',
    subtitle: 'Item kekuatan sihir, pengurangan cooldown, mana, dan magic penetration',
    accent: 'text-sky-600 dark:text-sky-300',
  },
  {
    category: 'Defense',
    title: 'Defense & Ketahanan',
    subtitle: 'Item pelindung HP, Physical Defense, Magic Defense, dan anti-burst',
    accent: 'text-emerald-600 dark:text-emerald-300',
  },
  {
    category: 'Movement',
    title: 'Movement (Sepatu)',
    subtitle: 'Item kecepatan gerak dasar serta variasi sepatu & blessing',
    accent: 'text-amber-600 dark:text-amber-300',
  },
  {
    category: 'Jungle',
    title: 'Jungle (Retribution)',
    subtitle: 'Blessing Retribution untuk mempercepat farming & objektif',
    accent: 'text-violet-600 dark:text-violet-300',
  },
  {
    category: 'Roam',
    title: 'Roam',
    subtitle: 'Blessing untuk Roamer: Conceal, Encourage, Favor, dan Dire Hit',
    accent: 'text-teal-600 dark:text-teal-300',
  },
];

interface ItemsPageProps {
  equipment: EquipmentItem[];
  loading: boolean;
}

function RecipeBranch({
  node,
  onInspect,
  depth = 0,
}: {
  node: ItemRecipeNode;
  onInspect: (item: EquipmentItem) => void;
  depth?: number;
}) {
  return (
    <div
      className={
        depth > 0
          ? 'pl-4 border-l border-slate-200 dark:border-white/10 space-y-2'
          : 'space-y-2'
      }
    >
      <button
        type="button"
        onClick={() => onInspect(node.item)}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#131A26] hover:bg-slate-100 dark:hover:bg-[#1C2638] border border-slate-200 dark:border-white/10 hover:border-accent text-left transition-colors min-h-[56px]"
      >
        <GameImage
          src={node.item.icon}
          name={node.item.name}
          className="w-10 h-10"
          rounded="xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {node.item.name}
            </span>
            <span className="text-[11px] font-medium text-accent shrink-0">
              {node.item.tier === 'dasar'
                ? 'Bahan Dasar'
                : node.item.tier === 'menengah'
                ? 'Bahan Menengah'
                : 'Item Jadi'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {node.item.rawTips.join(' · ') || 'Komponen bahan item'}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {node.materials.length > 0 && (
        <div className="space-y-2">
          {node.materials.map((child) => (
            <RecipeBranch
              key={child.item.id}
              node={child}
              onInspect={onInspect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const ItemsPage = memo(function ItemsPage({ equipment, loading }: ItemsPageProps) {
  const { ui } = useAppContext();
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | EquipCategory>('Semua');
  const [tierFilter, setTierFilter] = useState<'semua' | 'jadi' | 'mentahan'>('semua');
  const [query, setQuery] = useState('');
  const [activeItem, setActiveItem] = useState<EquipmentItem | null>(null);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SECTION_CONFIG.filter(
      (sec) => selectedCategory === 'Semua' || sec.category === selectedCategory
    )
      .map((sec) => {
        const inCategory = equipment.filter((e) => e.category === sec.category);
        const matching = q
          ? inCategory.filter(
              (e) =>
                e.name.toLowerCase().includes(q) ||
                e.rawTips.some((t) => t.toLowerCase().includes(q)) ||
                e.passives.some((p) => p.toLowerCase().includes(q))
            )
          : inCategory;

        const completed =
          tierFilter === 'mentahan' ? [] : matching.filter((e) => e.tier === 'jadi');
        const components =
          tierFilter === 'jadi' ? [] : matching.filter((e) => e.tier !== 'jadi');
        return {
          ...sec,
          completed,
          components,
          total: completed.length + components.length,
        };
      })
      .filter((sec) => sec.total > 0);
  }, [equipment, selectedCategory, tierFilter, query]);

  const recipeTree = useMemo(() => {
    if (!activeItem) return null;
    return buildItemRecipeTree(activeItem, equipment);
  }, [activeItem, equipment]);

  const upgrades = useMemo(() => {
    if (!activeItem) return [];
    return getItemUpgrades(activeItem, equipment);
  }, [activeItem, equipment]);

  const counterGuide = useMemo(() => {
    if (!activeItem) return null;
    return getItemCounterGuide(activeItem);
  }, [activeItem]);

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight text-balance">
              {ui.itemsTitle}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {ui.itemsSubtitle}
            </p>
          </div>
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari item (Sea Halberd, BoD...)"
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Clean Category Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('Semua')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border whitespace-nowrap transition-all ${
              selectedCategory === 'Semua'
                ? 'btn-accent shadow-sm'
                : 'bg-slate-50 dark:bg-[#1A2333] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-accent'
            }`}
          >
            Semua Bagian
          </button>
          {SECTION_CONFIG.map((sec) => (
            <button
              key={sec.category}
              type="button"
              onClick={() => setSelectedCategory(sec.category)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold border whitespace-nowrap transition-all ${
                selectedCategory === sec.category
                  ? 'btn-accent shadow-sm'
                  : 'bg-slate-50 dark:bg-[#1A2333] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-accent'
              }`}
            >
              {sec.title}
            </button>
          ))}
        </div>

        {/* Clean Tier Segmented Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Tampilkan:</span>
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 gap-1">
            {(
              [
                { key: 'semua', label: 'Semua Tier' },
                { key: 'jadi', label: 'Item Jadi' },
                { key: 'mentahan', label: 'Bahan Mentahan' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setTierFilter(opt.key)}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  tierFilter === opt.key
                    ? 'btn-accent shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-56 rounded-2xl bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : filteredSections.length === 0 ? (
        <div className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tidak ada item yang sesuai pencarian.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredSections.map((sec) => (
            <section
              key={sec.category}
              className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-200 dark:border-white/10 pb-3">
                <div>
                  <h2 className={`text-lg sm:text-xl font-bold ${sec.accent}`}>
                    {sec.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {sec.subtitle}
                  </p>
                </div>
                <span className="font-mono-num text-xs text-slate-500 dark:text-slate-400">
                  {sec.completed.length} Item Jadi
                  {sec.components.length > 0 ? ` · ${sec.components.length} Mentahan` : ''}
                </span>
              </div>

              {sec.completed.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Item Jadi (Tier Akhir)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sec.completed.map((item) => {
                      const guide = getItemCounterGuide(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveItem(item)}
                          className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0B0F17] hover:bg-slate-100 dark:hover:bg-[#192233] border border-slate-200 dark:border-white/10 hover:border-accent text-left transition-all min-h-[84px]"
                        >
                          <GameImage
                            src={item.icon}
                            name={item.name}
                            className="w-13 h-13"
                            rounded="xl"
                          />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {item.name}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-accent shrink-0 transition-colors" />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {item.rawTips.join(' · ') || 'Lihat efek pasif & resep'}
                            </p>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-300 truncate">
                              Counter: {guide.countersItems.slice(0, 2).join(', ')}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {sec.components.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/5">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Item Mentahan (Bahan Dasar & Menengah)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {sec.components.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveItem(item)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0B0F17]/70 hover:bg-slate-100 dark:hover:bg-[#192233] border border-slate-200 dark:border-white/10 hover:border-accent text-left transition-colors min-h-[60px]"
                      >
                        <GameImage
                          src={item.icon}
                          name={item.name}
                          className="w-10 h-10"
                          rounded="xl"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                            {item.name}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                            {item.rawTips[0] || 'Bahan dasar'}
                          </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Item Shortcut Modal: Penjelasan, Pemahaman, Counter Item & Bahan Mentahan */}
      {activeItem && counterGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setActiveItem(null)}
        >
          <div
            className="w-full sm:max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-3" />

            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3.5 min-w-0">
                <GameImage
                  src={activeItem.icon}
                  name={activeItem.name}
                  className="w-12 h-12"
                  rounded="xl"
                />
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                    {activeItem.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Kategori: {activeItem.category} ·{' '}
                    {activeItem.tier === 'jadi'
                      ? 'Item Jadi'
                      : activeItem.tier === 'menengah'
                      ? 'Item Menengah'
                      : 'Item Mentahan Dasar'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                aria-label="Tutup detail item"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2">
                <h3 className="text-xs font-semibold text-accent">
                  Atribut Statistik Item
                </h3>
                {activeItem.rawTips.length > 0 ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-mono-num text-slate-800 dark:text-slate-200">
                    {activeItem.rawTips.map((tip, i) => (
                      <span key={i}>{tip}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Efek utama berasal dari pasif / blessing unik item.
                  </p>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 dark:text-sky-300">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Pemahaman & Kapan Membeli Item Ini</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {counterGuide.understanding}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1 border-t border-slate-200 dark:border-white/10">
                  <strong className="text-slate-800 dark:text-slate-200">Waktu tepat membeli:</strong>{' '}
                  {counterGuide.whenToBuy}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <Swords className="w-3.5 h-3.5" />
                    <span>Efektif Meng-Counter Item</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                    {counterGuide.countersItems.join(' · ')}
                  </p>
                </div>

                <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Item Lawan yang Meredamnya</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                    {counterGuide.counteredByItems.join(' · ')}
                  </p>
                </div>
              </div>

              {activeItem.passives.length > 0 && (
                <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Efek Pasif & Aktif Resmi</span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {activeItem.passives.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Item Mentahan Pembentuk {activeItem.name}</span>
                </div>

                {recipeTree && recipeTree.materials.length > 0 ? (
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Beli item mentahan di bawah ini secara bertahap untuk membentuk{' '}
                      <strong className="text-slate-800 dark:text-slate-200">{activeItem.name}</strong>:
                    </p>
                    {recipeTree.materials.map((matNode) => (
                      <RecipeBranch
                        key={matNode.item.id}
                        node={matNode}
                        onInspect={(item) => setActiveItem(item)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeItem.tier === 'jadi'
                      ? 'Item ini dapat dibeli langsung atau merupakan variasi blessing sepatu/roam/jungle.'
                      : 'Ini adalah item mentahan dasar yang dibeli langsung dengan Gold awal.'}
                  </p>
                )}
              </div>

              {upgrades.length > 0 && (
                <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Bisa Digabung Menjadi Item Jadi</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {upgrades.map((up) => (
                      <button
                        key={up.id}
                        type="button"
                        onClick={() => setActiveItem(up)}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-[#131A26] hover:bg-slate-100 dark:hover:bg-[#1C2638] border border-slate-200 dark:border-white/10 text-left transition-colors"
                      >
                        <GameImage
                          src={up.icon}
                          name={up.name}
                          className="w-9 h-9"
                          rounded="xl"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate block">
                            {up.name}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                            {up.category}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
