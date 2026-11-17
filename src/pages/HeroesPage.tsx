import { memo, useEffect, useMemo, useState } from 'react';
import { Search, X, Shield, Swords, Sparkles, BookOpen, ChevronRight, ShoppingBag, Check } from 'lucide-react';
import type { EquipmentItem, HeroDetail, HeroLane, HeroRole, HeroSummary, HeroWallpaper } from '../types/mlbb';
import { loadHeroDetail } from '../services/mlbbApi';
import { useAppContext } from '../context/AppContext';
import { GameImage } from '../components/GameImage';
import { MlbbRichText } from '../components/MlbbRichText';
import { buildHeroSkinCatalog, getSkinsForHero } from '../utils/skinCatalog';
import type { HeroSkinCatalog, SkinItem } from '../utils/skinCatalog';

const ROLES: Array<'Semua' | HeroRole> = [
  'Semua',
  'Tank',
  'Fighter',
  'Assassin',
  'Mage',
  'Marksman',
  'Support',
];

const LANES: Array<'Semua' | HeroLane> = [
  'Semua',
  'Gold Lane',
  'Exp Lane',
  'Mid Lane',
  'Jungle',
  'Roam',
];

interface HeroesPageProps {
  heroes: HeroSummary[];
  equipment: EquipmentItem[];
  wallpapers: HeroWallpaper[];
  skinCatalog?: HeroSkinCatalog;
  loading: boolean;
  onOpenShop?: (heroName: string, section?: 'diamond' | 'limited') => void;
}

