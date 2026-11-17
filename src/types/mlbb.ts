export type HeroRole =
  | 'Tank'
  | 'Fighter'
  | 'Assassin'
  | 'Mage'
  | 'Marksman'
  | 'Support';

export type HeroLane =
  | 'Gold Lane'
  | 'Exp Lane'
  | 'Mid Lane'
  | 'Jungle'
  | 'Roam';

export type EquipCategory =
  | 'Attack'
  | 'Magic'
  | 'Defense'
  | 'Movement'
  | 'Jungle'
  | 'Roam';

export interface HeroSummary {
  id: number;
  name: string;
  head: string;
  smallmap: string;
  splash?: string;
  roles: HeroRole[];
  roleIcons: string[];
  lanes: HeroLane[];
  laneIcons: string[];
  winRate?: number;
  banRate?: number;
  pickRate?: number;
  relation: {
    assist: number[];
    strong: number[];
    weak: number[];
  };
}

export interface HeroSkillTag {
  tagid: number;
  tagname: string;
  tagrgb: string;
}

export interface HeroSkill {
  skillid: number;
  skillname: string;
  skillicon: string;
  skilldesc: string;
  cdAndCost: string;
  tags: HeroSkillTag[];
  isPassive: boolean;
}

export interface HeroDetail {
  id: number;
  name: string;
  head: string;
  headBig: string;
  smallmap: string;
  painting: string;
  squarehead: string;
  story: string;
  tale: string;
  roles: HeroRole[];
  lanes: HeroLane[];
  speciality: string[];
  difficulty: number;
  ability: {
    durability: number;
    offense: number;
    control: number;
    difficulty: number;
  };
  skills: HeroSkill[];
  relation: {
    assist: number[];
    strong: number[];
    weak: number[];
  };
  recommendedBuildIds: number[];
}

export interface HeroCounterEntry {
  heroId: number;
  head: string;
  winRate: number;
  increaseWinRate: number;
  appearanceRate: number;
}

export interface ParsedItemStats {
  physicalAttack: number;
  magicPower: number;
  attackSpeed: number;
  critChance: number;
  critDamage: number;
  physicalPen: number;
  physicalPenPct: number;
  magicPen: number;
  magicPenPct: number;
  adaptiveAttack: number;
  maxHp: number;
  physicalDefense: number;
  magicDefense: number;
  cooldownReduction: number;
  movementSpeed: number;
  movementSpeedPct: number;
  lifesteal: number;
  spellVamp: number;
  hybridLifesteal: number;
  mana: number;
  hpRegen: number;
  manaRegen: number;
}

export interface EquipmentItem {
  id: number;
  name: string;
  icon: string;
  category: EquipCategory;
  rawTips: string[];
  passives: string[];
  targetEquipIds: number[];
  stats: ParsedItemStats;
  tier: 'dasar' | 'menengah' | 'jadi';
}

export interface ItemRecipeNode {
  item: EquipmentItem;
  materials: ItemRecipeNode[];
}

export interface BattleSpell {
  id: number;
  name: string;
  icon: string;
  cd: number;
  desc: string;
}

export interface EmblemSet {
  id: number;
  name: string;
  icon: string;
  rawAttr: string;
  stats: ParsedItemStats;
}

export interface EmblemTalent {
  id: number;
  tier: 1 | 2 | 3;
  name: string;
  icon: string;
  desc: string;
}

export interface HeroWallpaper {
  id: number;
  caption: string;
  url: string;
  hdUrl: string;
  heroId?: number;
  heroName?: string;
  skinCode?: string;
  isLimitedWallpaper?: boolean;
}

export type ThemeMode = 'light' | 'system' | 'dark';
export type ImageQuality = 'hemat' | 'sedang' | 'tinggi' | 'sangat_tinggi';
export type PageAnimationType = 'none' | 'fade' | 'zoom-in' | 'zoom-out' | 'slide' | 'rotate';

export interface BgThemeOption {
  id: string;
  name: string;
  desc: string;
  currency: 'diamond' | 'seasonPoints' | 'free';
  price: number;
  previewGradient: string;
  darkBgStyle: string;
  lightBgStyle: string;
  imageUrl?: string;
  isLimited?: boolean;
  categoryLabel?: string;
}

export interface EquippedHeroSkin {
  skinId: string;
  skinName: string;
  rarity: string;
  imageUrl: string;
}

export interface AppConfig {
  appName: string;
  guideSubtitle: string;
  creatorName: string;
  globalBannerText: string;
  footerText: string;
  customHeroesTitle: string;
  customHeroesSubtitle: string;
  customDraftTitle: string;
  customDraftSubtitle: string;
  customItemsTitle: string;
  customItemsSubtitle: string;
  customCalcTitle: string;
  customCalcSubtitle: string;
  customGameTitle: string;
  customProfileTitle: string;
  seasonNumber: number;
  seasonTitle: string;
  seasonResetEpoch: number;
  epicDiamondPrice: number;
  specialDiamondPrice: number;
  legendSeasonPrice: number;
  collectorSeasonPrice: number;
  limitedSeasonPrice: number;
  bgDiamondPrice: number;
  bgSeasonPrice: number;
  hintDiamondPrice: number;
  extraTimeDiamondPrice: number;
  quizDiamondReward: number;
  quizSeasonReward: number;
}

export interface PlayerProfile {
  uid: string;
  mlbbId: string;
  mlbbZone: string;
  nickname: string;
  accountTier: string;
  accountRole: string;
  diamonds: number;
  seasonPoints: number;
  rankStars: number;
  hintCount: number;
  timeBoostCount: number;
  ownedSkins: string[];
  equippedSkinId: string;
  equippedSkinUrl: string;
  ownedBgThemes: string[];
  equippedBgTheme: string;
  seasonEpoch: number;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  mlbbId: string;
  rankStars: number;
  rankLabel: string;
  seasonPoints: number;
  seasonEpoch: number;
  avatarUrl: string;
}
