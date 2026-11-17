import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  CREATOR_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import type {
  AppConfig,
  EquippedHeroSkin,
  ImageQuality,
  LeaderboardEntry,
  PageAnimationType,
  PlayerProfile,
  ThemeMode,
} from '../types/mlbb';
import { clearMlbbApiCache } from '../services/mlbbApi';
import { getUiStrings, SUPPORTED_LANGUAGES } from '../utils/i18n';
import type { UiStrings } from '../utils/i18n';
import { getRankFromStars, resolveMlbbAccountIdentity } from '../utils/mlbbParser';

const DEFAULT_CONFIG: AppConfig = {
  appName: 'Dawn Codex',
  guideSubtitle: 'Panduan Taktis MLBB',
  creatorName: 'Hiikoo',
  globalBannerText: '',
  footerText: '',
  customHeroesTitle: '',
  customHeroesSubtitle: '',
  customDraftTitle: '',
  customDraftSubtitle: '',
  customItemsTitle: '',
  customItemsSubtitle: '',
  customCalcTitle: '',
  customCalcSubtitle: '',
  customGameTitle: '',
  customProfileTitle: '',
  seasonNumber: 1,
  seasonTitle: 'Season 1: Dawn Rising',
  seasonResetEpoch: 1,
  epicDiamondPrice: 120,
  specialDiamondPrice: 80,
  legendSeasonPrice: 250,
  collectorSeasonPrice: 400,
  limitedSeasonPrice: 320,
  bgDiamondPrice: 95,
  bgSeasonPrice: 240,
  hintDiamondPrice: 25,
  extraTimeDiamondPrice: 20,
  quizDiamondReward: 30,
  quizSeasonReward: 25,
};

const DEFAULT_PROFILE: PlayerProfile = {
  uid: 'guest',
  mlbbId: '',
  mlbbZone: '',
  nickname: 'Pemain Tamu',
  accountTier: 'Belum Terhubung',
  accountRole: '-',
  diamonds: 100,
  seasonPoints: 50,
  rankStars: 0,
  hintCount: 2,
  timeBoostCount: 2,
  ownedSkins: ['default'],
  equippedSkinId: 'default',
  equippedSkinUrl: '',
  ownedBgThemes: ['default'],
  equippedBgTheme: 'default',
  seasonEpoch: 1,
};

const STORAGE_SETTINGS_KEY = 'dawncodex_settings_v1';
const STORAGE_PROFILE_KEY = 'dawncodex_guest_profile_v1';
const STORAGE_HERO_SKINS_KEY = 'dawncodex_hero_skins_v1';

interface SettingsState {
  themeMode: ThemeMode;
  accentColor: string;
  language: string;
  imageQuality: ImageQuality;
  pageAnimation: PageAnimationType;
}

const DEFAULT_SETTINGS: SettingsState = {
  themeMode: 'dark',
  accentColor: '#F59E0B',
  language: 'id',
  imageQuality: 'tinggi',
  pageAnimation: 'fade',
};

function getContrastTextColor(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#0F172A';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? '#0F172A' : '#FFFFFF';
}

