import { memo, useEffect, useMemo, useState } from 'react';
import {
  UserCircle2,
  Sun,
  Moon,
  Monitor,
  Palette,
  Globe,
  Image as ImageIcon,
  Trash2,
  Shuffle,
  Check,
  X,
  Lock,
  ShieldCheck,
  LogOut,
  RotateCcw,
  Settings,
  Sparkles,
  ArrowLeft,
  Type,
  ShoppingBag,
  Trophy,
  Sliders,
} from 'lucide-react';
import type {
  BgThemeOption,
  HeroRole,
  HeroSummary,
  HeroWallpaper,
  ImageQuality,
  PageAnimationType,
  ThemeMode,
} from '../types/mlbb';
import { useAppContext } from '../context/AppContext';
import { SUPPORTED_LANGUAGES } from '../utils/i18n';
import { buildAllBgThemes, getBgThemeById } from '../utils/bgThemes';
import { GameImage } from '../components/GameImage';

const ACCENT_PRESETS = [
  { name: 'Mythic Gold', hex: '#F59E0B' },
  { name: 'Crimson Blade', hex: '#EF4444' },
  { name: 'Arcane Cyan', hex: '#06B6D4' },
  { name: 'Emerald Jungle', hex: '#10B981' },
  { name: 'Royal Violet', hex: '#8B5CF6' },
];

const QUALITY_OPTIONS: Array<{
  key: ImageQuality;
  label: string;
  desc: string;
}> = [
  { key: 'hemat', label: 'Hemat (Agak Burem)', desc: 'Sangat ringan untuk kuota & RAM' },
  { key: 'sedang', label: 'Sedang (Agak Jernih)', desc: 'Seimbang untuk HP standar' },
  { key: 'tinggi', label: 'Tinggi (Jernih)', desc: 'Tajam & tetap lancar' },
  { key: 'sangat_tinggi', label: 'Sangat Tinggi (HD)', desc: 'Resolusi maksimal HD' },
];

const ANIMATION_OPTIONS: Array<{
  key: PageAnimationType;
  label: string;
  desc: string;
}> = [
  { key: 'none', label: 'Tanpa Animasi', desc: 'Langsung berpindah instan' },
  { key: 'fade', label: 'Fade', desc: 'Memudar halus antar halaman' },
  { key: 'zoom-in', label: 'Zoom In', desc: 'Membesar lembut ke layar' },
  { key: 'zoom-out', label: 'Zoom Out', desc: 'Mengecil presisi ke posisi' },
  { key: 'slide', label: 'Bergulir', desc: 'Menggeser mulus dari samping' },
  { key: 'rotate', label: 'Melingkar', desc: 'Rotasi halus saat ganti tab' },
];

interface ProfilePageProps {
  heroes: HeroSummary[];
  wallpapers: HeroWallpaper[];
  allBgThemes?: BgThemeOption[];
  onRefreshData: () => void;
}

