import { memo, useEffect, useMemo, useState } from 'react';
import {
  Shield,
  Swords,
  Plus,
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import type { HeroCounterEntry, HeroDetail, HeroRole, HeroSummary } from '../types/mlbb';
import { loadHeroCounters, loadHeroDetail } from '../services/mlbbApi';
import { useAppContext } from '../context/AppContext';
import { GameImage } from '../components/GameImage';
import { HeroPickerModal } from '../components/HeroPickerModal';

const LANE_SLOTS = ['Exp Lane', 'Jungle', 'Mid Lane', 'Gold Lane', 'Roam'];

interface DraftPageProps {
  heroes: HeroSummary[];
}

export const DraftPage = memo(function DraftPage({ heroes }: DraftPageProps) {
  const { apiLang, ui, getHeroDisplayImage } = useAppContext();
  const [enemyTeam, setEnemyTeam] = useState<Array<HeroSummary | null>>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [myTeam, setMyTeam] = useState<Array<HeroSummary | null>>([
    null,
    null,
    null,
    null,
    null,
  ]);

  const [pickerTarget, setPickerTarget] = useState<{
    side: 'enemy' | 'ally';
    index: number;
  } | null>(null);

  const [heroDetailsMap, setHeroDetailsMap] = useState<Record<number, HeroDetail>>({});
  const [countersMap, setCountersMap] = useState<Record<number, HeroCounterEntry[]>>({});

  const heroById = useMemo(() => {
    const map = new Map<number, HeroSummary>();
    for (const h of heroes) map.set(h.id, h);
    return map;
  }, [heroes]);

  const allPickedIds = useMemo(() => {
    const ids: number[] = [];
    for (const h of enemyTeam) if (h) ids.push(h.id);
    for (const h of myTeam) if (h) ids.push(h.id);
    return ids;
  }, [enemyTeam, myTeam]);

  useEffect(() => {
    const missingDetails = allPickedIds.filter((id) => !heroDetailsMap[id]);
    if (missingDetails.length > 0) {
      Promise.all(
        missingDetails.map((id) =>
          loadHeroDetail(id, apiLang)
            .then((d) => [id, d] as const)
            .catch(() => null)
        )
      ).then((results) => {
        const next: Record<number, HeroDetail> = {};
        for (const item of results) {
          if (item) next[item[0]] = item[1];
        }
        if (Object.keys(next).length > 0) {
          setHeroDetailsMap((prev) => ({ ...prev, ...next }));
        }
      });
    }

    const enemyIds = enemyTeam.filter(Boolean).map((h) => h!.id);
    const missingCounters = enemyIds.filter((id) => !countersMap[id]);
    if (missingCounters.length > 0) {
      Promise.all(
        missingCounters.map((id) =>
          loadHeroCounters(id, apiLang)
            .then((c) => [id, c] as const)
            .catch(() => null)
        )
      ).then((results) => {
        const next: Record<number, HeroCounterEntry[]> = {};
        for (const item of results) {
          if (item) next[item[0]] = item[1];
        }
        if (Object.keys(next).length > 0) {
          setCountersMap((prev) => ({ ...prev, ...next }));
        }
      });
    }
  }, [allPickedIds, enemyTeam, heroDetailsMap, countersMap, apiLang]);

  const enemyCount = enemyTeam.filter(Boolean).length;
  const myCount = myTeam.filter(Boolean).length;
  const isDraftComplete = enemyCount === 5 && myCount === 5;

  const counterRecommendations = useMemo(() => {
    const pickedEnemies = enemyTeam.filter(Boolean) as HeroSummary[];
    if (pickedEnemies.length === 0) return [];

    const scoreMap = new Map<
      number,
      {
        hero: HeroSummary;
        score: number;
        countersTargets: string[];
      }
    >();

    const alreadyPickedSet = new Set(allPickedIds);

    for (const enemy of pickedEnemies) {
      const apiCounters = countersMap[enemy.id] || [];
      for (const entry of apiCounters) {
        const candidate = heroById.get(entry.heroId);
        if (!candidate || alreadyPickedSet.has(candidate.id)) continue;
        const isWeak = enemy.relation.weak.includes(candidate.id);
        const lift = entry.increaseWinRate;
        if (isWeak || lift < -0.005 || lift > 0.01) {
          const existing = scoreMap.get(candidate.id) || {
            hero: candidate,
            score: 0,
            countersTargets: [],
          };
          existing.score += isWeak ? 35 : Math.abs(lift) * 1000;
          if (!existing.countersTargets.includes(enemy.name)) {
            existing.countersTargets.push(enemy.name);
          }
          scoreMap.set(candidate.id, existing);
        }
      }

      for (const weakId of enemy.relation.weak) {
        const candidate = heroById.get(weakId);
        if (!candidate || alreadyPickedSet.has(candidate.id)) continue;
        const existing = scoreMap.get(candidate.id) || {
          hero: candidate,
          score: 0,
          countersTargets: [],
        };
        existing.score += 45;
        if (!existing.countersTargets.includes(enemy.name)) {
          existing.countersTargets.push(enemy.name);
        }
        scoreMap.set(candidate.id, existing);
      }

      for (const candidate of heroes) {
        if (alreadyPickedSet.has(candidate.id)) continue;
        if (candidate.relation.strong.includes(enemy.id)) {
          const existing = scoreMap.get(candidate.id) || {
            hero: candidate,
            score: 0,
            countersTargets: [],
          };
          existing.score += 30;
          if (!existing.countersTargets.includes(enemy.name)) {
            existing.countersTargets.push(enemy.name);
          }
          scoreMap.set(candidate.id, existing);
        }
      }
    }

    return [...scoreMap.values()]
      .sort((a, b) => b.countersTargets.length - a.countersTargets.length || b.score - a.score)
      .slice(0, 8);
  }, [enemyTeam, countersMap, heroById, heroes, allPickedIds]);

  const matchupAnalysis = useMemo(() => {
    const allies = myTeam.filter(Boolean) as HeroSummary[];
    const enemies = enemyTeam.filter(Boolean) as HeroSummary[];
    const warnings: Array<{ ally: string; enemy: string }> = [];
    const advantages: Array<{ ally: string; enemy: string }> = [];

    for (const ally of allies) {
      for (const enemy of enemies) {
        if (ally.relation.weak.includes(enemy.id) || enemy.relation.strong.includes(ally.id)) {
          warnings.push({ ally: ally.name, enemy: enemy.name });
        }
        if (ally.relation.strong.includes(enemy.id) || enemy.relation.weak.includes(ally.id)) {
          advantages.push({ ally: ally.name, enemy: enemy.name });
        }
      }
    }
    return { warnings, advantages };
  }, [myTeam, enemyTeam]);

  function computeTeamStats(team: Array<HeroSummary | null>) {
    const picked = team.filter(Boolean) as HeroSummary[];
    if (picked.length === 0) {
      return {
        count: 0,
        durability: 0,
        offense: 0,
        control: 0,
        winRate: 0,
        rolesPresent: new Set<HeroRole>(),
        physicalCount: 0,
        magicCount: 0,
      };
    }

    let dur = 0;
    let off = 0;
    let ctrl = 0;
    let wrSum = 0;
    let wrCount = 0;
    let phys = 0;
    let mag = 0;
    const rolesPresent = new Set<HeroRole>();

    for (const h of picked) {
      for (const r of h.roles) rolesPresent.add(r);
      if (h.roles.includes('Mage') || h.roles.includes('Support')) mag += 1;
      else phys += 1;

      if (h.winRate) {
        wrSum += h.winRate * 100;
        wrCount += 1;
      }

      const det = heroDetailsMap[h.id];
      if (det) {
        dur += det.ability.durability;
        off += det.ability.offense;
        ctrl += det.ability.control;
      } else {
        dur += h.roles.includes('Tank') ? 85 : h.roles.includes('Fighter') ? 65 : 35;
        off += h.roles.includes('Marksman') || h.roles.includes('Assassin') ? 85 : 55;
        ctrl += h.roles.includes('Tank') || h.roles.includes('Support') || h.roles.includes('Mage') ? 75 : 40;
      }
    }

    return {
      count: picked.length,
      durability: Math.round(dur / picked.length),
      offense: Math.round(off / picked.length),
      control: Math.round(ctrl / picked.length),
      winRate: wrCount > 0 ? +(wrSum / wrCount).toFixed(1) : 50.0,
      rolesPresent,
      physicalCount: phys,
      magicCount: mag,
    };
  }

  const myStats = useMemo(() => computeTeamStats(myTeam), [myTeam, heroDetailsMap]);
  const enemyStats = useMemo(() => computeTeamStats(enemyTeam), [enemyTeam, heroDetailsMap]);

  function handleSelectHero(hero: HeroSummary) {
    if (!pickerTarget) return;
    if (pickerTarget.side === 'enemy') {
      setEnemyTeam((prev) => {
        const next = [...prev];
        next[pickerTarget.index] = hero;
        return next;
      });
    } else {
      setMyTeam((prev) => {
        const next = [...prev];
        next[pickerTarget.index] = hero;
        return next;
      });
    }
  }

  function handleFillCounterIntoAlly(hero: HeroSummary) {
    const emptyIdx = myTeam.findIndex((s) => s === null);
    if (emptyIdx === -1) return;
    setMyTeam((prev) => {
      const next = [...prev];
      next[emptyIdx] = hero;
      return next;
    });
  }

  function handleAutoSample() {
    if (heroes.length < 15) return;
    const byRole = (r: HeroRole, skipIds: Set<number>) =>
      heroes.find((h) => h.roles.includes(r) && !skipIds.has(h.id)) ||
      heroes.find((h) => !skipIds.has(h.id))!;

    const used = new Set<number>();
    const sampleEnemy: HeroSummary[] = [];
    (['Fighter', 'Assassin', 'Mage', 'Marksman', 'Tank'] as HeroRole[]).forEach((r) => {
      const pick = byRole(r, used);
      used.add(pick.id);
      sampleEnemy.push(pick);
    });

    const sampleAlly: HeroSummary[] = [];
    (['Fighter', 'Assassin', 'Mage', 'Marksman', 'Support'] as HeroRole[]).forEach((r) => {
      const pick = byRole(r, used);
      used.add(pick.id);
      sampleAlly.push(pick);
    });

    setEnemyTeam(sampleEnemy);
    setMyTeam(sampleAlly);
  }

  function handleReset() {
    setEnemyTeam([null, null, null, null, null]);
    setMyTeam([null, null, null, null, null]);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight text-balance">
            {ui.draftTitle}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {ui.draftSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAutoSample}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#1A2333] hover:bg-slate-200 dark:hover:bg-[#232F44] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors"
          >
            Contoh 5v5
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-medium text-rose-600 dark:text-rose-200 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </section>

      <section className="bg-white dark:bg-[#131A26] border border-rose-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 dark:text-rose-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Tim Lawan / Musuh
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Komposisi lawan yang harus di-counter ({enemyCount}/5 terisi)
              </p>
            </div>
          </div>
          <span className="font-mono-num text-xs font-semibold text-rose-600 dark:text-rose-300">
            {enemyCount}/5
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {enemyTeam.map((hero, idx) => (
            <div key={idx} className="relative">
              <button
                type="button"
                onClick={() => setPickerTarget({ side: 'enemy', index: idx })}
                className={`relative w-full rounded-xl border overflow-hidden flex flex-col items-center justify-center transition-all ${
                  hero
                    ? 'bg-slate-900 border-rose-400/70'
                    : 'aspect-[16/10] bg-slate-50/70 dark:bg-[#0B0F17] border-dashed border-slate-300 dark:border-white/15 hover:border-rose-400 p-2'
                }`}
              >
                {hero ? (
                  <>
                    <div className="aspect-[16/10] w-full">
                      <GameImage
                        src={getHeroDisplayImage(hero)}
                        name={hero.name}
                        fullFrame
                        className="w-full h-full"
                        rounded="none"
                      />
                    </div>
                    <div className="w-full bg-slate-950/90 px-2 py-1.5 text-center border-t border-white/10">
                      <span className="block text-[11px] sm:text-xs font-bold text-white truncate">
                        {hero.name}
                      </span>
                      <span className="block text-[9px] sm:text-[10px] text-rose-300 truncate">
                        {hero.roles[0]}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-300">
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span className="mt-1.5 text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400 text-center leading-tight">
                      {LANE_SLOTS[idx]}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-0.5">
                      <Plus className="w-2.5 h-2.5" /> Pilih
                    </span>
                  </>
                )}
              </button>
              {hero && (
                <button
                  type="button"
                  aria-label={`Hapus ${hero.name}`}
                  onClick={() =>
                    setEnemyTeam((prev) => {
                      const next = [...prev];
                      next[idx] = null;
                      return next;
                    })
                  }
                  className="absolute -top-1.5 -right-1.5 z-20 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/20 text-slate-600 dark:text-slate-300 flex items-center justify-center shadow"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-center gap-4 py-1">
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        <div className="px-4 py-1.5 rounded-xl bg-white dark:bg-[#1A2333] border border-slate-200 dark:border-white/10 text-xs font-display font-bold tracking-widest text-accent">
          VS 5v5 DRAFT
        </div>
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
      </div>

      <section className="bg-white dark:bg-[#131A26] border border-amber-400/40 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-accent shrink-0">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Tim Saya (POV Anda)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih hero tim untuk mencocokkan statistik & sinergi ({myCount}/5 terisi)
              </p>
            </div>
          </div>
          <span className="font-mono-num text-xs font-semibold text-accent">
            {myCount}/5
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {myTeam.map((hero, idx) => (
            <div key={idx} className="relative">
              <button
                type="button"
                onClick={() => setPickerTarget({ side: 'ally', index: idx })}
                className={`relative w-full rounded-xl border overflow-hidden flex flex-col items-center justify-center transition-all ${
                  hero
                    ? 'bg-slate-900 border-amber-400/70'
                    : 'aspect-[16/10] bg-slate-50/70 dark:bg-[#0B0F17] border-dashed border-slate-300 dark:border-white/15 hover:border-amber-400 p-2'
                }`}
              >
                {hero ? (
                  <>
                    <div className="aspect-[16/10] w-full">
                      <GameImage
                        src={getHeroDisplayImage(hero)}
                        name={hero.name}
                        fullFrame
                        className="w-full h-full"
                        rounded="none"
                      />
                    </div>
                    <div className="w-full bg-slate-950/90 px-2 py-1.5 text-center border-t border-white/10">
                      <span className="block text-[11px] sm:text-xs font-bold text-white truncate">
                        {hero.name}
                      </span>
                      <span className="block text-[9px] sm:text-[10px] text-amber-300 truncate">
                        {hero.roles[0]}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-accent">
                      <Swords className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span className="mt-1.5 text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400 text-center leading-tight">
                      {LANE_SLOTS[idx]}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-0.5">
                      <Plus className="w-2.5 h-2.5" /> Pilih
                    </span>
                  </>
                )}
              </button>
              {hero && (
                <button
                  type="button"
                  aria-label={`Hapus ${hero.name}`}
                  onClick={() =>
                    setMyTeam((prev) => {
                      const next = [...prev];
                      next[idx] = null;
                      return next;
                    })
                  }
                  className="absolute -top-1.5 -right-1.5 z-20 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/20 text-slate-600 dark:text-slate-300 flex items-center justify-center shadow"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {enemyCount === 0 && myCount === 0 ? (
        <section className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-6 text-center space-y-2">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Mulai Draft Pick dengan memilih hero di kotak Tim Lawan atau Tim Saya
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Setelah hero dipilih, rekomendasi hero counter terbaik dan statistik perbandingan tim akan muncul di sini.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <section className="lg:col-span-7 bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-accent shrink-0" />
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Rekomendasi Hero Counter
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isDraftComplete
                    ? 'Analisis penuh 5v5 berdasarkan data counter & relasi resmi'
                    : 'Hero terbaik untuk melawan komposisi musuh yang sudah dipilih'}
                </p>
              </div>
            </div>

            {enemyCount === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
                Pilih minimal 1 hero pada Tim Lawan (atas) untuk melihat daftar counter terbaik.
              </p>
            ) : counterRecommendations.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
                Memuat data counter dari Rone Arena API...
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {counterRecommendations.map((rec) => (
                  <div
                    key={rec.hero.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <GameImage
                        src={getHeroDisplayImage(rec.hero)}
                        name={rec.hero.name}
                        fullFrame
                        className="w-20 h-12 shrink-0"
                        rounded="xl"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {rec.hero.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {rec.hero.roles.join(' / ')}
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-300 truncate mt-0.5">
                          Counter: {rec.countersTargets.join(', ')}
                        </p>
                      </div>
                    </div>

                    {myCount < 5 && (
                      <button
                        type="button"
                        onClick={() => handleFillCounterIntoAlly(rec.hero)}
                        className="btn-accent min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all"
                      >
                        + Tim
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(matchupAnalysis.advantages.length > 0 || matchupAnalysis.warnings.length > 0) && (
              <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2.5">
                {matchupAnalysis.advantages.length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-emerald-600 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>Keunggulan Tim Anda:</strong>{' '}
                      {matchupAnalysis.advantages
                        .map((a) => `${a.ally} unggul atas ${a.enemy}`)
                        .join(' · ')}
                    </span>
                  </div>
                )}
                {matchupAnalysis.warnings.length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-rose-600 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>Waspada Ter-counter:</strong>{' '}
                      {matchupAnalysis.warnings
                        .map((w) => `${w.ally} rentan terhadap ${w.enemy}`)
                        .join(' · ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="lg:col-span-5 bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-sky-500 shrink-0" />
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Statistik & Keseimbangan Tim
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Perbandingan rata-rata kemampuan Tim Saya vs Musuh
                </p>
              </div>
            </div>

            <div className="space-y-3.5 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-xl p-4">
              {[
                { label: 'Serangan (Offense)', my: myStats.offense, en: enemyStats.offense },
                { label: 'Ketahanan (Durability)', my: myStats.durability, en: enemyStats.durability },
                { label: 'Efek Kontrol (CC)', my: myStats.control, en: enemyStats.control },
                { label: 'Rata-rata Win Rate', my: myStats.winRate, en: enemyStats.winRate, suffix: '%' },
              ].map((row) => (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-num font-semibold text-amber-600 dark:text-amber-300">
                      {row.my}{row.suffix || ''}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{row.label}</span>
                    <span className="font-mono-num font-semibold text-rose-600 dark:text-rose-300">
                      {row.en}{row.suffix || ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 h-2">
                    <div className="bg-slate-200 dark:bg-white/5 rounded-l-full overflow-hidden flex justify-end">
                      <div
                        className="h-full bg-amber-400 rounded-l-full transition-all"
                        style={{ width: `${Math.min(100, row.my)}%` }}
                      />
                    </div>
                    <div className="bg-slate-200 dark:bg-white/5 rounded-r-full overflow-hidden">
                      <div
                        className="h-full bg-rose-400 rounded-r-full transition-all"
                        style={{ width: `${Math.min(100, row.en)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Tipe Damage Tim Saya</span>
                <span className="font-mono-num text-slate-900 dark:text-slate-200 font-semibold">
                  {myStats.physicalCount} Physical · {myStats.magicCount} Magic
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Kelengkapan Role</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {[...myStats.rolesPresent].join(', ') || 'Belum ada'}
                </span>
              </div>
              {myCount > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-white/5">
                  {!myStats.rolesPresent.has('Tank') && !myStats.rolesPresent.has('Support')
                    ? 'Saran: Tambahkan Tank atau Support untuk garis depan & Crowd Control.'
                    : myStats.magicCount === 0
                    ? 'Saran: Tim belum memiliki Magic Damage; musuh mudah menumpuk Physical Defense.'
                    : myStats.physicalCount === 0
                    ? 'Saran: Tim belum memiliki Physical DPS untuk menghancurkan turret & objektif.'
                    : 'Komposisi tipe damage & role tim Anda sudah seimbang.'}
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      <HeroPickerModal
        open={pickerTarget !== null}
        title={
          pickerTarget?.side === 'enemy'
            ? `Pilih Hero Tim Lawan (Slot ${pickerTarget.index + 1})`
            : `Pilih Hero Tim Saya (Slot ${(pickerTarget?.index ?? 0) + 1})`
        }
        subtitle={
          pickerTarget ? `Rekomendasi posisi: ${LANE_SLOTS[pickerTarget.index]}` : undefined
        }
        heroes={heroes}
        selectedHeroId={
          pickerTarget
            ? pickerTarget.side === 'enemy'
              ? enemyTeam[pickerTarget.index]?.id
              : myTeam[pickerTarget.index]?.id
            : null
        }
        disabledHeroIds={allPickedIds}
        onSelect={handleSelectHero}
        onClose={() => setPickerTarget(null)}
      />
    </div>
  );
});
