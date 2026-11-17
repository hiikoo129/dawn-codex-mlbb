import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Trophy,
  Sparkles,
  Clock,
  Lightbulb,
  ShoppingBag,
  Check,
  AlertCircle,
  RotateCcw,
  Search,
  Award,
  Layers,
  X,
  Star,
  ArrowLeft,
  Home,
  ChevronRight,
  Compass,
} from 'lucide-react';
import type {
  BgThemeOption,
  EquipmentItem,
  HeroDetail,
  HeroSummary,
  HeroWallpaper,
} from '../types/mlbb';
import { loadHeroDetail } from '../services/mlbbApi';
import { useAppContext } from '../context/AppContext';
import { getRankFromStars } from '../utils/mlbbParser';
import { buildAllBgThemes, getBgThemeById } from '../utils/bgThemes';
import { buildHeroSkinCatalog } from '../utils/skinCatalog';
import type { HeroSkinCatalog, SkinItem } from '../utils/skinCatalog';
import {
  ALL_LAND_OF_DAWN_REGIONS,
  resolveHeroOriginRegion,
} from '../utils/mlbbRegions';
import { GameImage } from '../components/GameImage';
import { RankBadge, RankStarsStrip } from '../components/RankBadge';

type QuizModeKey =
  | 'hero_name'
  | 'hero_image'
  | 'hero_lane'
  | 'hero_origin'
  | 'hero_from_region'
  | 'hero_attr'
  | 'hero_skill'
  | 'item_name';

const MODE_LABELS: Record<QuizModeKey, string> = {
  hero_name: 'Temukan Nama Hero',
  hero_image: 'Temukan Gambar Hero',
  hero_lane: 'Temukan Jalur Hero',
  hero_origin: 'Tebak Asal Wilayah Hero',
  hero_from_region: 'Tebak Hero dari Wilayahnya',
  hero_attr: 'Temukan Atribut Hero',
  hero_skill: 'Find Hero Skill',
  item_name: 'Tebak Item',
};

interface QuizQuestion {
  mode: QuizModeKey;
  modeLabel: string;
  difficultyLabel: string;
  prompt: string;
  image?: string;
  imageName?: string;
  isSquareIcon?: boolean;
  options: Array<{ id: string; label: string; image?: string }>;
  correctId: string;
  explanation: string;
}

interface MiniGamePageProps {
  heroes: HeroSummary[];
  equipment: EquipmentItem[];
  wallpapers: HeroWallpaper[];
  skinCatalog?: HeroSkinCatalog;
  allBgThemes?: BgThemeOption[];
  shopRedirect?: {
    section: 'default' | 'diamond' | 'limited' | 'helpers' | 'bgTheme';
    query: string;
    nonce: number;
  } | null;
  onGoHome?: () => void;
}

const RANK_ROADMAP = [
  { tier: 'Warrior', divs: 'III – I', starsPerDiv: '3★', timer: '50s', req: '0 – 8 Bintang', opts: '4 Opsi' },
  { tier: 'Elite', divs: 'III – I', starsPerDiv: '4★', timer: '46s', req: '9 – 20 Bintang', opts: '4 Opsi' },
  { tier: 'Master', divs: 'IV – I', starsPerDiv: '4★', timer: '43s', req: '21 – 36 Bintang', opts: '4 Opsi' },
  { tier: 'Grandmaster', divs: 'V – I', starsPerDiv: '5★', timer: '39s', req: '37 – 61 Bintang', opts: '5 Opsi' },
  { tier: 'Epic', divs: 'V – I', starsPerDiv: '5★', timer: '35s', req: '62 – 86 Bintang', opts: '5 Opsi' },
  { tier: 'Legend', divs: 'V – I', starsPerDiv: '5★', timer: '31s', req: '87 – 111 Bintang', opts: '5 Opsi' },
  { tier: 'Mythic', divs: 'Placement', starsPerDiv: '0–24★', timer: '27s', req: '112 – 136 Bintang', opts: '6 Opsi' },
  { tier: 'Mythical Honor', divs: 'Honor', starsPerDiv: '25–49★', timer: '24s', req: '137 – 161 Bintang', opts: '6 Opsi' },
  { tier: 'Mythical Glory', divs: 'Glory', starsPerDiv: '50–99★', timer: '21s', req: '162 – 211 Bintang', opts: '6 Opsi' },
  { tier: 'Mythical Immortal', divs: 'Immortal', starsPerDiv: '100+★', timer: '18s', req: '212+ Bintang', opts: '6 Opsi' },
];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getDifficultyFromTierIndex(tierIdx: number): {
  optionCount: number;
  label: string;
  tierKey: 'easy' | 'medium' | 'hard';
} {
  if (tierIdx <= 2) {
    return { optionCount: 4, label: 'Mudah (4 Pilihan)', tierKey: 'easy' };
  }
  if (tierIdx <= 5) {
    return { optionCount: 5, label: 'Menengah (5 Pilihan · Role Mirip)', tierKey: 'medium' };
  }
  return { optionCount: 6, label: 'Sulit / Mythic+ (6 Pilihan · Spesifik)', tierKey: 'hard' };
}

function pickHeroDistractors(
  target: HeroSummary,
  heroes: HeroSummary[],
  count: number,
  hardMode: boolean
): HeroSummary[] {
  const pool = heroes.filter((h) => h.id !== target.id);
  if (hardMode) {
    const sameRole = pool.filter((h) => h.roles.some((r) => target.roles.includes(r)));
    if (sameRole.length >= count) {
      return shuffleArray(sameRole).slice(0, count);
    }
  }
  return shuffleArray(pool).slice(0, count);
}

