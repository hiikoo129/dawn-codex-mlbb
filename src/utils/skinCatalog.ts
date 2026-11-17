import type { AppConfig, HeroSummary, HeroWallpaper } from '../types/mlbb';

export interface SkinItem {
  id: string;
  heroId: number | null;
  heroName: string;
  name: string;
  rarity: 'Default' | 'Basic' | 'Elite' | 'Special' | 'Epic' | 'Legend' | 'Collector' | 'Limited';
  currency: 'free' | 'diamond' | 'seasonPoints';
  price: number;
  imageUrl: string;
  hdUrl?: string;
  isDefault?: boolean;
}

export interface HeroSkinCatalog {
  defaultSkins: SkinItem[];
  diamondSkins: SkinItem[];
  limitedSkins: SkinItem[];
  allSkins: SkinItem[];
}

export function buildHeroSkinCatalog(
  heroes: HeroSummary[],
  wallpapers: HeroWallpaper[],
  appConfig: AppConfig
): HeroSkinCatalog {
  const heroById = new Map<number, HeroSummary>();
  const heroByNameLower = new Map<string, HeroSummary>();
  for (const h of heroes) {
    heroById.set(h.id, h);
    heroByNameLower.set(h.name.trim().toLowerCase(), h);
  }

  const defaultList: SkinItem[] = [];
  const diamondList: SkinItem[] = [];
  const limitedList: SkinItem[] = [];
  const coveredDefaultHeroIds = new Set<number>();
  const coveredDiamondHeroIds = new Set<number>();

  wallpapers.forEach((w, idx) => {
    const matchedById = w.heroId ? heroById.get(w.heroId) : undefined;
    const matchedByName = !matchedById && w.heroName
      ? heroByNameLower.get(w.heroName.trim().toLowerCase())
      : undefined;
    const matchedHero = matchedById || matchedByName;
    const resolvedHeroId = matchedHero?.id ?? w.heroId ?? null;
    const heroDisplay = matchedHero?.name || w.heroName || 'Land of Dawn';

    const skinNumMatch = (w.skinCode || '').match(/skin(\d+)/i);
    const skinNum = skinNumMatch ? Number(skinNumMatch[1]) : -1;

    if (w.isLimitedWallpaper || skinNum >= 5) {
      let rarity: SkinItem['rarity'] = 'Limited';
      let price = appConfig.limitedSeasonPrice;
      if (skinNum >= 7) {
        rarity = 'Legend';
        price = appConfig.legendSeasonPrice;
      } else if (skinNum === 6) {
        rarity = 'Collector';
        price = appConfig.collectorSeasonPrice;
      }
      const label =
        skinNum >= 5
          ? `${heroDisplay} · ${rarity} #${String(skinNum).padStart(2, '0')}`
          : `${heroDisplay !== 'Land of Dawn' ? heroDisplay : rarity} · Limited #${idx + 1}`;
      limitedList.push({
        id: `wall-lim-${w.id}`,
        heroId: resolvedHeroId,
        heroName: heroDisplay,
        name: label,
        rarity,
        currency: 'seasonPoints',
        price,
        imageUrl: w.url,
        hdUrl: w.hdUrl,
      });
    } else if (skinNum === 0) {
      if (resolvedHeroId) coveredDefaultHeroIds.add(resolvedHeroId);
      defaultList.push({
        id: `hero-def-${resolvedHeroId || w.id}`,
        heroId: resolvedHeroId,
        heroName: heroDisplay,
        name: `${heroDisplay} · Default`,
        rarity: 'Default',
        currency: 'free',
        price: 0,
        imageUrl: w.url,
        hdUrl: w.hdUrl,
        isDefault: true,
      });
    } else {
      if (resolvedHeroId) coveredDiamondHeroIds.add(resolvedHeroId);
      let rarity: SkinItem['rarity'] = 'Basic';
      let price = Math.max(40, Math.round(appConfig.specialDiamondPrice * 0.45));
      if (skinNum === 2) {
        rarity = 'Elite';
        price = Math.max(60, Math.round(appConfig.specialDiamondPrice * 0.7));
      } else if (skinNum === 3) {
        rarity = 'Special';
        price = appConfig.specialDiamondPrice;
      } else if (skinNum >= 4) {
        rarity = 'Epic';
        price = appConfig.epicDiamondPrice;
      }
      diamondList.push({
        id: `hero-wall-${w.id}`,
        heroId: resolvedHeroId,
        heroName: heroDisplay,
        name: `${heroDisplay} · ${rarity} #${String(Math.max(1, skinNum)).padStart(2, '0')}`,
        rarity,
        currency: 'diamond',
        price,
        imageUrl: w.url,
        hdUrl: w.hdUrl,
      });
    }
  });

  // Guarantee EVERY hero has a free Default skin & purchasable Basic/Elite Diamond skin
  heroes.forEach((h, idx) => {
    if (!coveredDefaultHeroIds.has(h.id)) {
      defaultList.push({
        id: `hero-def-fb-${h.id}`,
        heroId: h.id,
        heroName: h.name,
        name: `${h.name} · Default`,
        rarity: 'Default',
        currency: 'free',
        price: 0,
        imageUrl: h.splash || h.head || h.smallmap,
        isDefault: true,
      });
    }
    if (!coveredDiamondHeroIds.has(h.id)) {
      diamondList.push({
        id: `hero-fallback-${h.id}`,
        heroId: h.id,
        heroName: h.name,
        name: `${h.name} · ${idx % 2 === 0 ? 'Basic' : 'Elite'}`,
        rarity: idx % 2 === 0 ? 'Basic' : 'Elite',
        currency: 'diamond',
        price:
          idx % 2 === 0
            ? Math.max(40, Math.round(appConfig.specialDiamondPrice * 0.45))
            : Math.max(60, Math.round(appConfig.specialDiamondPrice * 0.7)),
        imageUrl: h.splash || h.head || h.smallmap,
      });
    }
  });

  defaultList.sort((a, b) => a.heroName.localeCompare(b.heroName));
  diamondList.sort((a, b) => a.heroName.localeCompare(b.heroName) || a.price - b.price);

  return {
    defaultSkins: defaultList,
    diamondSkins: diamondList,
    limitedSkins: limitedList,
    allSkins: [...defaultList, ...diamondList, ...limitedList],
  };
}

export function getSkinsForHero(
  heroId: number,
  heroName: string,
  catalog: HeroSkinCatalog
): SkinItem[] {
  const lowerName = heroName.trim().toLowerCase();
  const match = (s: SkinItem) =>
    s.heroId === heroId || s.heroName.trim().toLowerCase() === lowerName;

  const def = catalog.defaultSkins.filter(match);
  const dia = catalog.diamondSkins.filter(match);
  const lim = catalog.limitedSkins.filter(match);
  return [...def, ...dia, ...lim];
}
