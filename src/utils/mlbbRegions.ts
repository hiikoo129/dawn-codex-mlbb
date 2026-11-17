import type { HeroDetail, HeroSummary } from '../types/mlbb';

export type LandOfDawnRegion =
  | 'Moniyan Empire'
  | 'Cadia Riverlands'
  | 'Northern Vale'
  | 'Eruditio'
  | 'Azrya Woodlands'
  | 'Agelta Drylands'
  | 'The Abyss & Shadow Swamp'
  | 'Celestial Palace & Magic Academy'
  | 'Vonetis Sea & Peculiar Isles'
  | 'Necrokeep & Barren Lands';

export const ALL_LAND_OF_DAWN_REGIONS: LandOfDawnRegion[] = [
  'Moniyan Empire',
  'Cadia Riverlands',
  'Northern Vale',
  'Eruditio',
  'Azrya Woodlands',
  'Agelta Drylands',
  'The Abyss & Shadow Swamp',
  'Celestial Palace & Magic Academy',
  'Vonetis Sea & Peculiar Isles',
  'Necrokeep & Barren Lands',
];

const HERO_REGION_EXACT: Record<string, LandOfDawnRegion> = {
  // Moniyan Empire
  tigreal: 'Moniyan Empire',
  alucard: 'Moniyan Empire',
  fanny: 'Moniyan Empire',
  granger: 'Moniyan Empire',
  silvanna: 'Moniyan Empire',
  harith: 'Moniyan Empire',
  natalia: 'Moniyan Empire',
  kimmy: 'Moniyan Empire',
  julian: 'Moniyan Empire',
  lancelot: 'Moniyan Empire',
  guinevere: 'Moniyan Empire',
  aamon: 'Moniyan Empire',
  gusion: 'Moniyan Empire',
  lesley: 'Moniyan Empire',
  harley: 'Moniyan Empire',
  paquito: 'Moniyan Empire',
  lukas: 'Moniyan Empire',
  melissa: 'Moniyan Empire',
  fredrinn: 'Moniyan Empire',
  cecilion: 'Moniyan Empire',
  carmilla: 'Moniyan Empire',
  xavier: 'Moniyan Empire',
  benedetta: 'Moniyan Empire',

  // Cadia Riverlands
  zilong: 'Cadia Riverlands',
  ling: 'Cadia Riverlands',
  wanwan: 'Cadia Riverlands',
  baxia: 'Cadia Riverlands',
  chang_e: 'Cadia Riverlands',
  "chang'e": 'Cadia Riverlands',
  'yi sun-shin': 'Cadia Riverlands',
  'yu zhong': 'Cadia Riverlands',
  'luo yi': 'Cadia Riverlands',
  yin: 'Cadia Riverlands',
  sun: 'Cadia Riverlands',
  chou: 'Cadia Riverlands',
  kagura: 'Cadia Riverlands',
  hayabusa: 'Cadia Riverlands',
  hanabi: 'Cadia Riverlands',
  hanzo: 'Cadia Riverlands',
  akashic: 'Cadia Riverlands',
  zuxin: 'Cadia Riverlands',
  zhuxin: 'Cadia Riverlands',
  suyou: 'Cadia Riverlands',

  // Northern Vale
  freya: 'Northern Vale',
  franco: 'Northern Vale',
  aurora: 'Northern Vale',
  masha: 'Northern Vale',
  popol: 'Northern Vale',
  'popol and kupa': 'Northern Vale',
  bane: 'Northern Vale',
  atlas: 'Northern Vale',
  aulus: 'Northern Vale',

  // Eruditio
  layla: 'Eruditio',
  bruno: 'Eruditio',
  johnson: 'Eruditio',
  angela: 'Eruditio',
  diggie: 'Eruditio',
  lolita: 'Eruditio',
  jawhead: 'Eruditio',
  beatrix: 'Eruditio',
  natan: 'Eruditio',
  cici: 'Eruditio',
  ixia: 'Eruditio',
  nolan: 'Eruditio',
  claude: 'Eruditio',
  x_borg: 'Eruditio',
  'x.borg': 'Eruditio',

  // Azrya Woodlands
  miya: 'Azrya Woodlands',
  estes: 'Azrya Woodlands',
  eudora: 'Azrya Woodlands',
  karina: 'Azrya Woodlands',
  selena: 'Azrya Woodlands',
  belrick: 'Azrya Woodlands',
  belerick: 'Azrya Woodlands',
  floryn: 'Azrya Woodlands',
  joy: 'Azrya Woodlands',
  nana: 'Azrya Woodlands',
  valir: 'Azrya Woodlands',
  vale: 'Azrya Woodlands',
  akai: 'Cadia Riverlands',
  cyclops: 'Azrya Woodlands',
  grock: 'Azrya Woodlands',
  lunox: 'Azrya Woodlands',
  odette: 'Moniyan Empire',
  pharsa: 'Azrya Woodlands',
  mathilda: 'Agelta Drylands',

  // Agelta Drylands
  khaleed: 'Agelta Drylands',
  esmeralda: 'Agelta Drylands',
  khufra: 'Agelta Drylands',
  minotaur: 'Agelta Drylands',
  alda: 'Agelta Drylands',
  aldous: 'Agelta Drylands',
  brody: 'Agelta Drylands',
  barats: 'Agelta Drylands',
  roger: 'Moniyan Empire',
  ruby: 'Moniyan Empire',
  badang: 'Vonetis Sea & Peculiar Isles',
  kadita: 'Vonetis Sea & Peculiar Isles',
  lapu_lapu: 'Vonetis Sea & Peculiar Isles',
  'lapu-lapu': 'Vonetis Sea & Peculiar Isles',
  karrie: 'Vonetis Sea & Peculiar Isles',
  arlott: 'Moniyan Empire',
  kalea: 'Vonetis Sea & Peculiar Isles',

  // The Abyss & Shadow Swamp
  alice: 'The Abyss & Shadow Swamp',
  balmond: 'The Abyss & Shadow Swamp',
  thamuz: 'The Abyss & Shadow Swamp',
  dyrroth: 'The Abyss & Shadow Swamp',
  moskov: 'The Abyss & Shadow Swamp',
  helcurt: 'The Abyss & Shadow Swamp',
  argus: 'The Abyss & Shadow Swamp',
  martis: 'The Abyss & Shadow Swamp',
  hanek: 'The Abyss & Shadow Swamp',
  yve: 'The Abyss & Shadow Swamp',
  zhask: 'The Abyss & Shadow Swamp',
  gord: 'Celestial Palace & Magic Academy',
  hylos: 'Azrya Woodlands',
  kaja: 'Celestial Palace & Magic Academy',
  rafaela: 'Celestial Palace & Magic Academy',
  uranus: 'Celestial Palace & Magic Academy',
  gatotkaca: 'Celestial Palace & Magic Academy',
  edith: 'Celestial Palace & Magic Academy',
  novaria: 'Celestial Palace & Magic Academy',
  chip: 'Eruditio',

  // Necrokeep & Barren Lands
  vexana: 'Necrokeep & Barren Lands',
  faramis: 'Necrokeep & Barren Lands',
  leomord: 'Necrokeep & Barren Lands',
  terizla: 'Necrokeep & Barren Lands',
  phoveus: 'Necrokeep & Barren Lands',
  irithel: 'Azrya Woodlands',
  alpha: 'Eruditio',
  saber: 'Eruditio',
  lancelot_alt: 'Moniyan Empire',
  hilda: 'Northern Vale',
  minsitthar: 'Vonetis Sea & Peculiar Isles',
  sun_alt: 'Cadia Riverlands',
  valentina: 'Moniyan Empire',
  yin_alt: 'Cadia Riverlands',
};

