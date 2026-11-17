import type {
  BattleSpell,
  EmblemSet,
  EmblemTalent,
  EquipCategory,
  EquipmentItem,
  HeroCounterEntry,
  HeroDetail,
  HeroLane,
  HeroRole,
  HeroSkill,
  HeroSummary,
  HeroWallpaper,
  ImageQuality,
  ItemRecipeNode,
} from '../types/mlbb';
import {
  normalizeRole,
  parseEquipmentTips,
  stripMlbbMarkup,
} from '../utils/mlbbParser';

const API_PREFIX = '/api/mlbb';

const heroesCacheByLang = new Map<string, HeroSummary[]>();
const equipmentCacheByLang = new Map<string, EquipmentItem[]>();
const spellsCacheByLang = new Map<string, BattleSpell[]>();
const emblemsCacheByLang = new Map<string, { sets: EmblemSet[]; talents: EmblemTalent[] }>();
let wallpapersCache: HeroWallpaper[] | null = null;
let wallpapersPromise: Promise<HeroWallpaper[]> | null = null;

const heroDetailCache = new Map<string, HeroDetail>();
const heroCountersCache = new Map<string, HeroCounterEntry[]>();

export function clearMlbbApiCache() {
  heroesCacheByLang.clear();
  equipmentCacheByLang.clear();
  spellsCacheByLang.clear();
  emblemsCacheByLang.clear();
  wallpapersCache = null;
  wallpapersPromise = null;
  heroDetailCache.clear();
  heroCountersCache.clear();
}

