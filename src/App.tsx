import { Component, useCallback, useEffect, useMemo, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import {
  Users,
  Swords,
  Package,
  Calculator,
  Gamepad2,
  UserCircle2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import type {
  BattleSpell,
  EmblemSet,
  EmblemTalent,
  EquipmentItem,
  HeroSummary,
  HeroWallpaper,
} from './types/mlbb';
import {
  loadAllEquipment,
  loadAllHeroes,
  loadBattleSpells,
  loadEmblemsAndTalents,
  loadHeroWallpapers,
} from './services/mlbbApi';
import { AppProvider, useAppContext } from './context/AppContext';
import { HeroesPage } from './pages/HeroesPage';
import { DraftPage } from './pages/DraftPage';
import { ItemsPage } from './pages/ItemsPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { MiniGamePage } from './pages/MiniGamePage';
import { ProfilePage } from './pages/ProfilePage';
import { buildAllBgThemes, getBgThemeById } from './utils/bgThemes';
import { buildHeroSkinCatalog } from './utils/skinCatalog';

type TabKey = 'heroes' | 'draft' | 'items' | 'calculator' | 'minigame' | 'profile';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Terjadi kesalahan pada aplikasi.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F6FA] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-[#131A26] border border-rose-500/30 rounded-2xl p-6 space-y-4 text-center shadow-xl">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h1 className="text-lg font-bold">Aplikasi Perlu Dimuat Ulang</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-accent min-h-[44px] px-5 py-2 rounded-xl font-semibold text-xs"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppShell() {
  const { appConfig, profile, settings, isDarkResolved, apiLang, ui } = useAppContext();

  const [activeTab, setActiveTab] = useState<TabKey>('heroes');
  const [heroes, setHeroes] = useState<HeroSummary[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [spells, setSpells] = useState<BattleSpell[]>([]);
  const [emblemSets, setEmblemSets] = useState<EmblemSet[]>([]);
  const [emblemTalents, setEmblemTalents] = useState<EmblemTalent[]>([]);
  const [wallpapers, setWallpapers] = useState<HeroWallpaper[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopRedirect, setShopRedirect] = useState<{
    section: 'default' | 'diamond' | 'limited' | 'helpers' | 'bgTheme';
    query: string;
    nonce: number;
  } | null>(null);

  const loadData = useCallback(
    async (force = false) => {
      if (force) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const [heroList, equipList, spellList, emblemData, wallList] = await Promise.all([
          loadAllHeroes(apiLang, force),
          loadAllEquipment(apiLang, force),
          loadBattleSpells(apiLang),
          loadEmblemsAndTalents(apiLang),
          loadHeroWallpapers(apiLang),
        ]);
        setHeroes(heroList);
        setEquipment(equipList);
        setSpells(spellList);
        setEmblemSets(emblemData.sets);
        setEmblemTalents(emblemData.talents);
        setWallpapers(wallList);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal terhubung ke server data Rone Arena API.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiLang]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const skinCatalog = useMemo(
    () => buildHeroSkinCatalog(heroes, wallpapers, appConfig),
    [heroes, wallpapers, appConfig]
  );

  const allBgThemes = useMemo(
    () => buildAllBgThemes(wallpapers, heroes, appConfig),
    [wallpapers, heroes, appConfig]
  );

  const activeBgTheme = getBgThemeById(profile.equippedBgTheme || 'default', allBgThemes);
  const hasImageBg = Boolean(activeBgTheme.imageUrl);
  const customBgStyle =
    !hasImageBg && activeBgTheme.id !== 'default'
      ? { background: isDarkResolved ? activeBgTheme.darkBgStyle : activeBgTheme.lightBgStyle }
      : undefined;

  const handleOpenShopForHero = useCallback(
    (heroName: string, section: 'diamond' | 'limited' = 'diamond') => {
      setShopRedirect({ section, query: heroName, nonce: Date.now() });
      setActiveTab('minigame');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const handleGoHome = useCallback(() => {
    setActiveTab('heroes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  const tabs: Array<{
    key: TabKey;
    label: string;
    mobileLabel: string;
    icon: typeof Users;
  }> = [
    { key: 'heroes', label: ui.navHeroes, mobileLabel: ui.navHeroes, icon: Users },
    { key: 'draft', label: ui.navDraft, mobileLabel: ui.navDraft, icon: Swords },
    { key: 'items', label: ui.navItems, mobileLabel: ui.navItems, icon: Package },
    { key: 'calculator', label: ui.navCalc, mobileLabel: ui.navCalc, icon: Calculator },
    { key: 'minigame', label: ui.navGame, mobileLabel: ui.navGame, icon: Gamepad2 },
    { key: 'profile', label: ui.navProfile, mobileLabel: ui.navProfile, icon: UserCircle2 },
  ];

  const pageAnimClass = `page-anim-${settings.pageAnimation || 'fade'}`;

  return (
    <div
      style={customBgStyle}
      className="relative min-h-screen bg-[#F4F6FA] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 flex flex-col transition-colors"
    >
      {/* Mobile Legends HD Wallpaper Background Theme Layer */}
      {hasImageBg && activeBgTheme.imageUrl && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <img
            src={activeBgTheme.imageUrl}
            alt={activeBgTheme.name}
            referrerPolicy="no-referrer"
            decoding="async"
            className="w-full h-full object-cover object-center scale-105"
          />
          <div
            className={`absolute inset-0 transition-colors ${
              isDarkResolved
                ? 'bg-[#0B0F17]/75 backdrop-blur-[1.5px]'
                : 'bg-[#F4F6FA]/78 backdrop-blur-[1.5px]'
            }`}
          />
        </div>
      )}

      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 h-14 sm:h-16 bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('heroes')}
            className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-md"
          >
            {appConfig.appName}
          </button>

          <nav
            aria-label="Navigasi Utama"
            className="hidden md:flex items-center gap-5 lg:gap-7 text-sm font-medium overflow-x-auto"
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={
                    active
                      ? {
                          color: settings.accentColor,
                          borderColor: settings.accentColor,
                        }
                      : undefined
                  }
                  className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                    active
                      ? 'font-semibold'
                      : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              disabled={refreshing}
              onClick={handleRefresh}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#1A2333] hover:bg-slate-200 dark:hover:bg-[#232F44] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{ui.refresh}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-7 pb-24 md:pb-10">
        {appConfig.globalBannerText?.trim() && (
          <div className="mb-4 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-medium text-amber-800 dark:text-amber-200 text-center">
            {appConfig.globalBannerText}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-sm text-rose-700 dark:text-rose-200">
              <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold shrink-0"
            >
              Coba Lagi
            </button>
          </div>
        )}

        <div key={activeTab} className={pageAnimClass}>
          {activeTab === 'heroes' && (
            <HeroesPage
              heroes={heroes}
              equipment={equipment}
              wallpapers={wallpapers}
              skinCatalog={skinCatalog}
              loading={loading}
              onOpenShop={handleOpenShopForHero}
            />
          )}
          {activeTab === 'draft' && <DraftPage heroes={heroes} />}
          {activeTab === 'items' && (
            <ItemsPage equipment={equipment} loading={loading} />
          )}
          {activeTab === 'calculator' && (
            <CalculatorPage
              heroes={heroes}
              equipment={equipment}
              spells={spells}
              emblemSets={emblemSets}
              emblemTalents={emblemTalents}
            />
          )}
          {activeTab === 'minigame' && (
            <MiniGamePage
              heroes={heroes}
              equipment={equipment}
              wallpapers={wallpapers}
              skinCatalog={skinCatalog}
              allBgThemes={allBgThemes}
              shopRedirect={shopRedirect}
              onGoHome={handleGoHome}
            />
          )}
          {activeTab === 'profile' && (
            <ProfilePage
              heroes={heroes}
              wallpapers={wallpapers}
              allBgThemes={allBgThemes}
              onRefreshData={handleRefresh}
            />
          )}
        </div>

        {/* Quiet Attribution Footer */}
        <footer className="mt-10 pt-5 border-t border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400">
          {appConfig.footerText?.trim() ? (
            <span>{appConfig.footerText}</span>
          ) : (
            <>
              {appConfig.appName} · {appConfig.guideSubtitle} · {ui.madeBy}{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {appConfig.creatorName}
              </span>
            </>
          )}
        </footer>
      </main>

      {/* Mobile Fixed Bottom Tab Bar */}
      <nav
        aria-label="Navigasi Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 pb-safe"
      >
        <div className="grid grid-cols-6 h-16 items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={active ? { color: settings.accentColor } : undefined}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors px-1 ${
                  active
                    ? 'font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                <span className="text-[10px] font-medium tracking-tight truncate max-w-full">
                  {tab.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ErrorBoundary>
  );
}