export function resolveHeroOriginRegion(
  hero: HeroSummary,
  detail?: HeroDetail
): LandOfDawnRegion {
  const key = hero.name.trim().toLowerCase();
  if (HERO_REGION_EXACT[key]) return HERO_REGION_EXACT[key];

  const text = `${detail?.story || ''} ${detail?.tale || ''}`.toLowerCase();
  if (text.includes('moniyan') || text.includes('imperial') || text.includes('lumina')) {
    return 'Moniyan Empire';
  }
  if (text.includes('cadia') || text.includes('dragon altar') || text.includes('oriental')) {
    return 'Cadia Riverlands';
  }
  if (text.includes('northern vale') || text.includes('nost gal') || text.includes('kupa')) {
    return 'Northern Vale';
  }
  if (text.includes('eruditio') || text.includes('laboratory') || text.includes('cyber')) {
    return 'Eruditio';
  }
  if (text.includes('azrya') || text.includes('moonlit') || text.includes('elf')) {
    return 'Azrya Woodlands';
  }
  if (text.includes('agelta') || text.includes('desert') || text.includes('maze')) {
    return 'Agelta Drylands';
  }
  if (text.includes('abyss') || text.includes('barren') || text.includes('demon')) {
    return 'The Abyss & Shadow Swamp';
  }
  if (text.includes('celestial') || text.includes('sanctum') || text.includes('magic academy')) {
    return 'Celestial Palace & Magic Academy';
  }
  if (text.includes('vonetis') || text.includes('southern seas') || text.includes('maharlika')) {
    return 'Vonetis Sea & Peculiar Isles';
  }
  if (text.includes('necrokeep') || text.includes('ridgeburg')) {
    return 'Necrokeep & Barren Lands';
  }

  // Deterministic role-based fallback for any newly added MLBB hero
  if (hero.roles.includes('Marksman')) return 'Eruditio';
  if (hero.roles.includes('Mage')) return 'Celestial Palace & Magic Academy';
  if (hero.roles.includes('Assassin')) return 'Cadia Riverlands';
  if (hero.roles.includes('Tank')) return 'Moniyan Empire';
  if (hero.roles.includes('Support')) return 'Azrya Woodlands';
  return 'Moniyan Empire';
}
