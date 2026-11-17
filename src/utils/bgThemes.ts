import type { AppConfig, BgThemeOption, HeroSummary, HeroWallpaper } from '../types/mlbb';

export const BG_THEMES: BgThemeOption[] = [
  {
    id: 'default',
    name: 'Dawn Standard',
    desc: 'Latar bersih standar mengikuti mode Terang / Gelap.',
    currency: 'free',
    price: 0,
    categoryLabel: 'Bawaan',
    previewGradient: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
    darkBgStyle: 'none',
    lightBgStyle: 'none',
  },
  {
    id: 'aurora-dawn',
    name: 'Aurora Land of Dawn',
    desc: 'Gradasi biru langit & emas lembut khas Land of Dawn.',
    currency: 'diamond',
    price: 90,
    categoryLabel: 'Latar Atmosfer',
    previewGradient: 'linear-gradient(135deg, #0F172A 0%, #0E7490 55%, #F59E0B 100%)',
    darkBgStyle:
      'radial-gradient(circle at 12% 10%, rgba(14, 165, 233, 0.22), transparent 42%), radial-gradient(circle at 88% 82%, rgba(245, 158, 11, 0.18), transparent 45%), #0B0F17',
    lightBgStyle:
      'radial-gradient(circle at 12% 10%, rgba(14, 165, 233, 0.14), transparent 45%), radial-gradient(circle at 88% 82%, rgba(245, 158, 11, 0.15), transparent 45%), #F4F6FA',
  },
  {
    id: 'abyssal-crimson',
    name: 'Abyssal Crimson',
    desc: 'Nuansa arena Abyss dengan aura merah delima.',
    currency: 'diamond',
    price: 110,
    categoryLabel: 'Latar Atmosfer',
    previewGradient: 'linear-gradient(135deg, #1F0910 0%, #991B1B 60%, #F43F5E 100%)',
    darkBgStyle:
      'radial-gradient(circle at 20% 15%, rgba(239, 68, 68, 0.22), transparent 44%), radial-gradient(circle at 85% 75%, rgba(190, 18, 60, 0.18), transparent 42%), #0E090D',
    lightBgStyle:
      'radial-gradient(circle at 20% 15%, rgba(239, 68, 68, 0.12), transparent 45%), radial-gradient(circle at 85% 75%, rgba(244, 63, 94, 0.12), transparent 45%), #FAF4F5',
  },
  {
    id: 'emerald-sanctuary',
    name: 'Emerald Sanctuary',
    desc: 'Atmosfer hutan Jungle hijau zamrud yang tenang.',
    currency: 'diamond',
    price: 95,
    categoryLabel: 'Latar Atmosfer',
    previewGradient: 'linear-gradient(135deg, #06281E 0%, #059669 60%, #34D399 100%)',
    darkBgStyle:
      'radial-gradient(circle at 15% 15%, rgba(16, 185, 129, 0.2), transparent 44%), radial-gradient(circle at 85% 85%, rgba(20, 184, 166, 0.16), transparent 44%), #081210',
    lightBgStyle:
      'radial-gradient(circle at 15% 15%, rgba(16, 185, 129, 0.12), transparent 45%), radial-gradient(circle at 85% 85%, rgba(20, 184, 166, 0.12), transparent 45%), #F2F9F6',
  },
  {
    id: 'celestial-mythic',
    name: 'Celestial Mythic Gold',
    desc: 'Tema latar eksklusif Season bernuansa istana emas Mythic.',
    currency: 'seasonPoints',
    price: 150,
    isLimited: true,
    categoryLabel: 'Limited · Poin Season',
    previewGradient: 'linear-gradient(135deg, #1E1608 0%, #B45309 55%, #FDE047 100%)',
    darkBgStyle:
      'radial-gradient(circle at 50% 0%, rgba(251, 191, 36, 0.24), transparent 48%), radial-gradient(circle at 85% 85%, rgba(217, 119, 6, 0.18), transparent 44%), #100D08',
    lightBgStyle:
      'radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.16), transparent 48%), radial-gradient(circle at 85% 85%, rgba(217, 119, 6, 0.12), transparent 45%), #FBF8F1',
  },
];