export const ProfilePage = memo(function ProfilePage({
  heroes,
  wallpapers,
  allBgThemes: passedBgThemes,
  onRefreshData,
}: ProfilePageProps) {
  const {
    user,
    isCreator,
    appConfig,
    profile,
    settings,
    ui,
    setThemeMode,
    setAccentColor,
    setLanguage,
    setImageQuality,
    setPageAnimation,
    clearAppCache,
    getHeroDisplayImage,
    signInWithGoogle,
    signInWithEmail,
    logoutAccount,
    bindMlbbId,
    updateCreatorConfig,
    resetSeasonLeaderboard,
  } = useAppContext();

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [transparencyOpen, setTransparencyOpen] = useState(false);
  const [transparencyTab, setTransparencyTab] = useState<'texts' | 'shop' | 'season'>('texts');

  const [emailInput, setEmailInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [mlbbIdInput, setMlbbIdInput] = useState(profile.mlbbId);
  const [mlbbZoneInput, setMlbbZoneInput] = useState(profile.mlbbZone);
  const [idMessage, setIdMessage] = useState<string | null>(null);
  const [cacheMsg, setCacheMsg] = useState<string | null>(null);

  const [randomTeam, setRandomTeam] = useState<Array<{ slot: string; hero: HeroSummary }>>([]);

  // Creator Transparent Page Draft State
  const [adminAppName, setAdminAppName] = useState(appConfig.appName);
  const [adminSubtitle, setAdminSubtitle] = useState(appConfig.guideSubtitle);
  const [adminCreator, setAdminCreator] = useState(appConfig.creatorName);
  const [adminBanner, setAdminBanner] = useState(appConfig.globalBannerText);
  const [adminFooter, setAdminFooter] = useState(appConfig.footerText);
  const [adminHeroesTitle, setAdminHeroesTitle] = useState(appConfig.customHeroesTitle);
  const [adminHeroesSub, setAdminHeroesSub] = useState(appConfig.customHeroesSubtitle);
  const [adminDraftTitle, setAdminDraftTitle] = useState(appConfig.customDraftTitle);
  const [adminDraftSub, setAdminDraftSub] = useState(appConfig.customDraftSubtitle);
  const [adminItemsTitle, setAdminItemsTitle] = useState(appConfig.customItemsTitle);
  const [adminItemsSub, setAdminItemsSub] = useState(appConfig.customItemsSubtitle);
  const [adminCalcTitle, setAdminCalcTitle] = useState(appConfig.customCalcTitle);
  const [adminCalcSub, setAdminCalcSub] = useState(appConfig.customCalcSubtitle);
  const [adminGameTitle, setAdminGameTitle] = useState(appConfig.customGameTitle);
  const [adminProfileTitle, setAdminProfileTitle] = useState(appConfig.customProfileTitle);

  const [adminSeasonTitle, setAdminSeasonTitle] = useState(appConfig.seasonTitle);
  const [adminSeasonNum, setAdminSeasonNum] = useState(appConfig.seasonNumber);

  const [adminSpecialPrice, setAdminSpecialPrice] = useState(appConfig.specialDiamondPrice);
  const [adminEpicPrice, setAdminEpicPrice] = useState(appConfig.epicDiamondPrice);
  const [adminLegendPrice, setAdminLegendPrice] = useState(appConfig.legendSeasonPrice);
  const [adminCollectorPrice, setAdminCollectorPrice] = useState(appConfig.collectorSeasonPrice);
  const [adminLimitedPrice, setAdminLimitedPrice] = useState(appConfig.limitedSeasonPrice);
  const [adminBgDiamondPrice, setAdminBgDiamondPrice] = useState(appConfig.bgDiamondPrice);
  const [adminBgSeasonPrice, setAdminBgSeasonPrice] = useState(appConfig.bgSeasonPrice);
  const [adminHintPrice, setAdminHintPrice] = useState(appConfig.hintDiamondPrice);
  const [adminTimePrice, setAdminTimePrice] = useState(appConfig.extraTimeDiamondPrice);
  const [adminQuizDiamondReward, setAdminQuizDiamondReward] = useState(appConfig.quizDiamondReward);
  const [adminQuizSeasonReward, setAdminQuizSeasonReward] = useState(appConfig.quizSeasonReward);

  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const [adminSaving, setAdminSaving] = useState(false);

  useEffect(() => {
    setMlbbIdInput(profile.mlbbId);
    setMlbbZoneInput(profile.mlbbZone);
  }, [profile.mlbbId, profile.mlbbZone]);

  useEffect(() => {
    setAdminAppName(appConfig.appName);
    setAdminSubtitle(appConfig.guideSubtitle);
    setAdminCreator(appConfig.creatorName);
    setAdminBanner(appConfig.globalBannerText);
    setAdminFooter(appConfig.footerText);
    setAdminHeroesTitle(appConfig.customHeroesTitle);
    setAdminHeroesSub(appConfig.customHeroesSubtitle);
    setAdminDraftTitle(appConfig.customDraftTitle);
    setAdminDraftSub(appConfig.customDraftSubtitle);
    setAdminItemsTitle(appConfig.customItemsTitle);
    setAdminItemsSub(appConfig.customItemsSubtitle);
    setAdminCalcTitle(appConfig.customCalcTitle);
    setAdminCalcSub(appConfig.customCalcSubtitle);
    setAdminGameTitle(appConfig.customGameTitle);
    setAdminProfileTitle(appConfig.customProfileTitle);

    setAdminSeasonTitle(appConfig.seasonTitle);
    setAdminSeasonNum(appConfig.seasonNumber);

    setAdminSpecialPrice(appConfig.specialDiamondPrice);
    setAdminEpicPrice(appConfig.epicDiamondPrice);
    setAdminLegendPrice(appConfig.legendSeasonPrice);
    setAdminCollectorPrice(appConfig.collectorSeasonPrice);
    setAdminLimitedPrice(appConfig.limitedSeasonPrice);
    setAdminBgDiamondPrice(appConfig.bgDiamondPrice);
    setAdminBgSeasonPrice(appConfig.bgSeasonPrice);
    setAdminHintPrice(appConfig.hintDiamondPrice);
    setAdminTimePrice(appConfig.extraTimeDiamondPrice);
    setAdminQuizDiamondReward(appConfig.quizDiamondReward);
    setAdminQuizSeasonReward(appConfig.quizSeasonReward);
  }, [appConfig]);

  async function handleGoogleLogin() {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      setAccountModalOpen(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Gagal masuk dengan Google.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithEmail(emailInput, passInput, isRegisterMode, nameInput);
      setAccountModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('operation-not-allowed')) {
        setAuthError(
          'Login Email/Password belum diaktifkan di Firebase Console proyek Anda. Gunakan tombol Masuk dengan Google atau aktifkan provider Email/Password di Firebase Console.'
        );
      } else {
        setAuthError(msg);
      }
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleBindId(e: React.FormEvent) {
    e.preventDefault();
    if (!mlbbIdInput.trim()) return;
    await bindMlbbId(mlbbIdInput, mlbbZoneInput);
    setIdMessage('ID Mobile Legends terpasang. Nickname, Tier Rank, dan Role terkunci otomatis.');
  }

  function handleClearCache() {
    const { clearedBytes } = clearAppCache();
    onRefreshData();
    setCacheMsg(
      `Cache aplikasi berhasil dibersihkan (${Math.max(1, Math.round(clearedBytes / 1024))} KB) dan data dimuat ulang.`
    );
  }

  function handleGenerateRandomTeam() {
    if (heroes.length < 10) return;
    const slots: Array<{ slot: string; role: HeroRole }> = [
      { slot: 'Exp Lane', role: 'Fighter' },
      { slot: 'Jungle', role: 'Assassin' },
      { slot: 'Mid Lane', role: 'Mage' },
      { slot: 'Gold Lane', role: 'Marksman' },
      { slot: 'Roam', role: 'Tank' },
    ];
    const used = new Set<number>();
    const generated = slots.map((s) => {
      const pool = heroes.filter((h) => h.roles.includes(s.role) && !used.has(h.id));
      const fallbackPool = heroes.filter((h) => !used.has(h.id));
      const pickPool = pool.length > 0 ? pool : fallbackPool;
      const chosen = pickPool[Math.floor(Math.random() * pickPool.length)];
      used.add(chosen.id);
      return { slot: s.slot, hero: chosen };
    });
    setRandomTeam(generated);
  }

  async function handleSaveCreatorAll() {
    if (!isCreator) return;
    setAdminSaving(true);
    setAdminMsg(null);
    try {
      const cleanSeasonNum = Math.max(1, Math.round(adminSeasonNum || 1));
      await updateCreatorConfig({
        appName: adminAppName.trim().slice(0, 80) || 'Dawn Codex',
        guideSubtitle: adminSubtitle.trim().slice(0, 120) || 'Panduan Taktis MLBB',
        creatorName: adminCreator.trim().slice(0, 60) || 'Hiikoo',
        globalBannerText: adminBanner.trim().slice(0, 200),
        footerText: adminFooter.trim().slice(0, 200),
        customHeroesTitle: adminHeroesTitle.trim().slice(0, 80),
        customHeroesSubtitle: adminHeroesSub.trim().slice(0, 200),
        customDraftTitle: adminDraftTitle.trim().slice(0, 80),
        customDraftSubtitle: adminDraftSub.trim().slice(0, 200),
        customItemsTitle: adminItemsTitle.trim().slice(0, 80),
        customItemsSubtitle: adminItemsSub.trim().slice(0, 200),
        customCalcTitle: adminCalcTitle.trim().slice(0, 80),
        customCalcSubtitle: adminCalcSub.trim().slice(0, 200),
        customGameTitle: adminGameTitle.trim().slice(0, 80),
        customProfileTitle: adminProfileTitle.trim().slice(0, 80),
        seasonNumber: cleanSeasonNum,
        seasonTitle: adminSeasonTitle.trim().slice(0, 100) || `Season ${cleanSeasonNum}`,
        specialDiamondPrice: Math.max(0, Math.round(adminSpecialPrice || 0)),
        epicDiamondPrice: Math.max(0, Math.round(adminEpicPrice || 0)),
        legendSeasonPrice: Math.max(0, Math.round(adminLegendPrice || 0)),
        collectorSeasonPrice: Math.max(0, Math.round(adminCollectorPrice || 0)),
        limitedSeasonPrice: Math.max(0, Math.round(adminLimitedPrice || 0)),
        bgDiamondPrice: Math.max(0, Math.round(adminBgDiamondPrice || 0)),
        bgSeasonPrice: Math.max(0, Math.round(adminBgSeasonPrice || 0)),
        hintDiamondPrice: Math.max(0, Math.round(adminHintPrice || 0)),
        extraTimeDiamondPrice: Math.max(0, Math.round(adminTimePrice || 0)),
        quizDiamondReward: Math.max(0, Math.round(adminQuizDiamondReward || 0)),
        quizSeasonReward: Math.max(0, Math.round(adminQuizSeasonReward || 0)),
      });
      setAdminMsg('Seluruh pengaturan aplikasi & harga Shop berhasil disimpan dan disinkronkan!');
    } finally {
      setAdminSaving(false);
    }
  }

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === settings.language) || SUPPORTED_LANGUAGES[0];
  const currentQualityObj =
    QUALITY_OPTIONS.find((q) => q.key === settings.imageQuality) || QUALITY_OPTIONS[2];
  const currentAnimObj =
    ANIMATION_OPTIONS.find((a) => a.key === settings.pageAnimation) || ANIMATION_OPTIONS[1];
  const allBgThemes = useMemo(
    () => passedBgThemes ?? buildAllBgThemes(wallpapers, heroes, appConfig),
    [passedBgThemes, wallpapers, heroes, appConfig]
  );
  const currentBgObj = getBgThemeById(profile.equippedBgTheme || 'default', allBgThemes);

  return (
    <div className="space-y-6">
      {/* Profile & Action Buttons ("Pengaturan" + "Akun") */}
      <section className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {profile.equippedSkinUrl || user?.photoURL ? (
            <GameImage
              src={profile.equippedSkinUrl || user?.photoURL || ''}
              name={profile.nickname || ui.profileTitle}
              className="w-28 aspect-[16/10] shrink-0"
              fullFrame
              rounded="xl"
            />
          ) : (
            <div className="w-28 aspect-[16/10] rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-accent shrink-0">
              <UserCircle2 className="w-9 h-9" />
            </div>
          )}

          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {profile.nickname || ui.profileTitle}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {user
                ? `${user.displayName || user.email}`
                : 'Mode Tamu · Masuk lewat tombol Akun untuk simpan progres & Leaderboard'}
            </p>
            <p className="text-xs font-mono-num text-accent mt-1">
              {profile.diamonds} Diamond · {profile.seasonPoints} Poin Season · {ui.madeBy} {appConfig.creatorName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2333] hover:bg-slate-200 dark:hover:bg-[#232F44] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Settings className="w-4 h-4 text-accent" />
            <span>{ui.settingsBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => setAccountModalOpen(true)}
            className="btn-accent min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <UserCircle2 className="w-4 h-4" />
            <span>{ui.accountBtn}</span>
          </button>
        </div>
      </section>

      {/* Active Settings Summary Bar with Direct Button to Settings Modal */}
      <section className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 flex-1 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
              {ui.displayModeLabel}
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {settings.themeMode === 'light'
                ? ui.lightLabel
                : settings.themeMode === 'dark'
                ? ui.darkLabel
                : ui.systemLabel}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
              {ui.languageLabel.split('(')[0].trim()}
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
              {currentLangObj.flag} {currentLangObj.name}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
              {ui.graphicsLabel}
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
              {currentQualityObj.label}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
              {ui.animationLabel}
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
              {currentAnimObj.label}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 col-span-2 sm:col-span-1">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
              {ui.bgThemesTab} & Aksen
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: settings.accentColor }}
              />
              <span className="truncate">{currentBgObj.name}</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSettingsModalOpen(true)}
          className="btn-accent min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shrink-0"
        >
          <Settings className="w-4 h-4" />
          <span>{ui.settingsBtn}</span>
        </button>
      </section>

      {/* CREATOR-ONLY TRANSPARENT CONTROL ENTRY CARD (Strictly invisible to all non-creator accounts!) */}
      {isCreator && (
        <section className="backdrop-blur-md bg-slate-950/65 border border-amber-400/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-slate-100 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-amber-300">
                Halaman Transparansi Kontrol Pembuat
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Akses eksklusif developer ({appConfig.creatorName}): edit seluruh tulisan aplikasi, judul halaman, footer, banner, semua harga Shop, hadiah Kuis, dan reset Season secara live.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setAdminMsg(null);
              setTransparencyOpen(true);
            }}
            className="min-h-[46px] px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shrink-0 transition-colors"
          >
            <Sliders className="w-4 h-4" />
            <span>Buka Halaman Transparansi</span>
          </button>
        </section>
      )}

      {/* MLBB ID Binding (Locked Nickname, Tier Rank & Role) */}
      <section className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Kartu ID Mobile Legends
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Masukkan ID MLBB Anda. Nickname, Tier Rank, dan Role akan muncul otomatis dan terkunci untuk papan peringkat.
          </p>
        </div>

        <form onSubmit={handleBindId} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <input
            type="text"
            value={mlbbIdInput}
            onChange={(e) => setMlbbIdInput(e.target.value)}
            placeholder="ID MLBB (contoh: 123456789)"
            className="sm:col-span-6 h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 text-sm font-mono-num text-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            value={mlbbZoneInput}
            onChange={(e) => setMlbbZoneInput(e.target.value)}
            placeholder="Server/Zone (contoh: 2001)"
            className="sm:col-span-3 h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 text-sm font-mono-num text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="btn-accent sm:col-span-3 min-h-[44px] px-4 rounded-xl text-xs font-semibold"
          >
            Pasang ID MLBB
          </button>
        </form>

        {idMessage && (
          <p className="text-xs text-emerald-600 dark:text-emerald-300">{idMessage}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {[
            { label: 'Nickname (Terkunci)', value: profile.nickname || '-' },
            { label: 'Tier Rank Akun (Terkunci)', value: profile.accountTier || '-' },
            { label: 'Role Utama (Terkunci)', value: profile.accountRole || '-' },
          ].map((field) => (
            <div
              key={field.label}
              className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-xl p-3 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  {field.label}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate block">
                  {field.value}
                </span>
              </div>
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          ))}
        </div>
      </section>

      {/* Random Team Generator Tool (Zero-Crop Landscape Hero Cards) */}
      <section className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Alat Pembuat Tim Acak (Play Mode)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Acak komposisi 5 hero lengkap untuk tantangan mabar seru bersama teman.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateRandomTeam}
            className="btn-accent min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shrink-0"
          >
            <Shuffle className="w-4 h-4" />
            <span>Acak Tim 5 Hero</span>
          </button>
        </div>

        {randomTeam.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
            {randomTeam.map((entry) => (
              <div
                key={entry.slot}
                className="rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-white/10 flex flex-col"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <GameImage
                    src={getHeroDisplayImage(entry.hero)}
                    name={entry.hero.name}
                    className="w-full h-full"
                    fullFrame
                    rounded="none"
                  />
                </div>
                <div className="p-2 text-center bg-slate-950/90 border-t border-white/10">
                  <span className="text-xs font-bold text-white truncate block">
                    {entry.hero.name}
                  </span>
                  <span className="text-[10px] text-amber-300 truncate block">
                    {entry.slot}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FULLSCREEN TRANSPARENT CREATOR CONTROL PAGE (Strictly when isCreator && transparencyOpen) */}
      {isCreator && transparencyOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xl flex flex-col overflow-hidden text-slate-100">
          {/* Top Transparent Header */}
          <header className="h-14 sm:h-16 px-4 sm:px-6 border-b border-white/15 bg-slate-950/60 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setTransparencyOpen(false)}
                className="min-h-[40px] px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-amber-300 truncate flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Halaman Transparansi Kontrol Pembuat</span>
                </h1>
                <p className="text-[11px] text-slate-300 truncate">
                  Terverifikasi: {user?.email} · Kontrol penuh seluruh tulisan, harga, dan Season
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={adminSaving}
              onClick={handleSaveCreatorAll}
              className="min-h-[40px] px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              <span>{adminSaving ? 'Menyimpan...' : 'Simpan Semua'}</span>
            </button>
          </header>

          {/* Sub-Navigation Pills */}
          <div className="px-4 sm:px-6 py-3 border-b border-white/10 bg-slate-900/40 flex flex-wrap items-center gap-2 shrink-0">
            {[
              { id: 'texts' as const, label: 'Edit Tulisan & Judul Aplikasi', icon: Type },
              { id: 'shop' as const, label: 'Edit Harga Shop & Hadiah Kuis', icon: ShoppingBag },
              { id: 'season' as const, label: 'Manajemen Season & Reset Rank', icon: Trophy },
            ].map((t) => {
              const Icon = t.icon;
              const active = transparencyTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTransparencyTab(t.id)}
                  className={`min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                    active
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-white/5 text-slate-200 border-white/15 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Transparent Control Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-5xl mx-auto space-y-5 pb-10">
              {adminMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-xs text-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{adminMsg}</span>
                </div>
              )}

              {transparencyTab === 'texts' && (
                <div className="space-y-5">
                  <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 space-y-4">
                    <h2 className="text-sm font-bold text-amber-300">
                      Identitas Utama & Banner Pengumuman Global
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <label className="space-y-1 block">
                        <span className="text-slate-200 block">Nama Aplikasi</span>
                        <input
                          type="text"
                          value={adminAppName}
                          onChange={(e) => setAdminAppName(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                        />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-slate-200 block">Judul Panduan</span>
                        <input
                          type="text"
                          value={adminSubtitle}
                          onChange={(e) => setAdminSubtitle(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                        />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-slate-200 block">Nama Pembuat</span>
                        <input
                          type="text"
                          value={adminCreator}
                          onChange={(e) => setAdminCreator(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                        />
                      </label>
                      <label className="space-y-1 block sm:col-span-3">
                        <span className="text-slate-200 block">
                          Teks Banner Pengumuman Global (kosongkan jika tidak ingin ditampilkan)
                        </span>
                        <input
                          type="text"
                          value={adminBanner}
                          onChange={(e) => setAdminBanner(e.target.value)}
                          placeholder="Contoh: Selamat Datang di Event Season Baru Land of Dawn!"
                          className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                        />
                      </label>
                      <label className="space-y-1 block sm:col-span-3">
                        <span className="text-slate-200 block">
                          Teks Footer Aplikasi Kustom (kosongkan untuk default otomatis)
                        </span>
                        <input
                          type="text"
                          value={adminFooter}
                          onChange={(e) => setAdminFooter(e.target.value)}
                          placeholder="Contoh: Dawn Codex · Panduan Lengkap MLBB · Dibuat oleh Hiikoo"
                          className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div>
                      <h2 className="text-sm font-bold text-amber-300">
                        Kustomisasi Judul & Subjudul Semua Halaman
                      </h2>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Biarkan kosong untuk memakai terjemahan bahasa otomatis, atau isi teks kustom untuk mengganti tulisan di seluruh pengguna.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <label className="space-y-1 block">
                        <span className="text-slate-200 block">Judul Halaman Hero</span>
                        <input
                          type="text"
                          value={adminHeroesTitle}
                          onChange={(e) => setAdminHeroesTitle(e.target.value)}
                          placeholder="Default: Ensiklopedia Hero"
                          className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                        />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-slate-200 block">Subjudul Halaman Hero</span>
                        <input
                          type="text"
                          value={adminHeroesSub}
                          onChange={(e) => setAdminHeroesSub(e.target.value)}
                          placeholder="Deskripsi halaman Hero"
                          className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                        />
                      </label>

                      <label className="space-y-1 block">
                        <span className="text-slate-200 block">Judul Halaman Draft Pick 5v5</span>
                        <input
                          type="text"
                          value={adminDraftTitle}
                          onChange={(e) => setAdminDraftTitle(e.target.value)}
                          placeholder="Default: Simulasi Draft Pick 5 vs 5"
                          className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                        />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-slate-200 block">Subjudul Halaman Draft Pick 5v5</span>
                        <input
                          type="text"
                          value={adminDraftSub}
                          onChange={(e) => setAdminDraftSub(e.target.value)}
                          placeholder="Deskripsi halaman Draft Pick"
                          className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                        />
                      </label>

                      <label className="space-y-1 block">
                        <span className="text-slate-200 block">Judul Halaman Item</span>
                        <input
                          type="text"
                          value={adminItemsTitle}
                          onChange={(e) => setAdminItemsTitle(e.target.value)}
                          placeholder="Default: Katalog Item & Bahan Rakit"
                          className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                        />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-slate-200 block">Subjudul Halaman Item</span>
                        <input
                          type="text"
                          value={adminItemsSub}
                          onChange={(e) => setAdminItemsSub(e.target.value)}
                          placeholder="Deskripsi halaman Item"
                          className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                        />
                      </label>

                      <label className="space-y-1 block">
                        <span className="text-slate-200 block">Judul Halaman Kalkulator</span>
                        <input
                          type="text"
                          value={adminCalcTitle}
                          onChange={(e) => setAdminCalcTitle(e.target.value)}
                          placeholder="Default: Kalkulator Build, Cooldown & Counter"
                          className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                        />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-slate-200 block">Subjudul Halaman Kalkulator</span>
                        <input
                          type="text"
                          value={adminCalcSub}
                          onChange={(e) => setAdminCalcSub(e.target.value)}
                          placeholder="Deskripsi halaman Kalkulator"
                          className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                        />
                      </label>

                      <label className="space-y-1 block">
                        <span className="text-slate-200 block">Judul Halaman Mini Game</span>
                        <input
                          type="text"
                          value={adminGameTitle}
                          onChange={(e) => setAdminGameTitle(e.target.value)}
                          placeholder="Default: Arena Kuis MLBB"
                          className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                        />
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-slate-200 block">Judul Halaman Profil</span>
                        <input
                          type="text"
                          value={adminProfileTitle}
                          onChange={(e) => setAdminProfileTitle(e.target.value)}
                          placeholder="Default: Profil Pemain"
                          className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {transparencyTab === 'shop' && (
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 space-y-5">
                  <div>
                    <h2 className="text-sm font-bold text-amber-300">
                      Kontrol Seluruh Harga Shop Skin, Tema Latar, Alat Kuis & Hadiah
                    </h2>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Perubahan langsung berlaku di Shop & Quest Game untuk semua pengguna secara real-time.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                    <label className="space-y-1 block">
                      <span className="text-slate-200 block">Skin Basic / Special (Diamond)</span>
                      <input
                        type="number"
                        value={adminSpecialPrice}
                        onChange={(e) => setAdminSpecialPrice(Number(e.target.value) || 0)}
                        className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white font-mono-num"
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-slate-200 block">Skin Epic (Diamond)</span>
                      <input
                        type="number"
                        value={adminEpicPrice}
                        onChange={(e) => setAdminEpicPrice(Number(e.target.value) || 0)}
                        className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white font-mono-num"
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-slate-200 block">Skin Legend (Poin Season)</span>
                      <input
                        type="number"
                        value={adminLegendPrice}
                        onChange={(e) => setAdminLegendPrice(Number(e.target.value) || 0)}
                        className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white font-mono-num"
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-slate-200 block">Skin Collector (Poin Season)</span>
                      <input
                        type="number"
                        value={adminCollectorPrice}
                        onChange={(e) => setAdminCollectorPrice(Number(e.target.value) || 0)}
                        className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white font-mono-num"
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-slate-200 block">Skin Limited (Poin Season)</span>
                      <input
                        type="number"
                        value={adminLimitedPrice}
                        onChange={(e) => setAdminLimitedPrice(Number(e.target.value) || 0)}
                        className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white font-mono-num"
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-slate-200 block">Tema Latar Reguler (Diamond)</span>
                      <input
                        type="number"
                        value={adminBgDiamondPrice}
                        onChange={(e) => setAdminBgDiamondPrice(Number(e.target.value) || 0)}
                        className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white font-mono-num"
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-slate-200 block">Tema Latar Limited (Poin Season)</span>
                      <input
                        type="number"
                        value={adminBgSeasonPrice}
                        onChange={(e) => setAdminBgSeasonPrice(Number(e.target.value) || 0)}
                        className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white font-mono-num"
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-slate-200 block">Alat Bantuan Jawaban (Diamond)</span>
                      <input
                        type="number"
                        value={adminHintPrice}
                        onChange={(e) => setAdminHintPrice(Number(e.target.value) || 0)}
                        className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white font-mono-num"
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-slate-200 block">Alat Tambah Waktu (Diamond)</span>
                      <input
                        type="number"
                        value={adminTimePrice}
                        onChange={(e) => setAdminTimePrice(Number(e.target.value) || 0)}
                        className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white font-mono-num"
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-slate-200 block">Hadiah Dasar Kuis (Diamond)</span>
                      <input
                        type="number"
                        value={adminQuizDiamondReward}
                        onChange={(e) => setAdminQuizDiamondReward(Number(e.target.value) || 0)}
                        className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white font-mono-num"
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-slate-200 block">Hadiah Dasar Kuis (Poin Season)</span>
                      <input
                        type="number"
                        value={adminQuizSeasonReward}
                        onChange={(e) => setAdminQuizSeasonReward(Number(e.target.value) || 0)}
                        className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white font-mono-num"
                      />
                    </label>
                  </div>
                </div>
              )}

              {transparencyTab === 'season' && (
                <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 space-y-5">
                  <div>
                    <h2 className="text-sm font-bold text-amber-300">
                      Konfigurasi Season Aktif & Reset Papan Peringkat
                    </h2>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Ubah nama & nomor Season yang tampil di Kuis & Papan Peringkat, atau mulai Season baru dengan mereset seluruh bintang peringkat pemain.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <label className="space-y-1 block">
                      <span className="text-slate-200 block">Nomor Season</span>
                      <input
                        type="number"
                        value={adminSeasonNum}
                        onChange={(e) => setAdminSeasonNum(Number(e.target.value) || 1)}
                        className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white font-mono-num"
                      />
                    </label>
                    <label className="space-y-1 block sm:col-span-2">
                      <span className="text-slate-200 block">Judul Papan Season</span>
                      <input
                        type="text"
                        value={adminSeasonTitle}
                        onChange={(e) => setAdminSeasonTitle(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-black/45 border border-white/20 text-white"
                      />
                    </label>
                  </div>

                  <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-rose-200">
                      Reset Season akan menghapus papan peringkat lama dan mengembalikan bintang seluruh pemain ke Warrior III (0 Bintang).
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        await resetSeasonLeaderboard();
                        setAdminMsg('Rank Leaderboard direset & Season baru telah dimulai!');
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold flex items-center justify-center gap-2 shrink-0"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset Rank & Mulai Season Baru</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={adminSaving}
                  onClick={handleSaveCreatorAll}
                  className="min-h-[46px] px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  <span>{adminSaving ? 'Menyimpan...' : 'Terapkan & Simpan Perubahan'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal "Pengaturan" */}
      {settingsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setSettingsModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-3xl max-h-[90vh] bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {ui.settingsTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-6">
              {/* Mode Tampilan: Terang / Sistem / Gelap */}
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  {ui.displayModeLabel}
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { key: 'light', label: ui.lightLabel, icon: Sun },
                      { key: 'system', label: ui.systemLabel, icon: Monitor },
                      { key: 'dark', label: ui.darkLabel, icon: Moon },
                    ] as Array<{ key: ThemeMode; label: string; icon: typeof Sun }>
                  ).map((m) => {
                    const Icon = m.icon;
                    const active = settings.themeMode === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setThemeMode(m.key)}
                        className={`min-h-[44px] px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                          active
                            ? 'btn-accent'
                            : 'bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Warna Tema Aksen */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <Palette className="w-4 h-4 text-accent" />
                  <span>{ui.accentColorLabel}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {ACCENT_PRESETS.map((preset) => {
                    const selected =
                      settings.accentColor.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setAccentColor(preset.hex)}
                        className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-colors ${
                          selected
                            ? 'btn-accent font-semibold'
                            : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0B0F17]'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/40"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <span>{preset.name}</span>
                      </button>
                    );
                  })}

                  <label className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0B0F17]">
                    <input
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span>Custom</span>
                  </label>
                </div>
              </div>

              {/* Animasi Perpindahan Halaman */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span>{ui.animationLabel}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ANIMATION_OPTIONS.map((anim) => {
                    const active = settings.pageAnimation === anim.key;
                    return (
                      <button
                        key={anim.key}
                        type="button"
                        onClick={() => setPageAnimation(anim.key)}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          active
                            ? 'btn-accent'
                            : 'bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>{anim.label}</span>
                          {active && <Check className="w-4 h-4 shrink-0" />}
                        </div>
                        <p className="text-[11px] opacity-80 mt-0.5">{anim.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bahasa Aplikasi & Data Hero (16 Negara dengan Bendera) */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <Globe className="w-4 h-4 text-accent" />
                  <span>{ui.languageLabel}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const active = settings.language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLanguage(lang.code)}
                        className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 text-left transition-colors ${
                          active
                            ? 'btn-accent font-semibold'
                            : 'bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-base leading-none">{lang.flag}</span>
                        <span className="truncate">{lang.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grafik & Kualitas Gambar */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <ImageIcon className="w-4 h-4 text-accent" />
                  <span>{ui.graphicsLabel}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {QUALITY_OPTIONS.map((opt) => {
                    const active = settings.imageQuality === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setImageQuality(opt.key)}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          active
                            ? 'btn-accent'
                            : 'bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>{opt.label}</span>
                          {active && <Check className="w-4 h-4 shrink-0" />}
                        </div>
                        <p className="text-[11px] opacity-80 mt-0.5">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hapus Cache */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                    Penyimpanan Sementara (Cache)
                  </span>
                  {cacheMsg && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-300 block mt-0.5">
                      {cacheMsg}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-semibold text-rose-600 dark:text-rose-200 flex items-center justify-center gap-2 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{ui.clearCache}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal "Akun" */}
      {accountModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setAccountModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl p-5 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {ui.accountBtn}
              </h2>
              <button
                type="button"
                onClick={() => setAccountModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 space-y-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {user.displayName || profile.nickname}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-300 pt-1">
                    Akun tersinkronisasi ke Cloud & Papan Peringkat
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await logoutAccount();
                    setAccountModalOpen(false);
                  }}
                  className="w-full min-h-[44px] rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-200 font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar dari Akun</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={handleGoogleLogin}
                  className="btn-accent w-full min-h-[46px] rounded-xl font-semibold text-sm transition-all"
                >
                  Masuk dengan Google
                </button>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                  <span>atau Email</span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-2.5">
                  {isRegisterMode && (
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Nama Panggilan"
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-100"
                    />
                  )}
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Alamat Email"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-100"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passInput}
                    onChange={(e) => setPassInput(e.target.value)}
                    placeholder="Kata Sandi (min. 6 karakter)"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-white/10 text-white font-semibold text-sm"
                  >
                    {isRegisterMode ? 'Daftar dengan Email' : 'Masuk dengan Email'}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setIsRegisterMode((v) => !v)}
                  className="w-full text-center text-xs text-accent hover:underline"
                >
                  {isRegisterMode
                    ? 'Sudah punya akun? Masuk di sini'
                    : 'Belum punya akun? Daftar baru'}
                </button>

                {authError && (
                  <p className="text-xs text-rose-600 dark:text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                    {authError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