export const HeroesPage = memo(function HeroesPage({ heroes, equipment, wallpapers, skinCatalog: passedCatalog, loading, onOpenShop }: HeroesPageProps) {
  const {
    apiLang,
    ui,
    appConfig,
    profile,
    updatePlayerProgress,
    equipHeroSkin,
    getHeroDisplayImage,
    getHeroActiveSkin,
  } = useAppContext();
  const [selectedRole, setSelectedRole] = useState<'Semua' | HeroRole>('Semua');
  const [selectedLane, setSelectedLane] = useState<'Semua' | HeroLane>('Semua');
  const [query, setQuery] = useState('');

  const [activeHeroId, setActiveHeroId] = useState<number | null>(null);
  const [detail, setDetail] = useState<HeroDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const heroById = useMemo(() => {
    const map = new Map<number, HeroSummary>();
    for (const h of heroes) map.set(h.id, h);
    return map;
  }, [heroes]);

  const equipById = useMemo(() => {
    const map = new Map<number, EquipmentItem>();
    for (const e of equipment) map.set(e.id, e);
    return map;
  }, [equipment]);

  const filteredHeroes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return heroes.filter((h) => {
      if (selectedRole !== 'Semua' && !h.roles.includes(selectedRole)) return false;
      if (selectedLane !== 'Semua' && !h.lanes.includes(selectedLane)) return false;
      if (q && !h.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [heroes, selectedRole, selectedLane, query]);

  useEffect(() => {
    if (!activeHeroId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    loadHeroDetail(activeHeroId, apiLang)
      .then((d) => {
        if (!cancelled) {
          setDetail(d);
          setDetailLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDetailError(err instanceof Error ? err.message : 'Gagal memuat detail hero');
          setDetailLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeHeroId, apiLang]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { Semua: heroes.length };
    for (const r of ROLES.slice(1)) {
      counts[r] = heroes.filter((h) => h.roles.includes(r as HeroRole)).length;
    }
    return counts;
  }, [heroes]);

  const skinCatalog = useMemo(
    () => passedCatalog || buildHeroSkinCatalog(heroes, wallpapers, appConfig),
    [passedCatalog, heroes, wallpapers, appConfig]
  );

  const activeHeroSkins = useMemo(() => {
    if (!detail) return [];
    return getSkinsForHero(detail.id, detail.name, skinCatalog);
  }, [detail, skinCatalog]);

  async function handleBuyOrUseHeroSkin(heroId: number, skin: SkinItem) {
    const owned = Boolean(
      skin.isDefault || skin.currency === 'free' || profile.ownedSkins.includes(skin.id)
    );
    if (owned) {
      await equipHeroSkin(heroId, skin);
      return;
    }

    if (skin.currency === 'diamond') {
      if (profile.diamonds < skin.price) return;
      await updatePlayerProgress((prev) => ({
        ...prev,
        diamonds: prev.diamonds - skin.price,
        ownedSkins: prev.ownedSkins.includes(skin.id) ? prev.ownedSkins : [...prev.ownedSkins, skin.id],
        equippedSkinId: skin.id,
        equippedSkinUrl: skin.imageUrl,
      }));
      await equipHeroSkin(heroId, skin);
    } else if (skin.currency === 'seasonPoints') {
      if (profile.seasonPoints < skin.price) return;
      await updatePlayerProgress((prev) => ({
        ...prev,
        seasonPoints: prev.seasonPoints - skin.price,
        ownedSkins: prev.ownedSkins.includes(skin.id) ? prev.ownedSkins : [...prev.ownedSkins, skin.id],
        equippedSkinId: skin.id,
        equippedSkinUrl: skin.imageUrl,
      }));
      await equipHeroSkin(heroId, skin);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight text-balance">
              {ui.heroesTitle}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span className="font-mono-num text-slate-900 dark:text-slate-200 font-semibold">{heroes.length}</span>{' '}
              {ui.heroesSubtitle}
            </p>
          </div>
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama hero..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                selectedRole === role
                  ? 'btn-accent font-semibold shadow-sm'
                  : 'bg-slate-100 dark:bg-[#1A2333] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#222E42]'
              }`}
            >
              {role} <span className="font-mono-num opacity-75 ml-1">{roleCounts[role] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-200 dark:border-white/5">
          <span className="text-xs text-slate-500 shrink-0">Lane:</span>
          {LANES.map((lane) => (
            <button
              key={lane}
              type="button"
              onClick={() => setSelectedLane(lane)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0 transition-colors ${
                selectedLane === lane
                  ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-950 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {lane === 'Semua' ? 'Semua Lane' : lane}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={idx}
              className="aspect-[16/10] rounded-2xl bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : filteredHeroes.length === 0 ? (
        <div className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tidak ada hero untuk kombinasi filter tersebut.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedRole('Semua');
              setSelectedLane('Semua');
              setQuery('');
            }}
            className="mt-4 min-h-[44px] px-5 py-2 rounded-xl btn-accent text-xs font-semibold"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        /* Zero-Crop Landscape Hero Cards (Shows 100% of hero splash artwork & active skin) */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filteredHeroes.map((hero) => {
            const activeSkin = getHeroActiveSkin(hero.id);
            const displaySrc = getHeroDisplayImage(hero);
            return (
              <button
                key={hero.id}
                type="button"
                onClick={() => setActiveHeroId(hero.id)}
                className="perf-card-item group flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 hover:border-accent text-left transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 shadow-sm"
              >
                <div className="relative aspect-[16/10] w-full bg-slate-900 overflow-hidden">
                  <GameImage
                    src={displaySrc}
                    name={hero.name}
                    fullFrame
                    className="w-full h-full"
                    imgClassName="group-hover:scale-105 transition-transform duration-300"
                    rounded="none"
                  />
                  {activeSkin && (
                    <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-amber-500/95 text-slate-950 text-[10px] font-bold shadow">
                      {activeSkin.rarity}
                    </span>
                  )}
                  {hero.winRate ? (
                    <span className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-black/75 font-mono-num text-[10px] font-semibold text-amber-300">
                      WR {(hero.winRate * 100).toFixed(1)}%
                    </span>
                  ) : null}
                </div>

                <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2 w-full">
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {hero.name}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {hero.roles.join(' / ')}
                      {hero.lanes.length > 0 ? ` · ${hero.lanes[0]}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-accent shrink-0 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {activeHeroId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setActiveHeroId(null)}
        >
          <div
            className="w-full sm:max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-3" />

            {detailLoading ? (
              <div className="p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-7 w-48 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
                  <button
                    type="button"
                    onClick={() => setActiveHeroId(null)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="h-28 bg-slate-100 dark:bg-white/5 rounded-2xl animate-pulse" />
                <div className="h-44 bg-slate-100 dark:bg-white/5 rounded-2xl animate-pulse" />
              </div>
            ) : detailError || !detail ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm text-rose-500 dark:text-rose-300">
                  {detailError || 'Detail hero tidak tersedia.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveHeroId(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-sm text-slate-900 dark:text-white"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <GameImage
                      src={getHeroDisplayImage(heroById.get(detail.id) || { id: detail.id }, detail.squarehead || detail.head)}
                      name={detail.name}
                      className="w-14 h-14"
                      imgClassName="w-full h-full object-cover object-top"
                      rounded="xl"
                    />
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                        {detail.name}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {detail.roles.join(' / ')}
                        {detail.lanes.length > 0 ? ` · ${detail.lanes.join(', ')}` : ''}
                        {detail.speciality.length > 0 ? ` · ${detail.speciality.join(', ')}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveHeroId(null)}
                    aria-label="Tutup detail hero"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                    <div className="md:col-span-5 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-white/10 aspect-[16/10] md:aspect-auto md:min-h-[220px]">
                      <GameImage
                        src={getHeroDisplayImage(
                          heroById.get(detail.id) || { id: detail.id },
                          detail.painting || detail.headBig || detail.squarehead || detail.head
                        )}
                        name={detail.name}
                        fullFrame
                        className="w-full h-full"
                        rounded="none"
                      />
                    </div>
                    <div className="md:col-span-7 flex flex-col justify-between gap-4 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-accent mb-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Latar Belakang & Profil</span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {detail.story || detail.tale || 'Hero petarung di Land of Dawn.'}
                        </p>
                      </div>

                      <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-white/10">
                        {[
                          { label: 'Ketahanan (Durability)', val: detail.ability.durability, color: 'bg-emerald-500' },
                          { label: 'Serangan (Offense)', val: detail.ability.offense, color: 'bg-rose-500' },
                          { label: 'Efek Kontrol (CC)', val: detail.ability.control, color: 'bg-sky-500' },
                          { label: 'Kesulitan (Difficulty)', val: detail.ability.difficulty, color: 'bg-amber-500' },
                        ].map((stat) => (
                          <div key={stat.label} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500 dark:text-slate-400">{stat.label}</span>
                              <span className="font-mono-num text-slate-900 dark:text-slate-200 font-semibold">
                                {stat.val}/100
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${stat.color}`}
                                style={{ width: `${Math.min(100, Math.max(5, stat.val))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Skin Hero & Ganti Tampilan (Langsung Pakai Skin yang Sudah Dibeli / Beli di Tempat) */}
                  {activeHeroSkins.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-accent" />
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            Skin Hero &amp; Ganti Tampilan ({activeHeroSkins.length})
                          </h3>
                        </div>
                        {onOpenShop && (
                          <button
                            type="button"
                            onClick={() => {
                              const name = detail.name;
                              setActiveHeroId(null);
                              onOpenShop(name, 'diamond');
                            }}
                            className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Buka di Shop</span>
                          </button>
                        )}
                      </div>

                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {activeHeroSkins.map((skin) => {
                          const owned = Boolean(
                            skin.isDefault ||
                              skin.currency === 'free' ||
                              profile.ownedSkins.includes(skin.id)
                          );
                          const currentActive = getHeroActiveSkin(detail.id);
                          const isEquipped = currentActive
                            ? currentActive.skinId === skin.id
                            : Boolean(skin.isDefault);
                          const canAfford =
                            skin.currency === 'free'
                              ? true
                              : skin.currency === 'diamond'
                              ? profile.diamonds >= skin.price
                              : profile.seasonPoints >= skin.price;

                          return (
                            <div
                              key={skin.id}
                              className={`w-48 shrink-0 rounded-xl border overflow-hidden flex flex-col bg-slate-50 dark:bg-[#0B0F17] ${
                                isEquipped
                                  ? 'border-amber-400 ring-1 ring-amber-400/50'
                                  : 'border-slate-200 dark:border-white/10'
                              }`}
                            >
                              <div className="aspect-[16/10] w-full relative bg-slate-900 overflow-hidden">
                                <GameImage
                                  src={skin.imageUrl}
                                  name={skin.name}
                                  fullFrame
                                  className="w-full h-full"
                                  rounded="none"
                                />
                                {isEquipped && (
                                  <span className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </span>
                                )}
                              </div>
                              <div className="px-2.5 pt-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300 block">
                                  {skin.rarity}
                                </span>
                                <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate block">
                                  {skin.name}
                                </span>
                              </div>

                              <div className="p-2">
                                <button
                                  type="button"
                                  disabled={!owned && !canAfford}
                                  onClick={() => handleBuyOrUseHeroSkin(detail.id, skin)}
                                  className={`w-full min-h-[34px] rounded-lg text-[11px] font-semibold transition-all ${
                                    isEquipped
                                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                                      : owned
                                      ? 'bg-slate-900 dark:bg-white/15 text-white hover:opacity-90'
                                      : canAfford
                                      ? 'btn-accent'
                                      : 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed'
                                  }`}
                                >
                                  {isEquipped
                                    ? 'Dipakai'
                                    : owned
                                    ? 'Gunakan'
                                    : skin.currency === 'diamond'
                                    ? `Beli ${skin.price} 💎`
                                    : `Beli ${skin.price} Pt`}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Pasif &amp; Penjelasan Skill
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {detail.skills.map((skill, idx) => {
                        const slotLabel =
                          idx === 0
                            ? 'Pasif'
                            : idx === detail.skills.length - 1
                            ? 'Ultimate'
                            : `Skill ${idx}`;
                        const tagNames = skill.tags.map((t) => t.tagname).filter(Boolean);

                        return (
                          <div
                            key={skill.skillid || idx}
                            className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex gap-3.5"
                          >
                            <GameImage
                              src={skill.skillicon}
                              name={skill.skillname}
                              className="w-12 h-12 sm:w-14 sm:h-14 mt-0.5"
                              rounded="xl"
                            />
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                                  {skill.skillname}
                                </h4>
                                <span className="text-xs font-medium text-accent">
                                  {slotLabel}
                                  {tagNames.length > 0 ? ` · ${tagNames.join(', ')}` : ''}
                                </span>
                              </div>

                              {skill.cdAndCost && (
                                <p className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
                                  {skill.cdAndCost}
                                </p>
                              )}

                              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                <MlbbRichText text={skill.skilldesc} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {(detail.recommendedBuildIds.length > 0 ||
                    detail.relation.strong.length > 0 ||
                    detail.relation.weak.length > 0) && (
                    <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {detail.recommendedBuildIds.length > 0 && (
                        <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Rekomendasi Build Utama
                          </h3>
                          <div className="flex flex-wrap gap-2.5">
                            {detail.recommendedBuildIds.map((eqId, i) => {
                              const eq = equipById.get(eqId);
                              return (
                                <div key={`${eqId}-${i}`} className="flex items-center gap-2">
                                  <GameImage
                                    src={eq?.icon}
                                    name={eq?.name || `Item ${eqId}`}
                                    className="w-10 h-10"
                                    rounded="full"
                                  />
                                  <span className="text-xs text-slate-700 dark:text-slate-300 max-w-[96px] truncate">
                                    {eq?.name || `#${eqId}`}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Relasi Hero (Counter & Sinergi)
                        </h3>
                        <div className="space-y-2.5 text-xs">
                          {detail.relation.strong.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Swords className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="text-slate-500 dark:text-slate-400">Unggul lawan:</span>
                              {detail.relation.strong.map((id) => {
                                const h = heroById.get(id);
                                return h ? (
                                  <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveHeroId(h.id)}
                                    className="text-emerald-600 dark:text-emerald-300 hover:underline font-medium"
                                  >
                                    {h.name}
                                  </button>
                                ) : null;
                              })}
                            </div>
                          )}
                          {detail.relation.weak.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Shield className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="text-slate-500 dark:text-slate-400">Ter-counter oleh:</span>
                              {detail.relation.weak.map((id) => {
                                const h = heroById.get(id);
                                return h ? (
                                  <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveHeroId(h.id)}
                                    className="text-rose-600 dark:text-rose-300 hover:underline font-medium"
                                  >
                                    {h.name}
                                  </button>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