export function buildAllBgThemes(
  wallpapers: HeroWallpaper[],
  heroes: HeroSummary[],
  appConfig: AppConfig
): BgThemeOption[] {
  const heroById = new Map<number, HeroSummary>();
  for (const h of heroes) heroById.set(h.id, h);

  // Pick 6 distinct Epic/Special MLBB artworks for Diamond MLBB Background Themes
  const diamondMlbbWallpapers: BgThemeOption[] = [];
  const usedDiamondHeroes = new Set<string>();

  for (const w of wallpapers) {
    if (diamondMlbbWallpapers.length >= 6) break;
    const skinMatch = (w.skinCode || '').match(/skin(\d+)/i);
    const skinNum = skinMatch ? Number(skinMatch[1]) : -1;
    if (w.isLimitedWallpaper || skinNum < 2 || skinNum >= 5) continue;

    const hName = (w.heroId ? heroById.get(w.heroId)?.name : w.heroName) || '';
    if (!hName || usedDiamondHeroes.has(hName)) continue;
    usedDiamondHeroes.add(hName);

    const idx = diamondMlbbWallpapers.length;
    const baseDiaBg = appConfig.bgDiamondPrice || 95;
    diamondMlbbWallpapers.push({
      id: `bg-ml-dia-${w.id}`,
      name: `Latar MLBB: ${hName}`,
      desc: `Latar belakang artwork resmi Mobile Legends (${hName}) beresolusi HD untuk seluruh aplikasi.`,
      currency: 'diamond',
      price: Math.max(10, baseDiaBg + idx * 10),
      isLimited: false,
      categoryLabel: 'Latar Mobile Legends · Diamond',
      imageUrl: w.hdUrl || w.url,
      previewGradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      darkBgStyle: '#0B0F17',
      lightBgStyle: '#F4F6FA',
    });
  }

  // Pick 6 distinct Limited / Chronicle / Collector / Legend MLBB artworks strictly for Poin Season
  const limitedMlbbWallpapers: BgThemeOption[] = [];
  const usedLimitedKeys = new Set<string>();

  for (const w of wallpapers) {
    if (limitedMlbbWallpapers.length >= 6) break;
    const skinMatch = (w.skinCode || '').match(/skin(\d+)/i);
    const skinNum = skinMatch ? Number(skinMatch[1]) : -1;
    if (!w.isLimitedWallpaper && skinNum < 5) continue;

    const hName = (w.heroId ? heroById.get(w.heroId)?.name : w.heroName) || '';
    const key = hName || String(w.id);
    if (usedLimitedKeys.has(key)) continue;
    usedLimitedKeys.add(key);

    const idx = limitedMlbbWallpapers.length;
    const baseSeasonBg = appConfig.bgSeasonPrice || Math.round((appConfig.limitedSeasonPrice || 320) * 0.75);

    limitedMlbbWallpapers.push({
      id: `bg-ml-lim-${w.id}`,
      name: hName ? `Latar Limited: ${hName}` : `Latar Limited Dawn #${idx + 1}`,
      desc: `Latar Mobile Legends edisi Limited eksklusif — hanya dapat dibeli memakai Poin Season.`,
      currency: 'seasonPoints',
      price: Math.max(20, baseSeasonBg + (skinNum >= 7 ? 60 : skinNum === 6 ? 30 : 0)),
      isLimited: true,
      categoryLabel: 'Limited · Poin Season',
      imageUrl: w.hdUrl || w.url,
      previewGradient: 'linear-gradient(135deg, #1E1608 0%, #B45309 65%, #FDE047 100%)',
      darkBgStyle: '#100D08',
      lightBgStyle: '#FBF8F1',
    });
  }

  return [
    ...BG_THEMES.filter((t) => !t.isLimited),
    ...diamondMlbbWallpapers,
    ...BG_THEMES.filter((t) => t.isLimited),
    ...limitedMlbbWallpapers,
  ];
}

export function getBgThemeById(id: string, allThemes?: BgThemeOption[]): BgThemeOption {
  if (allThemes && allThemes.length > 0) {
    const found = allThemes.find((t) => t.id === id);
    if (found) return found;
  }
  return BG_THEMES.find((t) => t.id === id) || BG_THEMES[0];
}