export function applyImageQuality(url: string | undefined, quality: ImageQuality): string {
  if (!url) return '';
  if (!url.includes('wsrv.nl')) return url;
  const params =
    quality === 'hemat'
      ? '&w=200&q=38'
      : quality === 'sedang'
      ? '&w=380&q=62'
      : quality === 'tinggi'
      ? '&w=700&q=84'
      : '&w=1080&q=96';
  if (url.includes('&q=')) return url;
  return `${url}${params}`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_PREFIX}${path}`);
  if (!res.ok) {
    throw new Error(`API error (${res.status}) saat memuat ${path}`);
  }
  return res.json() as Promise<T>;
}

function normalizeLane(raw: string): HeroLane | null {
  const lower = raw.trim().toLowerCase();
  if (lower.includes('gold')) return 'Gold Lane';
  if (lower.includes('exp')) return 'Exp Lane';
  if (lower.includes('mid')) return 'Mid Lane';
  if (lower.includes('jungle')) return 'Jungle';
  if (lower.includes('roam')) return 'Roam';
  return null;
}

function normalizeEquipCategory(raw: string): EquipCategory {
  const lower = raw.trim().toLowerCase();
  if (lower === 'attack') return 'Attack';
  if (lower === 'magic') return 'Magic';
  if (lower === 'defense') return 'Defense';
  if (lower === 'movement') return 'Movement';
  if (lower === 'jungle') return 'Jungle';
  if (lower === 'roam') return 'Roam';
  return 'Attack';
}

function hashNameKey(name: string): number {
  let h = -1;
  const s = name.trim().toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h < 0 ? h : -h - 1;
}

export async function loadHeroWallpapers(lang = 'id'): Promise<HeroWallpaper[]> {
  if (wallpapersCache) return wallpapersCache;
  if (wallpapersPromise) return wallpapersPromise;

  wallpapersPromise = (async () => {
    try {
      const [p1, p2, p3] = await Promise.all([
        fetchJson<any>(`/heroes/wallpapers?lang=${encodeURIComponent(lang)}&size=500&index=1`),
        fetchJson<any>(`/heroes/wallpapers?lang=${encodeURIComponent(lang)}&size=500&index=2`).catch(() => null),
        fetchJson<any>(`/heroes/wallpapers?lang=${encodeURIComponent(lang)}&size=500&index=3`).catch(() => null),
      ]);

      const rawList = [
        ...(p1?.data?.records || []),
        ...(p2?.data?.records || []),
        ...(p3?.data?.records || []),
      ];

      const seenIds = new Set<number>();
      const list: HeroWallpaper[] = [];

      for (const rec of rawList) {
        const id = Number(rec?.id || 0);
        if (!id || seenIds.has(id)) continue;
        const pics = rec?.data?.pictures || [];
        const url = String(pics[0]?.url || '');
        if (!url) continue;
        seenIds.add(id);

        const caption = String(rec?.caption || rec?.data?.skinid || 'Skin');
        const skinIdField = String(rec?.data?.skinid || '');
        const match = caption.match(/^(\d+)_([^_]+)_(.+)$/);

        const heroId = match ? Number(match[1]) : undefined;
        const heroName = match ? match[2] : undefined;
        const skinCode = match ? match[3] : skinIdField || caption;
        const isLimitedWallpaper =
          !match ||
          caption.includes('壁纸') ||
          skinIdField.includes('壁纸') ||
          !/skin\d+/i.test(skinCode);

        list.push({
          id,
          caption,
          url,
          hdUrl: String(pics[1]?.url || url),
          heroId,
          heroName,
          skinCode,
          isLimitedWallpaper,
        });
      }

      wallpapersCache = list;
      return list;
    } catch {
      return [];
    } finally {
      wallpapersPromise = null;
    }
  })();

  return wallpapersPromise;
}

export async function loadAllHeroes(
  lang = 'id',
  forceRefresh = false
): Promise<HeroSummary[]> {
  if (!forceRefresh && heroesCacheByLang.has(lang)) {
    return heroesCacheByLang.get(lang)!;
  }

  const [heroesRes, posRes, rankRes, wallpapers] = await Promise.all([
    fetchJson<any>(`/heroes?lang=${encodeURIComponent(lang)}&size=200`),
    fetchJson<any>(`/heroes/positions?lang=${encodeURIComponent(lang)}&size=200`),
    fetchJson<any>(`/heroes/rank?lang=${encodeURIComponent(lang)}&size=200`).catch(() => null),
    loadHeroWallpapers(lang).catch(() => [] as HeroWallpaper[]),
  ]);

  // Build heroId -> default rectangular full splash art map (prioritize skin00, then skin01, then any wallpaper)
  const splashMap = new Map<number, string>();
  for (const w of wallpapers) {
    if (!w.heroId) continue;
    const code = (w.skinCode || '').toLowerCase();
    const existing = splashMap.get(w.heroId);
    if (!existing) {
      splashMap.set(w.heroId, w.url);
    } else if (code === 'skin00') {
      splashMap.set(w.heroId, w.url);
    } else if (code === 'skin01' && !existing.includes('skin00')) {
      splashMap.set(w.heroId, w.url);
    }
  }

  const posMap = new Map<
    number,
    {
      roles: HeroRole[];
      roleIcons: string[];
      lanes: HeroLane[];
      laneIcons: string[];
      smallmap?: string;
    }
  >();

  for (const rec of posRes?.data?.records || []) {
    const heroId = Number(rec?.data?.hero_id || rec?.data?.hero?.data?.heroid || 0);
    const hData = rec?.data?.hero?.data;
    const name = String(hData?.name || '');

    const roles: HeroRole[] = [];
    const roleIcons: string[] = [];
    for (const s of hData?.sortid || []) {
      if (s && typeof s === 'object' && s.data?.sort_title) {
        const r = normalizeRole(s.data.sort_title);
        if (r && !roles.includes(r)) {
          roles.push(r);
          if (s.data.sort_icon) roleIcons.push(s.data.sort_icon);
        }
      }
    }

    const lanes: HeroLane[] = [];
    const laneIcons: string[] = [];
    for (const l of hData?.roadsort || []) {
      if (l && typeof l === 'object' && l.data?.road_sort_title) {
        const ln = normalizeLane(l.data.road_sort_title);
        if (ln && !lanes.includes(ln)) {
          lanes.push(ln);
          if (l.data.road_sort_icon) laneIcons.push(l.data.road_sort_icon);
        }
      }
    }

    if (heroId) {
      posMap.set(heroId, { roles, roleIcons, lanes, laneIcons, smallmap: hData?.smallmap });
    }
    if (name) {
      posMap.set(hashNameKey(name), { roles, roleIcons, lanes, laneIcons, smallmap: hData?.smallmap });
    }
  }

  const rankMap = new Map<
    number,
    { winRate: number; banRate: number; pickRate: number }
  >();
  for (const rec of rankRes?.data?.records || []) {
    const d = rec?.data;
    const id = Number(d?.main_heroid || 0);
    if (id) {
      rankMap.set(id, {
        winRate: Number(d?.main_hero_win_rate || 0),
        banRate: Number(d?.main_hero_ban_rate || 0),
        pickRate: Number(d?.main_hero_appearance_rate || 0),
      });
    }
  }

  const list: HeroSummary[] = (heroesRes?.data?.records || []).map((rec: any) => {
    const d = rec?.data || {};
    const id = Number(d?.hero_id || 0);
    const h = d?.hero?.data || {};
    const name = String(h?.name || `Hero ${id}`);
    const pos = posMap.get(id) || posMap.get(hashNameKey(name));
    const rank = rankMap.get(id);

    return {
      id,
      name,
      head: String(h?.head || ''),
      smallmap: String(h?.smallmap || pos?.smallmap || h?.head || ''),
      splash: splashMap.get(id) || String(h?.head || h?.smallmap || ''),
      roles: pos?.roles?.length ? pos.roles : ['Fighter'],
      roleIcons: pos?.roleIcons || [],
      lanes: pos?.lanes || [],
      laneIcons: pos?.laneIcons || [],
      winRate: rank?.winRate,
      banRate: rank?.banRate,
      pickRate: rank?.pickRate,
      relation: {
        assist: (d?.relation?.assist?.target_hero_id || []).filter((x: number) => x > 0),
        strong: (d?.relation?.strong?.target_hero_id || []).filter((x: number) => x > 0),
        weak: (d?.relation?.weak?.target_hero_id || []).filter((x: number) => x > 0),
      },
    };
  });

  list.sort((a, b) => a.name.localeCompare(b.name, lang));
  heroesCacheByLang.set(lang, list);
  return list;
}

export async function loadHeroDetail(heroId: number, lang = 'id'): Promise<HeroDetail> {
  const key = `${lang}:${heroId}`;
  const cached = heroDetailCache.get(key);
  if (cached) return cached;

  const json = await fetchJson<any>(`/heroes/${heroId}?lang=${encodeURIComponent(lang)}`);
  const rec = json?.data?.records?.[0]?.data || {};
  const h = rec?.hero?.data || {};

  const roles: HeroRole[] = [];
  for (const s of h?.sortid || []) {
    if (s && typeof s === 'object' && s.data?.sort_title) {
      const r = normalizeRole(s.data.sort_title);
      if (r && !roles.includes(r)) roles.push(r);
    }
  }
  if (roles.length === 0 && Array.isArray(h?.sortlabel)) {
    for (const lbl of h.sortlabel) {
      const r = normalizeRole(String(lbl || ''));
      if (r && !roles.includes(r)) roles.push(r);
    }
  }

  const lanes: HeroLane[] = [];
  for (const l of h?.roadsort || []) {
    if (l && typeof l === 'object' && l.data?.road_sort_title) {
      const ln = normalizeLane(l.data.road_sort_title);
      if (ln && !lanes.includes(ln)) lanes.push(ln);
    }
  }
  if (lanes.length === 0 && Array.isArray(h?.roadsortlabel)) {
    for (const lbl of h.roadsortlabel) {
      const ln = normalizeLane(String(lbl || ''));
      if (ln && !lanes.includes(ln)) lanes.push(ln);
    }
  }

  const rawSkillGroup = h?.heroskilllist?.[0]?.skilllist || [];
  const skills: HeroSkill[] = rawSkillGroup.map((sk: any, idx: number) => ({
    skillid: Number(sk?.skillid || idx),
    skillname: String(sk?.skillname || `Skill ${idx + 1}`),
    skillicon: String(sk?.skillicon || ''),
    skilldesc: String(sk?.skilldesc || ''),
    cdAndCost: String(sk?.['skillcd&cost'] || '').trim(),
    tags: Array.isArray(sk?.skilltag) ? sk.skilltag : [],
    isPassive: idx === 0 || !String(sk?.['skillcd&cost'] || '').trim(),
  }));

  const abilityArr = Array.isArray(h?.abilityshow) ? h.abilityshow : ['50', '50', '50', '50'];
  const recBuilds: number[] = [];
  const plans = h?.recommendmasterplan || [];
  if (Array.isArray(plans) && plans[0]?.equiplist) {
    for (const eq of plans[0].equiplist) {
      const eqId = Number(eq?.equipid || 0);
      if (eqId) recBuilds.push(eqId);
    }
  }

  const detail: HeroDetail = {
    id: Number(rec?.hero_id || h?.heroid || heroId),
    name: String(h?.name || `Hero ${heroId}`),
    head: String(rec?.head || h?.head || ''),
    headBig: String(rec?.head_big || h?.squareheadbig || h?.squarehead || h?.painting || h?.head || ''),
    smallmap: String(h?.smallmap || h?.head || ''),
    painting: String(h?.painting || h?.squareheadbig || h?.head || ''),
    squarehead: String(h?.squareheadbig || h?.squarehead || h?.head || ''),
    story: String(h?.story || ''),
    tale: String(h?.tale || ''),
    roles: roles.length ? roles : ['Fighter'],
    lanes,
    speciality: Array.isArray(h?.speciality) ? h.speciality.filter(Boolean) : [],
    difficulty: Number(h?.difficulty || abilityArr[3] || 50),
    ability: {
      durability: Number(abilityArr[0] || 40),
      offense: Number(abilityArr[1] || 50),
      control: Number(abilityArr[2] || 40),
      difficulty: Number(abilityArr[3] || 50),
    },
    skills,
    relation: {
      assist: (rec?.relation?.assist?.target_hero_id || []).filter((x: number) => x > 0),
      strong: (rec?.relation?.strong?.target_hero_id || []).filter((x: number) => x > 0),
      weak: (rec?.relation?.weak?.target_hero_id || []).filter((x: number) => x > 0),
    },
    recommendedBuildIds: recBuilds,
  };

  heroDetailCache.set(key, detail);
  return detail;
}

export async function loadHeroCounters(
  heroId: number,
  lang = 'id'
): Promise<HeroCounterEntry[]> {
  const key = `${lang}:${heroId}`;
  const cached = heroCountersCache.get(key);
  if (cached) return cached;

  try {
    const json = await fetchJson<any>(
      `/heroes/${heroId}/counters?lang=${encodeURIComponent(lang)}`
    );
    const sub = json?.data?.records?.[0]?.data?.sub_hero || [];
    const entries: HeroCounterEntry[] = sub
      .map((item: any) => ({
        heroId: Number(item?.heroid || 0),
        head: String(item?.hero?.data?.head || ''),
        winRate: Number(item?.hero_win_rate || 0),
        increaseWinRate: Number(item?.increase_win_rate || 0),
        appearanceRate: Number(item?.hero_appearance_rate || 0),
      }))
      .filter((e: HeroCounterEntry) => e.heroId > 0);
    heroCountersCache.set(key, entries);
    return entries;
  } catch {
    return [];
  }
}

export async function loadAllEquipment(
  lang = 'id',
  forceRefresh = false
): Promise<EquipmentItem[]> {
  if (!forceRefresh && equipmentCacheByLang.has(lang)) {
    return equipmentCacheByLang.get(lang)!;
  }

  const json = await fetchJson<any>(
    `/academy/equipment/expanded?lang=${encodeURIComponent(lang)}&size=250`
  );
  const records = json?.data?.records || [];

  const items: EquipmentItem[] = records.map((rec: any) => {
    const d = rec?.data || {};
    const targetIds = String(d?.targetequipid || '')
      .split(';')
      .map((s: string) => Number(s.trim()))
      .filter((n: number) => !Number.isNaN(n) && n > 0);

    const { rawTips, stats } = parseEquipmentTips(String(d?.equiptips || ''));

    const passives: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const val = String(d?.[`equipskill${i}`] || '').trim();
      if (val && val !== ':' && !/^Pasif\s*-\s*[^:]+:\s*$/i.test(val)) {
        passives.push(val);
      }
    }
    if (passives.length === 0 && d?.equipskilldesc) {
      const fallbackLines = String(d.equipskilldesc)
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s && s !== ':');
      passives.push(...fallbackLines);
    }

    const equipId = Number(d?.equipid || rec?.id || 0);
    return {
      id: equipId,
      name: String(d?.equipname || `Item ${equipId}`),
      icon: String(d?.equipicon || ''),
      category: normalizeEquipCategory(String(d?.equiptypename || 'Attack')),
      rawTips,
      passives,
      targetEquipIds: targetIds,
      stats,
      tier: targetIds.length === 0 ? 'jadi' : 'dasar',
    };
  });

  const hasIncomingMaterial = new Set<number>();
  for (const item of items) {
    for (const targetId of item.targetEquipIds) {
      hasIncomingMaterial.add(targetId);
    }
  }

  for (const item of items) {
    if (item.targetEquipIds.length === 0) {
      item.tier = 'jadi';
    } else if (hasIncomingMaterial.has(item.id)) {
      item.tier = 'menengah';
    } else {
      item.tier = 'dasar';
    }
  }

  items.sort((a, b) => a.name.localeCompare(b.name, lang));
  equipmentCacheByLang.set(lang, items);
  return items;
}

export async function loadBattleSpells(lang = 'id'): Promise<BattleSpell[]> {
  if (spellsCacheByLang.has(lang)) return spellsCacheByLang.get(lang)!;
  try {
    const json = await fetchJson<any>(`/academy/spells?lang=${encodeURIComponent(lang)}`);
    const list: BattleSpell[] = (json?.data?.records || []).map((rec: any) => {
      const d = rec?.data?.__data || {};
      return {
        id: Number(rec?.id || d?.skillid || 0),
        name: String(d?.skillname || 'Battle Spell'),
        icon: String(d?.skillicon || ''),
        cd: Number(d?.skillcd || 60),
        desc: stripMlbbMarkup(String(d?.skilldesc || '')),
      };
    });
    spellsCacheByLang.set(lang, list);
    return list;
  } catch {
    return [];
  }
}

export async function loadEmblemsAndTalents(
  lang = 'id'
): Promise<{ sets: EmblemSet[]; talents: EmblemTalent[] }> {
  if (emblemsCacheByLang.has(lang)) return emblemsCacheByLang.get(lang)!;
  try {
    const [rolesJson, talentsJson] = await Promise.all([
      fetchJson<any>(`/academy/roles?lang=${encodeURIComponent(lang)}`),
      fetchJson<any>(`/academy/emblems?lang=${encodeURIComponent(lang)}`),
    ]);

    const sets: EmblemSet[] = (rolesJson?.data?.records || []).map((rec: any, idx: number) => {
      const det = rec?.data?.emblem_detail?.data || {};
      const rawAttr = String(det?.emblemattr?.emblemattr || '');
      const { stats } = parseEquipmentTips(rawAttr);
      return {
        id: Number(det?.emblemid || idx),
        name: String(det?.emblemname || 'Emblem'),
        icon: String(det?.attriicon || ''),
        rawAttr,
        stats,
      };
    });

    const talents: EmblemTalent[] = (talentsJson?.data?.records || []).map((rec: any) => {
      const sk = rec?.data?.emblemskill || {};
      const tierRaw = Number(rec?.data?.gifttiers || 1);
      const tier: 1 | 2 | 3 = tierRaw === 2 ? 2 : tierRaw === 3 ? 3 : 1;
      return {
        id: Number(rec?.data?.giftid || sk?.skillid || rec?.id || 0),
        tier,
        name: String(sk?.skillname || 'Talent'),
        icon: String(sk?.skillicon || ''),
        desc: stripMlbbMarkup(String(sk?.skilldesc || '')),
      };
    });

    const result = { sets, talents };
    emblemsCacheByLang.set(lang, result);
    return result;
  } catch {
    return { sets: [], talents: [] };
  }
}

export function buildItemRecipeTree(
  item: EquipmentItem,
  allItems: EquipmentItem[],
  visited = new Set<number>()
): ItemRecipeNode {
  const nextVisited = new Set(visited);
  nextVisited.add(item.id);

  const directMaterials = allItems.filter(
    (candidate) =>
      candidate.id !== item.id &&
      !nextVisited.has(candidate.id) &&
      candidate.targetEquipIds.includes(item.id)
  );

  return {
    item,
    materials: directMaterials.map((mat) =>
      buildItemRecipeTree(mat, allItems, nextVisited)
    ),
  };
}

export function getItemUpgrades(
  item: EquipmentItem,
  allItems: EquipmentItem[]
): EquipmentItem[] {
  if (item.targetEquipIds.length === 0) return [];
  const targetSet = new Set(item.targetEquipIds);
  return allItems.filter((candidate) => targetSet.has(candidate.id));
}