function buildMixedRankQuestion(
  heroes: HeroSummary[],
  equipment: EquipmentItem[],
  detailsCache: Record<number, HeroDetail>,
  rankTierIdx: number,
  lastMode?: QuizModeKey
): QuizQuestion | null {
  if (heroes.length < 8 || equipment.length < 8) return null;

  const diff = getDifficultyFromTierIndex(rankTierIdx);
  const heroOptCount = diff.optionCount;
  const isHardOrMed = diff.tierKey !== 'easy';

  const cachedDetails = Object.values(detailsCache).filter((d) => d.skills && d.skills.length > 0);

  const availableModes: QuizModeKey[] = [
    'hero_name',
    'hero_image',
    'hero_lane',
    'hero_origin',
    'hero_from_region',
    'hero_attr',
    'item_name',
  ];
  if (cachedDetails.length >= 2) {
    availableModes.push('hero_skill');
  }

  const candidateModes = availableModes.filter((m) => m !== lastMode);
  const mode = candidateModes[Math.floor(Math.random() * candidateModes.length)] || 'hero_name';

  // 1. Temukan Nama Hero
  if (mode === 'hero_name') {
    const target = heroes[Math.floor(Math.random() * heroes.length)];
    const distractors = pickHeroDistractors(target, heroes, heroOptCount - 1, isHardOrMed);
    return {
      mode,
      modeLabel: MODE_LABELS[mode],
      difficultyLabel: diff.label,
      prompt: 'Temukan nama hero Mobile Legends pada gambar di bawah ini!',
      image: target.splash || target.head || target.smallmap,
      imageName: target.name,
      options: shuffleArray([target, ...distractors]).map((h) => ({
        id: String(h.id),
        label: h.name,
      })),
      correctId: String(target.id),
      explanation: `Hero pada gambar adalah ${target.name} (${target.roles.join(' / ')}).`,
    };
  }

  // 2. Temukan Gambar Hero
  if (mode === 'hero_image') {
    const target = heroes[Math.floor(Math.random() * heroes.length)];
    const distractors = pickHeroDistractors(target, heroes, heroOptCount - 1, isHardOrMed);
    const clue = diff.tierKey === 'easy' ? ` (${target.roles[0]})` : '';
    return {
      mode,
      modeLabel: MODE_LABELS[mode],
      difficultyLabel: diff.label,
      prompt: `Temukan gambar potret yang benar untuk hero "${target.name}"${clue}!`,
      options: shuffleArray([target, ...distractors]).map((h) => ({
        id: String(h.id),
        label: diff.tierKey === 'hard' ? 'Pilih Gambar Ini' : h.name,
        image: h.splash || h.head || h.smallmap,
      })),
      correctId: String(target.id),
      explanation: `${target.name} memiliki peran ${target.roles.join(' / ')}.`,
    };
  }

  // 3. Temukan Jalur Hero
  if (mode === 'hero_lane') {
    const withLane = heroes.filter((h) => h.lanes.length > 0);
    if (withLane.length >= 4) {
      const target = withLane[Math.floor(Math.random() * withLane.length)];
      const correctLane = target.lanes[0];
      const allLanes = ['Gold Lane', 'Exp Lane', 'Mid Lane', 'Jungle', 'Roam'];
      const distractors = shuffleArray(
        allLanes.filter((l) => !target.lanes.includes(l as never))
      ).slice(0, Math.min(allLanes.length - 1, heroOptCount - 1));
      return {
        mode,
        modeLabel: MODE_LABELS[mode],
        difficultyLabel: diff.label,
        prompt: `Di jalur (Lane) manakah hero ${target.name} paling utama dimainkan?`,
        image: target.splash || target.head || target.smallmap,
        imageName: target.name,
        options: shuffleArray([correctLane, ...distractors]).map((l) => ({ id: l, label: l })),
        correctId: correctLane,
        explanation: `${target.name} utama ditempatkan di ${target.lanes.join(', ')}.`,
      };
    }
  }

  // 4. Tebak Asal Wilayah Hero
  if (mode === 'hero_origin') {
    const target = heroes[Math.floor(Math.random() * heroes.length)];
    const detail = detailsCache[target.id];
    const correctRegion = resolveHeroOriginRegion(target, detail);
    const distractors = shuffleArray(
      ALL_LAND_OF_DAWN_REGIONS.filter((r) => r !== correctRegion)
    ).slice(0, heroOptCount - 1);
    return {
      mode,
      modeLabel: MODE_LABELS[mode],
      difficultyLabel: diff.label,
      prompt: `Dari wilayah Land of Dawn manakah asal hero ${target.name}?`,
      image: target.splash || target.head || target.smallmap,
      imageName: target.name,
      options: shuffleArray([correctRegion, ...distractors]).map((r) => ({ id: r, label: r })),
      correctId: correctRegion,
      explanation: `${target.name} berasal dari wilayah ${correctRegion} di Land of Dawn.`,
    };
  }

  // 5. Tebak Hero dari Wilayahnya
  if (mode === 'hero_from_region') {
    const targetRegion =
      ALL_LAND_OF_DAWN_REGIONS[Math.floor(Math.random() * ALL_LAND_OF_DAWN_REGIONS.length)];
    const inRegion = heroes.filter(
      (h) => resolveHeroOriginRegion(h, detailsCache[h.id]) === targetRegion
    );
    const outRegion = heroes.filter(
      (h) => resolveHeroOriginRegion(h, detailsCache[h.id]) !== targetRegion
    );
    if (inRegion.length >= 1 && outRegion.length >= heroOptCount - 1) {
      const targetHero = inRegion[Math.floor(Math.random() * inRegion.length)];
      const distractors = shuffleArray(outRegion).slice(0, heroOptCount - 1);
      return {
        mode,
        modeLabel: MODE_LABELS[mode],
        difficultyLabel: diff.label,
        prompt: `Manakah di antara hero berikut yang berasal dari wilayah "${targetRegion}"?`,
        options: shuffleArray([targetHero, ...distractors]).map((h) => ({
          id: String(h.id),
          label: h.name,
          image: diff.tierKey === 'easy' ? h.splash || h.head || h.smallmap : undefined,
        })),
        correctId: String(targetHero.id),
        explanation: `${targetHero.name} merupakan hero yang berasal dari wilayah ${targetRegion}.`,
      };
    }
  }

  // 6. Temukan Atribut Hero (Role / Speciality / Atribut Tertinggi)
  if (mode === 'hero_attr') {
    if (cachedDetails.length >= 1 && Math.random() > 0.35) {
      const det = cachedDetails[Math.floor(Math.random() * cachedDetails.length)];
      const ab = det.ability;
      const attrs = [
        { key: 'Durability (Ketahanan)', val: ab.durability },
        { key: 'Offense (Serangan)', val: ab.offense },
        { key: 'Control Effect (Efek CC)', val: ab.control },
        { key: 'Difficulty (Tingkat Kesulitan)', val: ab.difficulty },
      ].sort((a, b) => b.val - a.val);
      const topAttr = attrs[0];
      return {
        mode,
        modeLabel: MODE_LABELS[mode],
        difficultyLabel: diff.label,
        prompt: `Atribut manakah yang memiliki nilai TERTINGGI pada hero ${det.name}${
          det.speciality.length > 0 ? ` (Spesialitas: ${det.speciality.join(', ')})` : ''
        }?`,
        image: det.painting || det.headBig || det.head,
        imageName: det.name,
        options: shuffleArray(attrs).map((a) => ({ id: a.key, label: a.key })),
        correctId: topAttr.key,
        explanation: `Atribut tertinggi ${det.name} adalah ${topAttr.key} (${topAttr.val}/100).`,
      };
    }
    const target = heroes[Math.floor(Math.random() * heroes.length)];
    const correctRole = target.roles[0];
    const allRoles = ['Tank', 'Fighter', 'Assassin', 'Mage', 'Marksman', 'Support'];
    const distractors = shuffleArray(allRoles.filter((r) => !target.roles.includes(r as never))).slice(
      0,
      Math.min(allRoles.length - 1, heroOptCount - 1)
    );
    return {
      mode,
      modeLabel: MODE_LABELS[mode],
      difficultyLabel: diff.label,
      prompt: `Atribut Role utama apakah yang dimiliki oleh hero ${target.name}?`,
      image: target.splash || target.head || target.smallmap,
      imageName: target.name,
      options: shuffleArray([correctRole, ...distractors]).map((r) => ({ id: r, label: r })),
      correctId: correctRole,
      explanation: `${target.name} memiliki atribut peran utama ${target.roles.join(' / ')}.`,
    };
  }

  // 7. Find Hero Skill
  if (mode === 'hero_skill' && cachedDetails.length >= 2) {
    const det = cachedDetails[Math.floor(Math.random() * cachedDetails.length)];
    const activeSkills = det.skills.filter((s) => s.skillname && s.skillicon);
    const chosenSkill =
      activeSkills[Math.floor(Math.random() * activeSkills.length)] || det.skills[0];
    const targetSummary = heroes.find((h) => h.id === det.id) || heroes[0];
    const distractors = pickHeroDistractors(targetSummary, heroes, heroOptCount - 1, isHardOrMed);
    return {
      mode,
      modeLabel: MODE_LABELS[mode],
      difficultyLabel: diff.label,
      prompt: `Find Hero Skill! Pemilik skill "${chosenSkill.skillname}" pada ikon berikut adalah...`,
      image: chosenSkill.skillicon,
      imageName: chosenSkill.skillname,
      isSquareIcon: true,
      options: shuffleArray([targetSummary, ...distractors]).map((h) => ({
        id: String(h.id),
        label: h.name,
      })),
      correctId: String(targetSummary.id),
      explanation: `Skill "${chosenSkill.skillname}" adalah milik hero ${det.name}.`,
    };
  }

  // 8. Tebak Item
  const completedItems = equipment.filter((e) => e.tier === 'jadi');
  const itemPool = completedItems.length >= heroOptCount ? completedItems : equipment;
  const targetItem = itemPool[Math.floor(Math.random() * itemPool.length)];
  const sameCatPool = itemPool.filter(
    (e) => e.id !== targetItem.id && e.category === targetItem.category
  );
  const itemDistractors =
    isHardOrMed && sameCatPool.length >= heroOptCount - 1
      ? shuffleArray(sameCatPool).slice(0, heroOptCount - 1)
      : shuffleArray(itemPool.filter((e) => e.id !== targetItem.id)).slice(0, heroOptCount - 1);

  return {
    mode: 'item_name',
    modeLabel: MODE_LABELS.item_name,
    difficultyLabel: diff.label,
    prompt: `Tebak nama Item perlengkapan (${targetItem.category}) pada ikon berikut!`,
    image: targetItem.icon,
    imageName: targetItem.name,
    isSquareIcon: true,
    options: shuffleArray([targetItem, ...itemDistractors]).map((it) => ({
      id: String(it.id),
      label: it.name,
    })),
    correctId: String(targetItem.id),
    explanation: `${targetItem.name} (${targetItem.rawTips.join(', ') || targetItem.category}).`,
  };
}