interface AppContextValue {
  user: User | null;
  authReady: boolean;
  isCreator: boolean;
  isDarkResolved: boolean;
  appConfig: AppConfig;
  profile: PlayerProfile;
  leaderboard: LeaderboardEntry[];
  settings: SettingsState;
  apiLang: string;
  ui: UiStrings;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: string) => void;
  setLanguage: (code: string) => void;
  setImageQuality: (q: ImageQuality) => void;
  setPageAnimation: (anim: PageAnimationType) => void;
  clearAppCache: () => { clearedBytes: number };
  equippedHeroSkins: Record<number, EquippedHeroSkin>;
  equipHeroSkin: (
    heroId: number,
    skin: { id: string; name: string; rarity: string; imageUrl: string; isDefault?: boolean }
  ) => Promise<void>;
  getHeroDisplayImage: (
    hero: { id: number; splash?: string; head?: string; smallmap?: string } | null | undefined,
    fallbackUrl?: string
  ) => string;
  getHeroActiveSkin: (heroId: number) => EquippedHeroSkin | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string, isRegister?: boolean, name?: string) => Promise<void>;
  logoutAccount: () => Promise<void>;
  bindMlbbId: (mlbbId: string, mlbbZone: string) => Promise<void>;
  updatePlayerProgress: (updater: (prev: PlayerProfile) => PlayerProfile) => Promise<void>;
  updateCreatorConfig: (partial: Partial<AppConfig>) => Promise<void>;
  resetSeasonLeaderboard: (newSeasonTitle?: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      /* ignore */
    }
    return DEFAULT_SETTINGS;
  });

  const [isDarkResolved, setIsDarkResolved] = useState(true);
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
      if (saved) return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
    } catch {
      /* ignore */
    }
    return DEFAULT_PROFILE;
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [equippedHeroSkins, setEquippedHeroSkins] = useState<Record<number, EquippedHeroSkin>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HERO_SKINS_KEY);
      if (saved) return JSON.parse(saved) as Record<number, EquippedHeroSkin>;
    } catch {
      /* ignore */
    }
    return {};
  });

  const isCreator = Boolean(user?.emailVerified && user.email === CREATOR_EMAIL);

  // Sync theme mode (light / dark / system), accent color, contrast text, language & RTL dir
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const shouldDark =
        settings.themeMode === 'dark' ||
        (settings.themeMode === 'system' && media.matches);
      setIsDarkResolved(shouldDark);
      if (shouldDark) root.classList.add('dark');
      else root.classList.remove('dark');

      root.style.setProperty('--accent-color', settings.accentColor);
      root.style.setProperty('--accent-contrast', getContrastTextColor(settings.accentColor));
      root.lang = settings.language;
      root.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    };

    applyTheme();
    media.addEventListener('change', applyTheme);
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    return () => media.removeEventListener('change', applyTheme);
  }, [settings]);

  // Listen to Firebase Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Listen to global AppConfig
  useEffect(() => {
    const ref = doc(db, 'app_config', 'global');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<AppConfig>;
          setAppConfig({ ...DEFAULT_CONFIG, ...data });
        }
      },
      (error) => {
        console.warn('AppConfig listener fallback:', error.message);
      }
    );
    return () => unsub();
  }, []);

  // Listen to authenticated user's profile in Firestore
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      try {
        const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
        if (saved) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(saved) });
        else setProfile(DEFAULT_PROFILE);
      } catch {
        setProfile(DEFAULT_PROFILE);
      }
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      userRef,
      async (snap) => {
        if (snap.exists()) {
          const rawData = snap.data() as Partial<PlayerProfile>;
          const mergedData: PlayerProfile = { ...DEFAULT_PROFILE, ...rawData };
          if (mergedData.seasonEpoch < appConfig.seasonResetEpoch) {
            const resetProfile: PlayerProfile = {
              ...mergedData,
              rankStars: 0,
              seasonEpoch: appConfig.seasonResetEpoch,
            };
            setProfile(resetProfile);
            if (user.emailVerified) {
              try {
                await setDoc(userRef, {
                  ...resetProfile,
                  updatedAt: serverTimestamp(),
                });
              } catch {
                /* ignore */
              }
            }
          } else {
            setProfile(mergedData);
          }
        } else if (user.emailVerified) {
          const initial: PlayerProfile = {
            ...DEFAULT_PROFILE,
            uid: user.uid,
            nickname: user.displayName || user.email?.split('@')[0] || 'Player',
            equippedSkinUrl: user.photoURL || '',
            seasonEpoch: appConfig.seasonResetEpoch,
          };
          setProfile(initial);
          try {
            await setDoc(userRef, { ...initial, updatedAt: serverTimestamp() });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
          }
        }
      },
      (err) => {
        console.warn('User profile listener error:', err.message);
      }
    );

    return () => unsub();
  }, [authReady, user, appConfig.seasonResetEpoch]);

  // Listen to Top 30 Leaderboard in real time
  useEffect(() => {
    const q = query(
      collection(db, 'leaderboard'),
      where('seasonEpoch', '==', appConfig.seasonResetEpoch),
      orderBy('rankStars', 'desc'),
      limit(30)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: LeaderboardEntry[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as LeaderboardEntry);
        });
        setLeaderboard(list);
      },
      (err) => {
        console.warn('Leaderboard query notice:', err.message);
      }
    );
    return () => unsub();
  }, [appConfig.seasonResetEpoch]);

  const syncLeaderboardEntry = useCallback(
    async (p: PlayerProfile, currentUser: User | null) => {
      if (!currentUser || !currentUser.emailVerified) return;
      const rankInfo = getRankFromStars(p.rankStars);
      const entry: LeaderboardEntry & { updatedAt: unknown } = {
        uid: currentUser.uid,
        displayName: p.nickname || currentUser.displayName || 'Player',
        mlbbId: p.mlbbId ? `${p.mlbbId}${p.mlbbZone ? ` (${p.mlbbZone})` : ''}` : '-',
        rankStars: p.rankStars,
        rankLabel: rankInfo.fullLabel,
        seasonPoints: p.seasonPoints,
        seasonEpoch: appConfig.seasonResetEpoch,
        avatarUrl: p.equippedSkinUrl || currentUser.photoURL || '',
        updatedAt: serverTimestamp(),
      };
      try {
        await setDoc(doc(db, 'leaderboard', currentUser.uid), entry);
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `leaderboard/${currentUser.uid}`
        );
      }
    },
    [appConfig.seasonResetEpoch]
  );

  const updatePlayerProgress = useCallback(
    async (updater: (prev: PlayerProfile) => PlayerProfile) => {
      let nextProfile: PlayerProfile | null = null;
      setProfile((prev) => {
        const computed = updater({ ...DEFAULT_PROFILE, ...prev });
        nextProfile = {
          ...DEFAULT_PROFILE,
          ...computed,
          seasonEpoch: appConfig.seasonResetEpoch,
        };
        try {
          if (!user) {
            localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(nextProfile));
          }
        } catch {
          /* ignore */
        }
        return nextProfile;
      });

      await Promise.resolve();
      if (nextProfile && user && user.emailVerified) {
        const payload = {
          ...(nextProfile as PlayerProfile),
          uid: user.uid,
          updatedAt: serverTimestamp(),
        };
        try {
          await setDoc(doc(db, 'users', user.uid), payload);
          await syncLeaderboardEntry(nextProfile, user);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      }
    },
    [user, appConfig.seasonResetEpoch, syncLeaderboardEntry]
  );

  const bindMlbbId = useCallback(
    async (mlbbId: string, mlbbZone: string) => {
      const cleanId = mlbbId.trim().slice(0, 24);
      const cleanZone = mlbbZone.trim().slice(0, 12);
      const resolved = resolveMlbbAccountIdentity(cleanId, cleanZone);
      if (!resolved.nickname) return;

      await updatePlayerProgress((prev) => ({
        ...prev,
        mlbbId: cleanId,
        mlbbZone: cleanZone,
        nickname: resolved.nickname,
        accountTier: resolved.accountTier,
        accountRole: resolved.accountRole,
      }));
    },
    [updatePlayerProgress]
  );

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string, isRegister = false, name = '') => {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    },
    []
  );

  const logoutAccount = useCallback(async () => {
    await signOut(auth);
  }, []);

  const updateCreatorConfig = useCallback(
    async (partial: Partial<AppConfig>) => {
      if (!isCreator) return;
      const merged: AppConfig = { ...appConfig, ...partial };
      setAppConfig(merged);
      try {
        await setDoc(doc(db, 'app_config', 'global'), {
          ...merged,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'app_config/global');
      }
    },
    [isCreator, appConfig]
  );

  const resetSeasonLeaderboard = useCallback(
    async (newSeasonTitle?: string) => {
      if (!isCreator) return;
      const nextEpoch = appConfig.seasonResetEpoch + 1;
      const nextNumber = appConfig.seasonNumber + 1;
      const nextTitle =
        newSeasonTitle?.trim() || `Season ${nextNumber}: Era Baru Land of Dawn`;

      await updateCreatorConfig({
        seasonNumber: nextNumber,
        seasonTitle: nextTitle,
        seasonResetEpoch: nextEpoch,
      });

      try {
        const snap = await getDocs(collection(db, 'leaderboard'));
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      } catch {
        try {
          const snap = await getDocs(collection(db, 'leaderboard'));
          for (const d of snap.docs) {
            await deleteDoc(d.ref);
          }
        } catch {
          /* ignore */
        }
      }

      await updatePlayerProgress((prev) => ({
        ...prev,
        rankStars: 0,
        seasonEpoch: nextEpoch,
      }));
    },
    [isCreator, appConfig, updateCreatorConfig, updatePlayerProgress]
  );

  const clearAppCache = useCallback(() => {
    clearMlbbApiCache();
    let clearedBytes = 0;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          k !== STORAGE_SETTINGS_KEY &&
          k !== STORAGE_PROFILE_KEY &&
          k !== STORAGE_HERO_SKINS_KEY &&
          !k.startsWith('firebase:')
        ) {
          keysToRemove.push(k);
          clearedBytes += (localStorage.getItem(k) || '').length;
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    return { clearedBytes };
  }, []);

  const equipHeroSkin = useCallback(
    async (
      heroId: number,
      skin: { id: string; name: string; rarity: string; imageUrl: string; isDefault?: boolean }
    ) => {
      setEquippedHeroSkins((prev) => {
        const next = { ...prev };
        if (skin.isDefault || skin.id.startsWith('hero-def-')) {
          delete next[heroId];
        } else {
          next[heroId] = {
            skinId: skin.id,
            skinName: skin.name,
            rarity: skin.rarity,
            imageUrl: skin.imageUrl,
          };
        }
        try {
          localStorage.setItem(STORAGE_HERO_SKINS_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });

      await updatePlayerProgress((prev) => ({
        ...prev,
        equippedSkinId: skin.id,
        equippedSkinUrl: skin.imageUrl,
      }));
    },
    [updatePlayerProgress]
  );

  const getHeroActiveSkin = useCallback(
    (heroId: number): EquippedHeroSkin | null => {
      const entry = equippedHeroSkins[heroId];
      if (!entry) return null;
      if (
        entry.skinId.startsWith('hero-def-') ||
        entry.skinId === 'default' ||
        profile.ownedSkins.includes(entry.skinId)
      ) {
        return entry;
      }
      return null;
    },
    [equippedHeroSkins, profile.ownedSkins]
  );

  const getHeroDisplayImage = useCallback(
    (
      hero: { id: number; splash?: string; head?: string; smallmap?: string } | null | undefined,
      fallbackUrl?: string
    ): string => {
      if (!hero) return fallbackUrl || '';
      const activeSkin = getHeroActiveSkin(hero.id);
      if (activeSkin?.imageUrl) return activeSkin.imageUrl;
      return hero.splash || fallbackUrl || hero.head || hero.smallmap || '';
    },
    [getHeroActiveSkin]
  );

  const apiLang = useMemo(() => {
    const found = SUPPORTED_LANGUAGES.find((l) => l.code === settings.language);
    return found?.apiLang || 'id';
  }, [settings.language]);

  const ui = useMemo(() => {
    const base = getUiStrings(settings.language);
    return {
      ...base,
      heroesTitle: appConfig.customHeroesTitle?.trim() || base.heroesTitle,
      heroesSubtitle: appConfig.customHeroesSubtitle?.trim() || base.heroesSubtitle,
      draftTitle: appConfig.customDraftTitle?.trim() || base.draftTitle,
      draftSubtitle: appConfig.customDraftSubtitle?.trim() || base.draftSubtitle,
      itemsTitle: appConfig.customItemsTitle?.trim() || base.itemsTitle,
      itemsSubtitle: appConfig.customItemsSubtitle?.trim() || base.itemsSubtitle,
      calcTitle: appConfig.customCalcTitle?.trim() || base.calcTitle,
      calcSubtitle: appConfig.customCalcSubtitle?.trim() || base.calcSubtitle,
      gameTitle: appConfig.customGameTitle?.trim() || base.gameTitle,
      profileTitle: appConfig.customProfileTitle?.trim() || base.profileTitle,
    };
  }, [settings.language, appConfig]);

  const value: AppContextValue = {
    user,
    authReady,
    isCreator,
    isDarkResolved,
    appConfig,
    profile,
    leaderboard,
    settings,
    apiLang,
    ui,
    setThemeMode: (themeMode) => setSettings((s) => ({ ...s, themeMode })),
    setAccentColor: (accentColor) => setSettings((s) => ({ ...s, accentColor })),
    setLanguage: (language) => setSettings((s) => ({ ...s, language })),
    setImageQuality: (imageQuality) => setSettings((s) => ({ ...s, imageQuality })),
    setPageAnimation: (pageAnimation) => setSettings((s) => ({ ...s, pageAnimation })),
    clearAppCache,
    equippedHeroSkins,
    equipHeroSkin,
    getHeroDisplayImage,
    getHeroActiveSkin,
    signInWithGoogle,
    signInWithEmail,
    logoutAccount,
    bindMlbbId,
    updatePlayerProgress,
    updateCreatorConfig,
    resetSeasonLeaderboard,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