export const MiniGamePage = memo(function MiniGamePage({
  heroes,
  equipment,
  wallpapers,
  skinCatalog: passedSkinCatalog,
  allBgThemes: passedBgThemes,
  shopRedirect,
  onGoHome,
}: MiniGamePageProps) {
  const {
    apiLang,
    appConfig,
    profile,
    leaderboard,
    ui,
    updatePlayerProgress,
    equipHeroSkin,
    getHeroActiveSkin,
  } = useAppContext();

  // Fullscreen Navigation State: null = Mini Game Lobby, 'quiz' | 'shop' | 'leaderboard' = Fullscreen View
  const [activeFullscreen, setActiveFullscreen] = useState<
    'quiz' | 'shop' | 'leaderboard' | null
  >(null);

  // Shop tabs: Default (Gratis), Skin Diamond, Tema Latar (termasuk Limited Poin Season), Alat Bantuan
  const [shopSection, setShopSection] = useState<
    'default' | 'diamond' | 'bgTheme' | 'helpers'
  >('diamond');
  const [bgFilter, setBgFilter] = useState<'all' | 'diamond' | 'limited'>('all');
  const [skinQuery, setSkinQuery] = useState('');
  const [visibleSkinCount, setVisibleSkinCount] = useState(24);
  const [tierModalOpen, setTierModalOpen] = useState(false);

  // Cache of HeroDetails for "Find Hero Skill" & "Temukan Atribut Hero"
  const [heroDetailsCache, setHeroDetailsCache] = useState<Record<number, HeroDetail>>({});
  const prefetchedRef = useRef(false);

  useEffect(() => {
    if (prefetchedRef.current || heroes.length === 0) return;
    prefetchedRef.current = true;
    const sample = shuffleArray(heroes).slice(0, 14);
    Promise.all(
      sample.map((h) =>
        loadHeroDetail(h.id, apiLang)
          .then((d) => [h.id, d] as const)
          .catch(() => null)
      )
    ).then((res) => {
      const next: Record<number, HeroDetail> = {};
      for (const item of res) {
        if (item) next[item[0]] = item[1];
      }
      if (Object.keys(next).length > 0) {
        setHeroDetailsCache((prev) => ({ ...prev, ...next }));
      }
    });
  }, [heroes, apiLang]);

  useEffect(() => {
    if (!shopRedirect) return;
    setActiveFullscreen('shop');
    if (shopRedirect.section === 'limited') {
      setShopSection('bgTheme');
      setBgFilter('limited');
    } else {
      setShopSection(shopRedirect.section);
    }
    setSkinQuery(shopRedirect.query);
  }, [shopRedirect]);

  // Quiz state
  const [quizPhase, setQuizPhase] = useState<'idle' | 'playing' | 'failed' | 'won'>('idle');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selectedWrongId, setSelectedWrongId] = useState<string | null>(null);
  const [revealedCorrectId, setRevealedCorrectId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(50);

  const rankInfo = useMemo(() => getRankFromStars(profile.rankStars), [profile.rankStars]);

  const { defaultSkins, diamondSkins, limitedSkins } = useMemo(
    () => passedSkinCatalog || buildHeroSkinCatalog(heroes, wallpapers, appConfig),
    [passedSkinCatalog, heroes, wallpapers, appConfig]
  );

  const allBgThemes = useMemo(
    () => passedBgThemes || buildAllBgThemes(wallpapers, heroes, appConfig),
    [passedBgThemes, wallpapers, heroes, appConfig]
  );

  const activeSkinPool = shopSection === 'default' ? defaultSkins : diamondSkins;
  const filteredSkins = useMemo(() => {
    if (shopSection !== 'default' && shopSection !== 'diamond') return [];
    const q = skinQuery.trim().toLowerCase();
    if (!q) return activeSkinPool;
    return activeSkinPool.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.heroName.toLowerCase().includes(q) ||
        s.rarity.toLowerCase().includes(q)
    );
  }, [activeSkinPool, skinQuery, shopSection]);

  const filteredLimitedSkins = useMemo(() => {
    const q = skinQuery.trim().toLowerCase();
    if (!q) return limitedSkins;
    return limitedSkins.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.heroName.toLowerCase().includes(q) ||
        s.rarity.toLowerCase().includes(q)
    );
  }, [limitedSkins, skinQuery]);

  const displayedSkins = useMemo(
    () => filteredSkins.slice(0, visibleSkinCount),
    [filteredSkins, visibleSkinCount]
  );

  useEffect(() => {
    setVisibleSkinCount(24);
  }, [shopSection, skinQuery, bgFilter]);

  const startRound = useCallback(() => {
    const q = buildMixedRankQuestion(
      heroes,
      equipment,
      heroDetailsCache,
      rankInfo.tierIndex
    );
    if (!q) return;
    setQuestion(q);
    setQuestionIndex(0);
    setSelectedWrongId(null);
    setRevealedCorrectId(null);
    setTimeLeft(rankInfo.timerSeconds);
    setQuizPhase('playing');
  }, [heroes, equipment, heroDetailsCache, rankInfo.tierIndex, rankInfo.timerSeconds]);

  useEffect(() => {
    if (quizPhase !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setQuizPhase('failed');
          setRevealedCorrectId(question?.correctId || null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quizPhase, question?.correctId]);

  async function handleAnswer(optionId: string) {
    if (quizPhase !== 'playing' || !question) return;

    if (optionId !== question.correctId) {
      setSelectedWrongId(optionId);
      setRevealedCorrectId(question.correctId);
      setQuizPhase('failed');
      return;
    }

    const nextIdx = questionIndex + 1;
    if (nextIdx >= 10) {
      setQuizPhase('won');
      const diaReward = appConfig.quizDiamondReward ?? 30;
      const ptReward = appConfig.quizSeasonReward ?? 25;
      await updatePlayerProgress((prev) => ({
        ...prev,
        rankStars: prev.rankStars + 1,
        diamonds: prev.diamonds + diaReward,
        seasonPoints: prev.seasonPoints + ptReward,
      }));
    } else {
      setQuestionIndex(nextIdx);
      setRevealedCorrectId(null);
      setSelectedWrongId(null);
      setQuestion(
        buildMixedRankQuestion(
          heroes,
          equipment,
          heroDetailsCache,
          rankInfo.tierIndex,
          question.mode
        )
      );
    }
  }

  async function handleBuyHelper(type: 'hint' | 'time') {
    const cost =
      type === 'hint' ? appConfig.hintDiamondPrice : appConfig.extraTimeDiamondPrice;
    if (profile.diamonds < cost) return;
    await updatePlayerProgress((prev) => ({
      ...prev,
      diamonds: prev.diamonds - cost,
      hintCount: type === 'hint' ? prev.hintCount + 1 : prev.hintCount,
      timeBoostCount: type === 'time' ? prev.timeBoostCount + 1 : prev.timeBoostCount,
    }));
  }

  async function handleUseHint() {
    if (quizPhase !== 'playing' || !question || profile.hintCount <= 0) return;
    setRevealedCorrectId(question.correctId);
    await updatePlayerProgress((prev) => ({
      ...prev,
      hintCount: Math.max(0, prev.hintCount - 1),
    }));
  }

  async function handleUseTimeBoost() {
    if (quizPhase !== 'playing' || profile.timeBoostCount <= 0) return;
    setTimeLeft((t) => t + 15);
    await updatePlayerProgress((prev) => ({
      ...prev,
      timeBoostCount: Math.max(0, prev.timeBoostCount - 1),
    }));
  }

  async function handleBuyOrEquipSkin(skin: SkinItem) {
    const alreadyOwned =
      skin.isDefault || skin.currency === 'free' || profile.ownedSkins.includes(skin.id);
    if (alreadyOwned) {
      if (skin.heroId) {
        await equipHeroSkin(skin.heroId, skin);
      } else {
        await updatePlayerProgress((prev) => ({
          ...prev,
          equippedSkinId: skin.id,
          equippedSkinUrl: skin.imageUrl,
        }));
      }
      return;
    }

    if (skin.currency === 'diamond') {
      if (profile.diamonds < skin.price) return;
      await updatePlayerProgress((prev) => ({
        ...prev,
        diamonds: prev.diamonds - skin.price,
        ownedSkins: prev.ownedSkins.includes(skin.id)
          ? prev.ownedSkins
          : [...prev.ownedSkins, skin.id],
        equippedSkinId: skin.id,
        equippedSkinUrl: skin.imageUrl,
      }));
      if (skin.heroId) await equipHeroSkin(skin.heroId, skin);
    } else if (skin.currency === 'seasonPoints') {
      if (profile.seasonPoints < skin.price) return;
      await updatePlayerProgress((prev) => ({
        ...prev,
        seasonPoints: prev.seasonPoints - skin.price,
        ownedSkins: prev.ownedSkins.includes(skin.id)
          ? prev.ownedSkins
          : [...prev.ownedSkins, skin.id],
        equippedSkinId: skin.id,
        equippedSkinUrl: skin.imageUrl,
      }));
      if (skin.heroId) await equipHeroSkin(skin.heroId, skin);
    }
  }

  async function handleBuyOrEquipBgTheme(theme: BgThemeOption) {
    const ownedList = profile.ownedBgThemes || ['default'];
    const alreadyOwned = theme.currency === 'free' || ownedList.includes(theme.id);
    if (alreadyOwned) {
      await updatePlayerProgress((prev) => ({
        ...prev,
        equippedBgTheme: theme.id,
      }));
      return;
    }

    if (theme.currency === 'diamond') {
      if (profile.diamonds < theme.price) return;
      await updatePlayerProgress((prev) => ({
        ...prev,
        diamonds: prev.diamonds - theme.price,
        ownedBgThemes: [...(prev.ownedBgThemes || ['default']), theme.id],
        equippedBgTheme: theme.id,
      }));
    } else if (theme.currency === 'seasonPoints') {
      if (profile.seasonPoints < theme.price) return;
      await updatePlayerProgress((prev) => ({
        ...prev,
        seasonPoints: prev.seasonPoints - theme.price,
        ownedBgThemes: [...(prev.ownedBgThemes || ['default']), theme.id],
        equippedBgTheme: theme.id,
      }));
    }
  }

  const activeBg = getBgThemeById(profile.equippedBgTheme || 'default', allBgThemes);
  const diaReward = appConfig.quizDiamondReward ?? 30;
  const ptReward = appConfig.quizSeasonReward ?? 25;

  return (
    <div className="space-y-6">
      {/* Lobby Rank & Status Header */}
      <section className="bg-white dark:bg-[#131A26] border border-amber-400/40 rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            {profile.equippedSkinUrl && (
              <div className="relative shrink-0">
                <GameImage
                  src={profile.equippedSkinUrl}
                  name={profile.nickname || 'Tampilan Skin'}
                  fullFrame
                  className="w-24 h-16 sm:w-28 sm:h-18 border-2 border-amber-400/70 shadow-md"
                  rounded="xl"
                />
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10 px-1.5 py-0.5 rounded bg-slate-900/90 text-[9px] font-bold text-amber-300 whitespace-nowrap border border-amber-400/40">
                  Tampilan
                </span>
              </div>
            )}
            <RankBadge tierName={rankInfo.tierName} size="lg" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-accent">
                  {appConfig.seasonTitle}
                </span>
                <button
                  type="button"
                  onClick={() => setTierModalOpen(true)}
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-[#1A2333] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:border-amber-400 transition-colors"
                >
                  Lihat Tier &amp; Bintang MLBB
                </button>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {ui.gameTitle} · {rankInfo.fullLabel}
              </h1>
              <RankStarsStrip rank={rankInfo} />
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                Timer Rank: <span className="font-mono-num font-semibold">{rankInfo.timerSeconds} detik</span> · Tema Latar: <strong>{activeBg.name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-sky-500/10 border border-sky-500/25 text-xs font-mono-num">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Diamond</span>
              <span className="font-bold text-sky-600 dark:text-sky-300">{profile.diamonds}</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs font-mono-num">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Poin Season</span>
              <span className="font-bold text-amber-600 dark:text-amber-300">{profile.seasonPoints}</span>
            </div>
          </div>
        </div>

        {/* Lobby Interactive Fullscreen Entry Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4 border-t border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveFullscreen('quiz')}
            className="group p-4 sm:p-5 rounded-2xl btn-accent text-left flex items-center justify-between gap-3 shadow-md transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-black/15 flex items-center justify-center shrink-0">
                <Play className="w-6 h-6 fill-current" />
              </div>
              <div className="min-w-0">
                <span className="text-base font-bold block truncate">{ui.questTab}</span>
                <span className="text-xs opacity-85 block truncate">
                  8 Mode Kuis Campuran · Skalasi Rank
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => setActiveFullscreen('shop')}
            className="group p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#0B0F17] hover:border-accent border border-slate-200 dark:border-white/10 text-left flex items-center justify-between gap-3 transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-base font-bold text-slate-900 dark:text-slate-100 block truncate">
                  {ui.skinShopTitle}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                  Skin Diamond · Tema Latar &amp; Limited
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-accent shrink-0 transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => setActiveFullscreen('leaderboard')}
            className="group p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#0B0F17] hover:border-accent border border-slate-200 dark:border-white/10 text-left flex items-center justify-between gap-3 transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-amber-400/15 text-amber-500 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-base font-bold text-slate-900 dark:text-slate-100 block truncate">
                  {ui.leaderboardTitle}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                  {leaderboard.length}/30 Pemain Aktif Musim Ini
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-accent shrink-0 transition-colors" />
          </button>
        </div>
      </section>

      {/* Lobby Summary: 8 Mixed Quiz Modes & Active Quests */}
      <section className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          <Compass className="w-4 h-4 text-accent" />
          <span>8 Mode Quest Kuis Campuran (Menyesuaikan Rank {rankInfo.tierName})</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {Object.entries(MODE_LABELS).map(([k, label]) => (
            <div
              key={k}
              className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 font-medium text-slate-700 dark:text-slate-200"
            >
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* FULLSCREEN OVERLAY VIEW (Quest Game / Shop Skin & Tema / Papan Peringkat) */}
      {activeFullscreen !== null && (
        <div className="fixed inset-0 z-50 bg-[#F4F6FA] dark:bg-[#0B0F17] flex flex-col overflow-hidden">
          {/* Fullscreen Sticky Top Bar with Back Arrow & Home Button */}
          <header className="h-14 sm:h-16 shrink-0 bg-white/95 dark:bg-[#131A26]/95 border-b border-slate-200 dark:border-white/10 px-3 sm:px-6 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setActiveFullscreen(null)}
                aria-label="Kembali ke Mini Game"
                className="min-h-[40px] px-3 rounded-xl bg-slate-100 dark:bg-[#1A2333] hover:bg-slate-200 dark:hover:bg-[#232F44] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-xs font-semibold shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Kembali</span>
              </button>

              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {activeFullscreen === 'quiz'
                  ? ui.questTab
                  : activeFullscreen === 'shop'
                  ? ui.skinShopTitle
                  : ui.leaderboardTitle}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/25 font-mono-num text-[11px] font-bold text-sky-600 dark:text-sky-300">
                💎 {profile.diamonds}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 font-mono-num text-[11px] font-bold text-amber-600 dark:text-amber-300">
                🏆 {profile.seasonPoints}
              </span>
              {onGoHome && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveFullscreen(null);
                    onGoHome();
                  }}
                  aria-label="Ke Beranda Utama"
                  className="btn-accent min-h-[40px] px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold shrink-0"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Home</span>
                </button>
              )}
            </div>
          </header>

          {/* Fullscreen Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 pb-12">
              {/* FULLSCREEN 1: QUEST GAME */}
              {activeFullscreen === 'quiz' && (
                <section className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
                  {quizPhase === 'idle' && (
                    <div className="space-y-6">
                      <div className="py-6 text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-accent mx-auto">
                          <Sparkles className="w-8 h-8" />
                        </div>
                        <div className="max-w-lg mx-auto space-y-1.5">
                          <span className="inline-block px-3 py-1 rounded-lg bg-amber-400/15 text-accent text-xs font-bold">
                            Rank: {rankInfo.fullLabel} · {getDifficultyFromTierIndex(rankInfo.tierIndex).label}
                          </span>
                          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                            Arena Quest Game 8 Mode Campuran
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Waktu tidak berjalan sebelum tombol <strong>Start</strong> ditekan. Jawab 10 soal campuran (Nama, Gambar, Lane, Asal Wilayah, Hero Wilayah, Atribut, Skill &amp; Item) dalam {rankInfo.timerSeconds} detik untuk meraih <strong>+1 Bintang</strong>, <strong>+{diaReward} Diamond</strong>, dan <strong>+{ptReward} Poin Season</strong>.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={startRound}
                            className="btn-accent min-h-[48px] px-8 py-3 rounded-xl font-bold text-sm inline-flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span>{ui.startQuiz}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveFullscreen('shop');
                              setShopSection('helpers');
                            }}
                            className="min-h-[48px] px-5 py-3 rounded-xl bg-slate-100 dark:bg-[#1A2333] hover:bg-slate-200 dark:hover:bg-[#232F44] border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-2 transition-colors"
                          >
                            <Lightbulb className="w-4 h-4 text-accent" />
                            <span>Alat Bantuan ({profile.hintCount} Jawaban · {profile.timeBoostCount} +15s)</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                          <Award className="w-4 h-4 text-accent" />
                          <span>Misi Quest Game Aktif</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 space-y-1">
                            <p className="font-bold text-slate-900 dark:text-slate-100">
                              Misi 1: Menang Kuis 10/10
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">
                              Hadiah: +1 Bintang, +{diaReward} Diamond, +{ptReward} Poin Season
                            </p>
                          </div>
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 space-y-1">
                            <p className="font-bold text-slate-900 dark:text-slate-100">
                              Misi 2: Tembus Tier Elite ({Math.min(profile.rankStars, 9)}/9★)
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">
                              {profile.rankStars >= 9 ? 'Tercapai! Lanjut ke Master' : 'Kumpulkan 9 bintang dari kuis'}
                            </p>
                          </div>
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 space-y-1">
                            <p className="font-bold text-slate-900 dark:text-slate-100">
                              Misi 3: Kolektor ({profile.ownedSkins.length} Skin · {(profile.ownedBgThemes || ['default']).length} Latar)
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">
                              Buka skin Diamond &amp; koleksi Limited di Tema Latar Shop
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {quizPhase === 'playing' && question && (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                          <span className="text-slate-600 dark:text-slate-300">
                            Soal{' '}
                            <span className="font-mono-num text-accent font-bold">
                              {questionIndex + 1}/10
                            </span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-700 dark:text-amber-300 font-bold">
                            {question.modeLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                            {question.difficultyLabel}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={profile.hintCount <= 0}
                            onClick={handleUseHint}
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-amber-400/15 text-amber-700 dark:text-amber-200 border border-amber-400/40 text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5"
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span>Jawaban ({profile.hintCount})</span>
                          </button>
                          <button
                            type="button"
                            disabled={profile.timeBoostCount <= 0}
                            onClick={handleUseTimeBoost}
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-200 border border-sky-400/40 text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>+15s ({profile.timeBoostCount})</span>
                          </button>
                        </div>

                        <div
                          className={`font-mono-num text-sm font-bold flex items-center gap-1.5 ${
                            timeLeft <= 10 ? 'text-rose-500' : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          <Clock className="w-4 h-4" />
                          <span>{timeLeft}s</span>
                        </div>
                      </div>

                      <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 transition-all"
                          style={{ width: `${((questionIndex + 1) / 10) * 100}%` }}
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                        {question.image && (
                          <GameImage
                            src={question.image}
                            name={question.imageName || 'Kuis'}
                            fullFrame={!question.isSquareIcon}
                            className={
                              question.isSquareIcon
                                ? 'w-20 h-20 shrink-0'
                                : 'w-full sm:w-52 aspect-[16/10] shrink-0'
                            }
                            rounded="xl"
                          />
                        )}
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 text-center sm:text-left">
                          {question.prompt}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {question.options.map((opt) => {
                          const isRevealedCorrect = revealedCorrectId === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleAnswer(opt.id)}
                              className={`min-h-[60px] p-3.5 rounded-xl border text-left font-semibold text-sm flex items-center gap-3 transition-all ${
                                isRevealedCorrect
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-700 dark:text-emerald-200'
                                  : 'bg-slate-50 dark:bg-[#0B0F17] hover:bg-slate-100 dark:hover:bg-[#1A2333] border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {opt.image && (
                                <GameImage
                                  src={opt.image}
                                  name={opt.label}
                                  fullFrame
                                  className="w-24 aspect-[16/10] shrink-0"
                                  rounded="lg"
                                />
                              )}
                              <span className="flex-1">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {quizPhase === 'failed' && question && (
                    <div className="py-6 space-y-5">
                      <div className="flex items-center gap-3 text-rose-600 dark:text-rose-300">
                        <AlertCircle className="w-6 h-6 shrink-0" />
                        <div>
                          <h3 className="text-lg font-bold">
                            {timeLeft === 0 ? 'Waktu Habis — Ronde Gagal!' : 'Jawaban Salah — Ronde Gagal!'}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Progres pertanyaan kembali ke 0/10. Tekan Start untuk mencoba lagi!
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {question.options.map((opt) => {
                          const isWrong = selectedWrongId === opt.id;
                          const isCorrect = question.correctId === opt.id;
                          return (
                            <div
                              key={opt.id}
                              className={`p-3 rounded-xl border text-sm font-semibold flex items-center gap-2 ${
                                isWrong
                                  ? 'bg-rose-500 text-white border-rose-500'
                                  : isCorrect
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-700 dark:text-emerald-200'
                                  : 'bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-white/10 text-slate-500'
                              }`}
                            >
                              <span>{opt.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-xl p-3">
                        <strong>Pembahasan ({question.modeLabel}):</strong> {question.explanation}
                      </p>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={startRound}
                          className="btn-accent min-h-[46px] px-6 py-2.5 rounded-xl font-bold text-sm inline-flex items-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Start Ulang</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFullscreen('shop');
                            setShopSection('helpers');
                          }}
                          className="min-h-[46px] px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2333] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-2"
                        >
                          <ShoppingBag className="w-4 h-4 text-accent" />
                          <span>Beli Alat Bantuan di Shop</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {quizPhase === 'won' && (
                    <div className="py-8 text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-500 mx-auto">
                        <Check className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        10/10 Sempurna! +1 Bintang Rank
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Rank Anda sekarang: <strong className="text-accent">{rankInfo.fullLabel}</strong> (+{diaReward} Diamond &amp; +{ptReward} Poin Season).
                      </p>
                      <button
                        type="button"
                        onClick={startRound}
                        className="btn-accent min-h-[46px] px-7 py-2.5 rounded-xl font-bold text-sm inline-flex items-center gap-2"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Start Ronde Berikutnya</span>
                      </button>
                    </div>
                  )}
                </section>
              )}

              {/* FULLSCREEN 2: SHOP SKIN & TEMA LATAR (Limited Poin Season terorganisir di dalam Tema Latar) */}
              {activeFullscreen === 'shop' && (
                <section className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {ui.skinShopTitle}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Skin <strong>Default</strong> gratis, Skin <strong>Basic–Epic</strong> dibeli memakai <strong>Diamond</strong>, sedangkan <strong>Tema Latar</strong> mengatur mana yang dibeli dengan <strong>Diamond</strong> vs edisi <strong>Limited Poin Season</strong>.
                      </p>
                    </div>
                    <div className="text-xs font-mono-num text-slate-500 dark:text-slate-400 shrink-0">
                      {defaultSkins.length} Default · {diamondSkins.length} Diamond · {allBgThemes.length + limitedSkins.length} Latar &amp; Limited
                    </div>
                  </div>

                  {/* Clean 4 Shop Category Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'default' as const, label: `Skin Default (${defaultSkins.length})` },
                      { key: 'diamond' as const, label: `${ui.diamondSkinsTab} (${diamondSkins.length})` },
                      { key: 'bgTheme' as const, label: `${ui.bgThemesTab} & Limited` },
                      { key: 'helpers' as const, label: `Alat Bantuan Kuis` },
                    ].map((tab) => {
                      const active = shopSection === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setShopSection(tab.key)}
                          className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                            active
                              ? 'btn-accent shadow-sm'
                              : 'bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2333]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {shopSection === 'helpers' ? (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-xl p-4">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Alat Bantuan Kuis (Beli Pakai Diamond)
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Beli alat bantu dan gunakan langsung saat mengerjakan Quest Game.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveFullscreen('quiz')}
                          className="btn-accent min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold shrink-0 inline-flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Main Quest Game</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                                <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-accent shrink-0">
                                  <Lightbulb className="w-5 h-5" />
                                </div>
                                <span>Alat Pencari Jawaban</span>
                              </div>
                              <span className="font-mono-num text-xs font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200">
                                Dimiliki: {profile.hintCount}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              Menyorot jawaban yang benar secara otomatis saat menghadapi pertanyaan kuis yang sulit agar streak 10 soal tidak terputus.
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={profile.diamonds < appConfig.hintDiamondPrice}
                            onClick={() => handleBuyHelper('hint')}
                            className="btn-accent w-full min-h-[44px] rounded-xl disabled:opacity-40 text-xs font-bold"
                          >
                            Beli 1x ({appConfig.hintDiamondPrice} Diamond)
                          </button>
                        </div>

                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-500 shrink-0">
                                  <Clock className="w-5 h-5" />
                                </div>
                                <span>Penambah Waktu (+15 Detik)</span>
                              </div>
                              <span className="font-mono-num text-xs font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200">
                                Dimiliki: {profile.timeBoostCount}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              Menambahkan 15 detik ekstra ke timer ronde kuis yang sedang aktif — sangat berguna di tier Epic ke atas.
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={profile.diamonds < appConfig.extraTimeDiamondPrice}
                            onClick={() => handleBuyHelper('time')}
                            className="btn-accent w-full min-h-[44px] rounded-xl disabled:opacity-40 text-xs font-bold"
                          >
                            Beli 1x ({appConfig.extraTimeDiamondPrice} Diamond)
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : shopSection !== 'bgTheme' ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={skinQuery}
                          onChange={(e) => setSkinQuery(e.target.value)}
                          placeholder="Cari nama hero atau skin (Ling, Fanny, Basic, Elite, Special, Epic)..."
                          className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                        {displayedSkins.map((skin) => {
                          const owned = Boolean(
                            skin.isDefault ||
                              skin.currency === 'free' ||
                              profile.ownedSkins.includes(skin.id)
                          );
                          const activeOnHero = skin.heroId ? getHeroActiveSkin(skin.heroId) : null;
                          const equipped = activeOnHero
                            ? activeOnHero.skinId === skin.id
                            : profile.equippedSkinId === skin.id;
                          const canAfford =
                            skin.currency === 'free' || profile.diamonds >= skin.price;

                          return (
                            <div
                              key={skin.id}
                              className="perf-card-item bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col"
                            >
                              <div className="aspect-[16/10] w-full bg-slate-900 relative overflow-hidden">
                                <GameImage
                                  src={skin.imageUrl}
                                  name={skin.name}
                                  fullFrame
                                  className="w-full h-full"
                                  rounded="none"
                                />
                                <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/75 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                                  {skin.rarity}
                                </span>
                              </div>

                              <div className="p-3 flex flex-col gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {skin.name}
                                </h4>
                                <div className="flex items-center justify-between text-xs font-mono-num">
                                  <span className="text-slate-500 dark:text-slate-400">
                                    {skin.currency === 'free' ? 'Gratis Bawaan' : 'Diamond'}
                                  </span>
                                  <span
                                    className={`font-bold ${
                                      skin.currency === 'free'
                                        ? 'text-emerald-600 dark:text-emerald-300'
                                        : 'text-sky-600 dark:text-sky-300'
                                    }`}
                                  >
                                    {skin.currency === 'free' ? 'Gratis' : `${skin.price} 💎`}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  disabled={!owned && !canAfford}
                                  onClick={() => handleBuyOrEquipSkin(skin)}
                                  className={`w-full min-h-[40px] rounded-xl text-xs font-semibold transition-all ${
                                    equipped
                                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                                      : owned
                                      ? 'bg-slate-900 dark:bg-white/15 text-white'
                                      : canAfford
                                      ? 'btn-accent'
                                      : 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed'
                                  }`}
                                >
                                  {equipped
                                    ? 'Dipakai di Hero & Profil'
                                    : owned
                                    ? 'Gunakan di Hero & Tampilan'
                                    : `Beli (${skin.price} Diamond)`}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {filteredSkins.length > displayedSkins.length && (
                        <div className="text-center pt-2">
                          <button
                            type="button"
                            onClick={() => setVisibleSkinCount((c) => c + 24)}
                            className="btn-accent min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-bold"
                          >
                            Muat 24 Skin Lagi ({displayedSkins.length}/{filteredSkins.length})
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* TEMA LATAR & LIMITED POIN SEASON (Pengaturan Jelas: Diamond vs Limited Poin Season) */
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {[
                            { key: 'all' as const, label: 'Semua (Diamond & Poin Season)' },
                            { key: 'diamond' as const, label: 'Beli Pakai Diamond 💎' },
                            { key: 'limited' as const, label: 'Limited · Poin Season 🏆' },
                          ].map((f) => (
                            <button
                              key={f.key}
                              type="button"
                              onClick={() => setBgFilter(f.key)}
                              className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                                bgFilter === f.key
                                  ? 'btn-accent'
                                  : 'bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>

                        <div className="relative w-full sm:w-64">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={skinQuery}
                            onChange={(e) => setSkinQuery(e.target.value)}
                            placeholder="Cari latar / skin limited..."
                            className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      {/* Bagian 1: Tema Latar Gratis & Diamond */}
                      {bgFilter !== 'limited' && (
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                              1. Tema Latar Mobile Legends (Gratis &amp; Beli Pakai Diamond 💎)
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Latar standar &amp; wallpaper MLBB reguler yang dapat dibeli langsung memakai Diamond.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allBgThemes
                              .filter((t) => t.currency !== 'seasonPoints')
                              .map((theme) => {
                                const owned =
                                  theme.currency === 'free' ||
                                  (profile.ownedBgThemes || ['default']).includes(theme.id);
                                const equipped = (profile.equippedBgTheme || 'default') === theme.id;
                                const canAfford =
                                  theme.currency === 'free' || profile.diamonds >= theme.price;

                                return (
                                  <div
                                    key={theme.id}
                                    className="perf-card-item bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col"
                                  >
                                    <div
                                      className="aspect-[16/10] w-full relative flex items-end overflow-hidden"
                                      style={{ background: theme.previewGradient }}
                                    >
                                      {theme.imageUrl && (
                                        <GameImage
                                          src={theme.imageUrl}
                                          name={theme.name}
                                          fullFrame
                                          className="absolute inset-0 w-full h-full"
                                          rounded="none"
                                        />
                                      )}
                                      <div className="relative z-10 w-full p-2.5 bg-gradient-to-t from-black/85 to-transparent flex items-center gap-2 text-white">
                                        <Layers className="w-4 h-4 shrink-0" />
                                        <span className="text-xs font-bold truncate">{theme.name}</span>
                                      </div>
                                    </div>

                                    <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                                      <div className="space-y-1">
                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                          {theme.desc}
                                        </p>
                                        <p className="text-xs font-mono-num font-bold text-sky-600 dark:text-sky-300">
                                          {theme.currency === 'free'
                                            ? 'Gratis Bawaan'
                                            : `${theme.price} Diamond`}
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        disabled={!owned && !canAfford}
                                        onClick={() => handleBuyOrEquipBgTheme(theme)}
                                        className={`w-full min-h-[42px] rounded-xl text-xs font-semibold transition-all ${
                                          equipped
                                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                                            : owned
                                            ? 'bg-slate-900 dark:bg-white/15 text-white'
                                            : canAfford
                                            ? 'btn-accent'
                                            : 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed'
                                        }`}
                                      >
                                        {equipped
                                          ? 'Latar Sedang Dipakai'
                                          : owned
                                          ? 'Pasang Tema Latar'
                                          : `Beli (${theme.price} Diamond)`}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Bagian 2: Edisi Limited (Tema Latar Limited & Skin Limited — Khusus Poin Season 🏆) */}
                      {bgFilter !== 'diamond' && (
                        <div className="space-y-5 pt-4 border-t border-slate-200 dark:border-white/10">
                          <div>
                            <h4 className="text-sm sm:text-base font-bold text-amber-600 dark:text-amber-300">
                              2. Koleksi Edisi Limited &amp; Latar Eksklusif (Khusus Poin Season 🏆)
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Seluruh latar belakang Limited &amp; skin edisi Collector/Legend/Limited hanya dapat dibeli memakai Poin Season dari Quest Game.
                            </p>
                          </div>

                          {/* Limited Background Themes */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allBgThemes
                              .filter((t) => t.currency === 'seasonPoints')
                              .map((theme) => {
                                const owned = (profile.ownedBgThemes || ['default']).includes(theme.id);
                                const equipped = (profile.equippedBgTheme || 'default') === theme.id;
                                const canAfford = profile.seasonPoints >= theme.price;

                                return (
                                  <div
                                    key={theme.id}
                                    className="perf-card-item bg-slate-50 dark:bg-[#0B0F17] border border-amber-400/35 rounded-2xl overflow-hidden flex flex-col"
                                  >
                                    <div
                                      className="aspect-[16/10] w-full relative flex items-end overflow-hidden"
                                      style={{ background: theme.previewGradient }}
                                    >
                                      {theme.imageUrl && (
                                        <GameImage
                                          src={theme.imageUrl}
                                          name={theme.name}
                                          fullFrame
                                          className="absolute inset-0 w-full h-full"
                                          rounded="none"
                                        />
                                      )}
                                      <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-bold shadow">
                                        LIMITED · POIN SEASON
                                      </span>
                                      <div className="relative z-10 w-full p-2.5 bg-gradient-to-t from-black/85 to-transparent flex items-center gap-2 text-white">
                                        <Layers className="w-4 h-4 shrink-0" />
                                        <span className="text-xs font-bold truncate">{theme.name}</span>
                                      </div>
                                    </div>

                                    <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                                      <div className="space-y-1">
                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                          {theme.desc}
                                        </p>
                                        <p className="text-xs font-mono-num font-bold text-amber-600 dark:text-amber-300">
                                          {theme.price} Poin Season
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        disabled={!owned && !canAfford}
                                        onClick={() => handleBuyOrEquipBgTheme(theme)}
                                        className={`w-full min-h-[42px] rounded-xl text-xs font-semibold transition-all ${
                                          equipped
                                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                                            : owned
                                            ? 'bg-slate-900 dark:bg-white/15 text-white'
                                            : canAfford
                                            ? 'btn-accent'
                                            : 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed'
                                        }`}
                                      >
                                        {equipped
                                          ? 'Latar Sedang Dipakai'
                                          : owned
                                          ? 'Pasang Latar Limited'
                                          : `Beli (${theme.price} Poin Season)`}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>

                          {/* Limited / Collector / Legend Hero Skins (Poin Season) */}
                          {filteredLimitedSkins.length > 0 && (
                            <div className="space-y-3 pt-2">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Skin Hero Limited / Collector / Legend ({filteredLimitedSkins.length} · Poin Season)
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                                {filteredLimitedSkins.slice(0, visibleSkinCount).map((skin) => {
                                  const owned = profile.ownedSkins.includes(skin.id);
                                  const activeOnHero = skin.heroId
                                    ? getHeroActiveSkin(skin.heroId)
                                    : null;
                                  const equipped = activeOnHero
                                    ? activeOnHero.skinId === skin.id
                                    : profile.equippedSkinId === skin.id;
                                  const canAfford = profile.seasonPoints >= skin.price;

                                  return (
                                    <div
                                      key={skin.id}
                                      className="perf-card-item bg-slate-50 dark:bg-[#0B0F17] border border-amber-400/30 rounded-2xl overflow-hidden flex flex-col"
                                    >
                                      <div className="aspect-[16/10] w-full bg-slate-900 relative overflow-hidden">
                                        <GameImage
                                          src={skin.imageUrl}
                                          name={skin.name}
                                          fullFrame
                                          className="w-full h-full"
                                          rounded="none"
                                        />
                                        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-bold">
                                          {skin.rarity}
                                        </span>
                                      </div>

                                      <div className="p-3 flex flex-col gap-2">
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                          {skin.name}
                                        </h4>
                                        <div className="flex items-center justify-between text-xs font-mono-num">
                                          <span className="text-slate-500 dark:text-slate-400">
                                            Poin Season
                                          </span>
                                          <span className="font-bold text-amber-600 dark:text-amber-300">
                                            {skin.price} Pt
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          disabled={!owned && !canAfford}
                                          onClick={() => handleBuyOrEquipSkin(skin)}
                                          className={`w-full min-h-[40px] rounded-xl text-xs font-semibold transition-all ${
                                            equipped
                                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                                              : owned
                                              ? 'bg-slate-900 dark:bg-white/15 text-white'
                                              : canAfford
                                              ? 'btn-accent'
                                              : 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed'
                                          }`}
                                        >
                                          {equipped
                                            ? 'Dipakai di Hero & Profil'
                                            : owned
                                            ? 'Gunakan di Hero & Tampilan'
                                            : `Beli (${skin.price} Poin Season)`}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* FULLSCREEN 3: PAPAN PERINGKAT 30 TERATAS */}
              {activeFullscreen === 'leaderboard' && (
                <section className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {ui.leaderboardTitle} — {appConfig.seasonTitle}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Posisi peringkat bergeser otomatis jika ada pemain lain yang menyusul jumlah bintang Anda.
                      </p>
                    </div>
                    <span className="font-mono-num text-xs font-semibold text-accent">
                      {leaderboard.length}/30 Pemain
                    </span>
                  </div>

                  {leaderboard.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                      Belum ada pemain di papan peringkat musim ini. Masuk lewat menu <strong>Akun</strong> di Profil lalu push rank kuis untuk menjadi Peringkat #1!
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-white/5">
                      {leaderboard.map((entry, idx) => (
                        <div
                          key={entry.uid}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`font-mono-num w-7 text-center font-bold text-sm ${
                                idx === 0
                                  ? 'text-amber-500'
                                  : idx === 1
                                  ? 'text-slate-400'
                                  : idx === 2
                                  ? 'text-amber-700'
                                  : 'text-slate-500'
                              }`}
                            >
                              #{idx + 1}
                            </span>
                            <GameImage
                              src={entry.avatarUrl}
                              name={entry.displayName}
                              fullFrame
                              className="w-14 h-10 shrink-0"
                              rounded="xl"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {entry.displayName}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-num truncate">
                                ID: {entry.mlbbId || '-'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <RankBadge tierName={entry.rankLabel} size="sm" />
                            <div className="text-right">
                              <p className="text-xs font-bold text-accent">
                                {entry.rankLabel}
                              </p>
                              <p className="text-[11px] font-mono-num text-slate-500 dark:text-slate-400">
                                {entry.seasonPoints} Poin Season
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Daftar Tier Rank & Bintang Mobile Legends (Warrior s/d Mythical Immortal) */}
      {tierModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setTierModalOpen(false)}
        >
          <div
            className="w-full sm:max-w-2xl max-h-[85vh] bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Daftar Tier Rank, Bintang &amp; Kesulitan Kuis MLBB
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Semakin tinggi tier, jumlah pilihan soal bertambah dan batas waktu semakin singkat.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTierModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RANK_ROADMAP.map((row) => {
                const isCurrent = rankInfo.tierName === row.tier;
                return (
                  <div
                    key={row.tier}
                    className={`p-3 rounded-xl border flex items-center gap-3 ${
                      isCurrent
                        ? 'bg-amber-400/15 border-amber-400'
                        : 'bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <RankBadge tierName={row.tier} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {row.tier} ({row.divs})
                        </p>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-300 shrink-0">
                            AKTIF
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-300 font-mono-num">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{row.starsPerDiv}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 dark:text-slate-400">{row.timer}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-sky-600 dark:text-sky-300">{row.opts}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-num">
                        Total {row.req}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
