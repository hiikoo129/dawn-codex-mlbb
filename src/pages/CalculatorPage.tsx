import { memo, useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  Plus,
  RotateCcw,
  Sparkles,
  Swords,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  BattleSpell,
  EmblemSet,
  EmblemTalent,
  EquipmentItem,
  HeroDetail,
  HeroSkill,
  HeroSummary,
  ParsedItemStats,
} from '../types/mlbb';
import { loadHeroDetail } from '../services/mlbbApi';
import {
  createEmptyItemStats,
  getHeroBaseProfile,
  parseSkillDamageFormula,
} from '../utils/mlbbParser';
import { useAppContext } from '../context/AppContext';
import { GameImage } from '../components/GameImage';
import { HeroPickerModal } from '../components/HeroPickerModal';
import { ItemPickerModal } from '../components/ItemPickerModal';
import { MlbbRichText } from '../components/MlbbRichText';

interface CalculatorPageProps {
  heroes: HeroSummary[];
  equipment: EquipmentItem[];
  spells: BattleSpell[];
  emblemSets: EmblemSet[];
  emblemTalents: EmblemTalent[];
}

type ShortcutPopup =
  | {
      kind: 'skill';
      side: 1 | 2;
      heroName: string;
      slotLabel: string;
      skill: HeroSkill;
      effectiveCdr: number;
      estDamage?: number;
      formulaLabel: string;
      damageType: string;
      baseCd: number;
      reducedCd: number;
    }
  | {
      kind: 'talent';
      side: 1 | 2;
      tier: 1 | 2 | 3;
      heroName: string;
      talent: EmblemTalent | null;
    }
  | {
      kind: 'stat';
      side: 1 | 2;
      heroName: string;
      title: string;
      valueLabel: string;
      breakdown: string;
      explanation: string;
    };

function sumItemStats(items: EquipmentItem[]): ParsedItemStats {
  const total = createEmptyItemStats();
  for (const item of items) {
    const s = item.stats;
    total.physicalAttack += s.physicalAttack;
    total.magicPower += s.magicPower;
    total.attackSpeed += s.attackSpeed;
    total.critChance += s.critChance;
    total.critDamage += s.critDamage;
    total.physicalPen += s.physicalPen;
    total.physicalPenPct += s.physicalPenPct;
    total.magicPen += s.magicPen;
    total.magicPenPct += s.magicPenPct;
    total.adaptiveAttack += s.adaptiveAttack;
    total.maxHp += s.maxHp;
    total.physicalDefense += s.physicalDefense;
    total.magicDefense += s.magicDefense;
    total.cooldownReduction += s.cooldownReduction;
    total.movementSpeed += s.movementSpeed;
    total.movementSpeedPct += s.movementSpeedPct;
    total.lifesteal += s.lifesteal;
    total.spellVamp += s.spellVamp;
    total.hybridLifesteal += s.hybridLifesteal;
    total.mana += s.mana;
    total.hpRegen += s.hpRegen;
    total.manaRegen += s.manaRegen;
  }
  return total;
}

function computeSideBuildProfile(
  hero: HeroSummary | null,
  detail: HeroDetail | null,
  level: number,
  equippedItems: EquipmentItem[],
  emblem: EmblemSet | null,
  talents: EmblemTalent[],
  fallbackRole: 'Assassin' | 'Tank'
) {
  const roles = detail?.roles || hero?.roles || [fallbackRole];
  const prof = getHeroBaseProfile(roles);
  const itemStats = sumItemStats(equippedItems);

  const baseHp = Math.round(prof.baseHpLv1 + (level - 1) * prof.hpPerLevel);
  const basePhysDef = Math.round(prof.basePhysDefLv1 + (level - 1) * prof.physDefPerLevel);
  const baseMagicDef = Math.round(prof.baseMagicDefLv1 + (level - 1) * prof.magicDefPerLevel);
  const basePhysAtk = Math.round(
    prof.basePhysicalAttackLv1 + (level - 1) * prof.physicalAttackPerLevel
  );
  const baseMagicPower = prof.baseMagicPowerLv1;

  // Talent stat contributions
  let talentHp = 0;
  let talentPhysDef = 0;
  let talentMagicDef = 0;
  let talentAdaptiveAtk = 0;
  let talentPhysPen = 0;
  let talentMagicPen = 0;
  let talentCritChance = 0;
  let talentCritDmg = 0;
  let talentCdr = 0;
  let talentSpellCdr = 0;
  let weaponsMasterMult = 1;
  let talentDmgMult = 1;

  for (const t of talents) {
    const tn = t.name.toLowerCase();
    const td = t.desc.toLowerCase();
    if (tn.includes('vitality')) talentHp += 225;
    if (tn.includes('firmness')) {
      talentPhysDef += 6;
      talentMagicDef += 6;
    }
    if (tn.includes('thrill')) talentAdaptiveAtk += 16;
    if (tn.includes('fatal')) {
      talentCritChance += 5;
      talentCritDmg += 10;
    }
    if (tn.includes('inspire')) talentCdr += 5;
    if (tn.includes('rupture')) {
      talentPhysPen += 5;
      talentMagicPen += 5;
    }
    if (tn.includes('weapons master')) weaponsMasterMult = 1.05;
    if (tn.includes('pull yourself together')) talentSpellCdr += 15;
    if (tn.includes('master assassin')) talentDmgMult *= 1.07;
    if (tn.includes('war cry')) talentDmgMult *= 1.08;
    if (tn.includes('tenacity') && (td.includes('defense') || td.includes('pertahanan'))) {
      talentPhysDef += 15;
      talentMagicDef += 15;
    }
  }

  const emblemHp = emblem?.stats.maxHp || 0;
  const emblemPhysDef = emblem?.stats.physicalDefense || 0;
  const emblemMagicDef = emblem?.stats.magicDefense || 0;

  const maxHp = baseHp + itemStats.maxHp + emblemHp + talentHp;
  const physDef = basePhysDef + itemStats.physicalDefense + emblemPhysDef + talentPhysDef;
  const magicDef = baseMagicDef + itemStats.magicDefense + emblemMagicDef + talentMagicDef;

  const rawItemPhys = itemStats.physicalAttack;
  const rawItemMagic = itemStats.magicPower;
  const isMagicBuild =
    rawItemMagic > rawItemPhys ||
    (rawItemMagic === rawItemPhys && prof.primaryDamageType === 'Magic');

  const emblemAdaptive = (emblem?.stats.adaptiveAttack || 0) + talentAdaptiveAtk;
  const itemAdaptive = itemStats.adaptiveAttack;

  const emblemPhys = (emblem?.stats.physicalAttack || 0) + (isMagicBuild ? 0 : emblemAdaptive);
  const emblemMagic = (emblem?.stats.magicPower || 0) + (isMagicBuild ? emblemAdaptive : 0);

  const itemPhysWithAdaptive = Math.round(
    (rawItemPhys + (isMagicBuild ? 0 : itemAdaptive)) * weaponsMasterMult
  );

  const hasHolyCrystal = equippedItems.some((i) =>
    i.name.toLowerCase().includes('holy crystal')
  );
  const holyCrystalPct = hasHolyCrystal ? 0.21 + ((level - 1) / 14) * 0.14 : 0;
  const baseItemMagic = Math.round(
    (rawItemMagic + (isMagicBuild ? itemAdaptive : 0)) * weaponsMasterMult
  );
  const holyCrystalBonus = Math.round(
    (baseMagicPower + baseItemMagic + emblemMagic) * holyCrystalPct
  );
  const totalItemMagic = baseItemMagic + holyCrystalBonus;

  const totalPhysAttack = basePhysAtk + emblemPhys + itemPhysWithAdaptive;
  const totalMagicPower = baseMagicPower + emblemMagic + totalItemMagic;

  const hasEnchantedTalisman = equippedItems.some((i) =>
    i.name.toLowerCase().includes('enchanted talisman')
  );
  const cdrCap = hasEnchantedTalisman ? 45 : 40;
  const rawCdr = itemStats.cooldownReduction + (emblem?.stats.cooldownReduction || 0) + talentCdr;
  const effectiveCdr = Math.min(cdrCap, rawCdr);

  // Representative Magic Skill scaling estimate (average ~120% magic power + 250 base magic skill)
  const magicSkillRawEstimate = Math.round(
    (totalMagicPower > 0 ? 220 + level * 18 + totalMagicPower * 1.15 : 0) * talentDmgMult
  );

  return {
    prof,
    itemStats,
    baseHp,
    emblemHp,
    talentHp,
    maxHp,
    basePhysDef,
    emblemPhysDef,
    talentPhysDef,
    physDef,
    baseMagicDef,
    emblemMagicDef,
    talentMagicDef,
    magicDef,
    basePhysAtk,
    emblemPhys,
    itemPhysWithAdaptive,
    totalPhysAttack,
    baseMagicPower,
    emblemMagic,
    totalItemMagic,
    totalMagicPower,
    magicSkillRawEstimate,
    isMagicBuild,
    talentPhysPen,
    talentMagicPen,
    talentCritChance,
    talentCritDmg,
    talentCdr,
    talentSpellCdr,
    weaponsMasterMult,
    talentDmgMult,
    hasEnchantedTalisman,
    cdrCap,
    rawCdr,
    effectiveCdr,
  };
}

export const CalculatorPage = memo(function CalculatorPage({
  heroes,
  equipment,
  spells,
  emblemSets,
  emblemTalents,
}: CalculatorPageProps) {
  const { apiLang, ui, getHeroDisplayImage } = useAppContext();

  // Side 1: Hero & Build Anda
  const [hero1, setHero1] = useState<HeroSummary | null>(null);
  const [hero1Detail, setHero1Detail] = useState<HeroDetail | null>(null);
  const [items1, setItems1] = useState<Array<EquipmentItem | null>>([
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  const [level1, setLevel1] = useState(15);
  const [emblem1Id, setEmblem1Id] = useState<number | null>(null);
  const [talent1Ids, setTalent1Ids] = useState<[number | null, number | null, number | null]>([
    null,
    null,
    null,
  ]);
  const [spell1Id, setSpell1Id] = useState<number | null>(null);
  const [selectedSkillIdx, setSelectedSkillIdx] = useState<number>(-1); // -1 = Basic Attack

  // Side 2: Target Lawan / Counter (Bebas uji dengan hero apa saja tanpa preset paksa)
  const [hero2, setHero2] = useState<HeroSummary | null>(null);
  const [hero2Detail, setHero2Detail] = useState<HeroDetail | null>(null);
  const [items2, setItems2] = useState<Array<EquipmentItem | null>>([
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  const [level2, setLevel2] = useState(15);
  const [emblem2Id, setEmblem2Id] = useState<number | null>(null);
  const [talent2Ids, setTalent2Ids] = useState<[number | null, number | null, number | null]>([
    null,
    null,
    null,
  ]);
  const [spell2Id, setSpell2Id] = useState<number | null>(null);
  const [enemyLowHp, setEnemyLowHp] = useState(false);

  // Modals & Shortcut Penjelasan
  const [heroPickerSide, setHeroPickerSide] = useState<1 | 2 | null>(null);
  const [itemPickerTarget, setItemPickerTarget] = useState<{
    side: 1 | 2;
    slot: number;
  } | null>(null);
  const [loadoutPicker, setLoadoutPicker] = useState<
    | { kind: 'emblem'; side: 1 | 2 }
    | { kind: 'spell'; side: 1 | 2 }
    | { kind: 'talent'; side: 1 | 2; tier: 1 | 2 | 3 }
    | null
  >(null);
  const [shortcutPopup, setShortcutPopup] = useState<ShortcutPopup | null>(null);

  // Set sensible defaults once data loads
  useEffect(() => {
    if (!hero1 && heroes.length > 0) {
      setHero1(heroes.find((h) => h.name.toLowerCase() === 'ling') || heroes[0]);
    }
    if (!hero2 && heroes.length > 1) {
      setHero2(
        heroes.find((h) => h.name.toLowerCase() === 'tigreal') ||
          heroes.find((h) => h.roles.includes('Tank')) ||
          heroes[1]
      );
    }
  }, [heroes, hero1, hero2]);

  useEffect(() => {
    if (emblem1Id === null && emblemSets.length > 0) {
      setEmblem1Id(
        emblemSets.find((e) => e.name.toLowerCase() === 'assassin')?.id || emblemSets[0].id
      );
    }
    if (emblem2Id === null && emblemSets.length > 0) {
      setEmblem2Id(
        emblemSets.find((e) => e.name.toLowerCase() === 'tank')?.id || emblemSets[0].id
      );
    }
  }, [emblemSets, emblem1Id, emblem2Id]);

  useEffect(() => {
    if (spell1Id === null && spells.length > 0) {
      setSpell1Id(
        spells.find((s) => s.name.toLowerCase().includes('retribution'))?.id || spells[0].id
      );
    }
    if (spell2Id === null && spells.length > 0) {
      setSpell2Id(
        spells.find((s) => s.name.toLowerCase().includes('flicker'))?.id || spells[0].id
      );
    }
  }, [spells, spell1Id, spell2Id]);

  useEffect(() => {
    if (emblemTalents.length > 0 && talent1Ids.every((id) => id === null)) {
      const t1 = emblemTalents.find((t) => t.tier === 1)?.id ?? null;
      const t2 = emblemTalents.find((t) => t.tier === 2)?.id ?? null;
      const t3 = emblemTalents.find((t) => t.tier === 3)?.id ?? null;
      if (t1 || t2 || t3) setTalent1Ids([t1, t2, t3]);
    }
    if (emblemTalents.length > 0 && talent2Ids.every((id) => id === null)) {
      const t1List = emblemTalents.filter((t) => t.tier === 1);
      const t2List = emblemTalents.filter((t) => t.tier === 2);
      const t3List = emblemTalents.filter((t) => t.tier === 3);
      const t1 = (t1List[1] || t1List[0])?.id ?? null;
      const t2 = (t2List[1] || t2List[0])?.id ?? null;
      const t3 = (t3List[1] || t3List[0])?.id ?? null;
      if (t1 || t2 || t3) setTalent2Ids([t1, t2, t3]);
    }
  }, [emblemTalents, talent1Ids, talent2Ids]);

  useEffect(() => {
    if (!hero1) return;
    let cancelled = false;
    setSelectedSkillIdx(-1);
    loadHeroDetail(hero1.id, apiLang)
      .then((d) => {
        if (!cancelled) setHero1Detail(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hero1, apiLang]);

  useEffect(() => {
    if (!hero2) return;
    let cancelled = false;
    loadHeroDetail(hero2.id, apiLang)
      .then((d) => {
        if (!cancelled) setHero2Detail(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hero2, apiLang]);

  const equipById = useMemo(() => {
    const map = new Map<number, EquipmentItem>();
    for (const e of equipment) map.set(e.id, e);
    return map;
  }, [equipment]);

  const talentsByTier = useMemo(
    () => ({
      1: emblemTalents.filter((t) => t.tier === 1),
      2: emblemTalents.filter((t) => t.tier === 2),
      3: emblemTalents.filter((t) => t.tier === 3),
    }),
    [emblemTalents]
  );

  const equipped1 = useMemo(() => items1.filter(Boolean) as EquipmentItem[], [items1]);
  const equipped2 = useMemo(() => items2.filter(Boolean) as EquipmentItem[], [items2]);

  const emblem1 = useMemo(
    () => emblemSets.find((e) => e.id === emblem1Id) || null,
    [emblemSets, emblem1Id]
  );
  const emblem2 = useMemo(
    () => emblemSets.find((e) => e.id === emblem2Id) || null,
    [emblemSets, emblem2Id]
  );

  const selectedTalents1 = useMemo(
    () =>
      talent1Ids
        .map((id) => emblemTalents.find((t) => t.id === id) || null)
        .filter(Boolean) as EmblemTalent[],
    [talent1Ids, emblemTalents]
  );
  const selectedTalents2 = useMemo(
    () =>
      talent2Ids
        .map((id) => emblemTalents.find((t) => t.id === id) || null)
        .filter(Boolean) as EmblemTalent[],
    [talent2Ids, emblemTalents]
  );

  const spell1 = useMemo(
    () => spells.find((s) => s.id === spell1Id) || null,
    [spells, spell1Id]
  );
  const spell2 = useMemo(
    () => spells.find((s) => s.id === spell2Id) || null,
    [spells, spell2Id]
  );

  // Full Duel & Symmetrical Side 1 + Side 2 Calculations
  const duel = useMemo(() => {
    const s1 = computeSideBuildProfile(
      hero1,
      hero1Detail,
      level1,
      equipped1,
      emblem1,
      selectedTalents1,
      'Assassin'
    );
    const s2 = computeSideBuildProfile(
      hero2,
      hero2Detail,
      level2,
      equipped2,
      emblem2,
      selectedTalents2,
      'Tank'
    );

    let talentFlatBonus = 0;
    let talentBonusLabel = '';
    for (const t of selectedTalents1) {
      const tn = t.name.toLowerCase();
      if (tn.includes('master assassin')) talentBonusLabel += 'Master Assassin (+7% 1v1) · ';
      else if (tn.includes('war cry')) talentBonusLabel += 'War Cry (+8%) · ';
      else if (tn.includes('lethal ignition')) {
        const ign = Math.round(162 + ((level1 - 1) / 14) * (750 - 162));
        talentFlatBonus += ign;
        talentBonusLabel += `Lethal Ignition (+${ign} Adaptive) · `;
      } else if (tn.includes('impure rage')) {
        const rage = Math.round(s2.maxHp * 0.04);
        talentFlatBonus += rage;
        talentBonusLabel += `Impure Rage (+${rage}) · `;
      } else if (tn.includes('concussive blast')) {
        const blast = Math.round(100 + s1.maxHp * 0.07);
        talentFlatBonus += blast;
        talentBonusLabel += `Concussive Blast (+${blast}) · `;
      }
    }

    const targetHasAntique = equipped2.some((i) =>
      i.name.toLowerCase().includes('antique cuirass')
    );

    const spellCdBase = spell1?.cd || 0;
    const spellCdReduced = +(spellCdBase * (1 - s1.talentSpellCdr / 100)).toFixed(1);

    const computeAttackOutput = (skillIdx: number) => {
      const sk = skillIdx >= 0 && hero1Detail?.skills[skillIdx] ? hero1Detail.skills[skillIdx] : null;
      const formula = sk
        ? parseSkillDamageFormula(sk)
        : {
            damageType: 'Physical' as const,
            baseDamage: 0,
            totalPhysRatio: 1.0,
            extraPhysRatio: 0,
            totalMagicRatio: 0,
            hpTargetRatio: 0,
            cooldownSeconds: 0,
            formulaLabel: '100% Total Physical Attack',
          };

      const effectivePhysFromAntique =
        sk && targetHasAntique && formula.damageType === 'Physical'
          ? Math.round(s1.totalPhysAttack * 0.94)
          : s1.totalPhysAttack;

      const heroSkillBase =
        formula.baseDamage +
        (formula.hpTargetRatio > 0 ? Math.round(s2.maxHp * formula.hpTargetRatio) : 0);
      const heroStatPart = !sk
        ? s1.basePhysAtk
        : Math.round(
            s1.basePhysAtk * formula.totalPhysRatio +
              s1.baseMagicPower * formula.totalMagicRatio
          );
      const emblemStatPart = !sk
        ? s1.emblemPhys
        : Math.round(
            s1.emblemPhys * (formula.totalPhysRatio + formula.extraPhysRatio) +
              s1.emblemMagic * formula.totalMagicRatio
          );
      const itemStatPart = !sk
        ? s1.itemPhysWithAdaptive
        : Math.round(
            (effectivePhysFromAntique - s1.basePhysAtk - s1.emblemPhys) *
              (formula.totalPhysRatio + formula.extraPhysRatio) +
              s1.totalItemMagic * formula.totalMagicRatio
          );

      let extraPassive = 0;
      let dmgMult = s1.talentDmgMult;
      const passiveNotes: string[] = [];

      if (
        equipped1.some((i) => i.name.toLowerCase().includes('blade of despair')) &&
        enemyLowHp
      ) {
        dmgMult *= 1.25;
        passiveNotes.push('BoD (+25% HP <50%)');
      }
      if (
        equipped1.some((i) => i.name.toLowerCase().includes('sea halberd')) &&
        s2.maxHp > s1.maxHp
      ) {
        dmgMult *= 1.08;
        passiveNotes.push('Sea Halberd (+8% Punish)');
      }
      if (equipped1.some((i) => i.name.toLowerCase().includes('endless battle'))) {
        const eb = Math.round(s1.totalPhysAttack * 0.6);
        extraPassive += eb;
        passiveNotes.push(`Endless Battle (+${eb} True)`);
      }
      if (!sk && equipped1.some((i) => i.name.toLowerCase().includes('demon hunter sword'))) {
        const dhs = Math.round(s2.maxHp * 0.08);
        extraPassive += dhs;
        passiveNotes.push(`DHS (+${dhs} 8% HP)`);
      }
      if (sk && equipped1.some((i) => i.name.toLowerCase().includes('lightning truncheon'))) {
        const lt = Math.round(120 + s1.totalMagicPower * 1.2);
        extraPassive += lt;
        passiveNotes.push(`Lightning Truncheon (+${lt})`);
      }

      const rawCombined = Math.round(
        (heroSkillBase + heroStatPart + emblemStatPart + itemStatPart) * dmgMult +
          extraPassive +
          talentFlatBonus
      );

      let effDef = 0;
      let targetItemReduction = 1;
      const targetMitigationNotes: string[] = [];

      if (formula.damageType === 'True') {
        effDef = 0;
      } else if (formula.damageType === 'Magic') {
        const hasGlaive = equipped1.some((i) => i.name.toLowerCase().includes('divine glaive'));
        const extraPct = hasGlaive ? Math.min(20, Math.round(s2.magicDef * 0.1)) : 0;
        const pctPen = Math.min(60, s1.itemStats.magicPenPct + extraPct) / 100;
        effDef = Math.max(
          0,
          s2.magicDef * (1 - pctPen) -
            s1.itemStats.magicPen -
            (emblem1?.stats.magicPen || 0) -
            s1.talentMagicPen
        );
        if (equipped2.some((i) => i.name.toLowerCase().includes('athena'))) {
          targetItemReduction *= 0.75;
          targetMitigationNotes.push("Athena's Shield (-25% Magic)");
        }
        if (equipped2.some((i) => i.name.toLowerCase().includes('radiant armor'))) {
          targetItemReduction *= 0.88;
          targetMitigationNotes.push('Radiant Armor (-Magic DPS)');
        }
      } else {
        const hasMalefic = equipped1.some((i) => i.name.toLowerCase().includes('malefic roar'));
        const extraPct = hasMalefic ? Math.min(20, Math.round(s2.physDef * 0.125)) : 0;
        const pctPen = Math.min(60, s1.itemStats.physicalPenPct + extraPct) / 100;
        effDef = Math.max(
          0,
          s2.physDef * (1 - pctPen) -
            s1.itemStats.physicalPen -
            (emblem1?.stats.physicalPen || 0) -
            s1.talentPhysPen
        );
        if (targetHasAntique && sk) {
          targetMitigationNotes.push('Antique Cuirass (-6% Phys Atk)');
        }
      }

      if (spell2?.name.toLowerCase().includes('vengeance')) {
        targetItemReduction *= 0.65;
        targetMitigationNotes.push('Vengeance (-35% Damage)');
      }

      const defMult =
        formula.damageType === 'True' ? 1 : (120 / (120 + effDef)) * targetItemReduction;
      const finalDamage = Math.round(rawCombined * defMult);

      const finalHeroOnly = Math.round((heroSkillBase + heroStatPart) * defMult);
      const finalBonusFromItemEmblem = Math.max(0, finalDamage - finalHeroOnly);

      const baseCd = formula.cooldownSeconds;
      const reducedCd = baseCd > 0 ? +(baseCd * (1 - s1.effectiveCdr / 100)).toFixed(1) : 0;

      return {
        name: sk ? sk.skillname : 'Basic Attack',
        isPassive: sk?.isPassive || false,
        formula,
        rawCombined,
        effDef: Math.round(effDef),
        defMult,
        finalHeroOnly,
        finalBonusFromItemEmblem,
        finalDamage,
        baseCd,
        reducedCd,
        passiveNotes,
        targetMitigationNotes,
      };
    };

    const currentAttack = computeAttackOutput(selectedSkillIdx);
    const allSkillsSummary = (hero1Detail?.skills || []).map((_, idx) =>
      computeAttackOutput(idx)
    );
    const basicSummary = computeAttackOutput(-1);

    // Representative Side 2 skill damage summary (for clicking Side 2 skills)
    const side2SkillsSummary = (hero2Detail?.skills || []).map((sk) => {
      const f = parseSkillDamageFormula(sk);
      const raw = Math.round(
        (f.baseDamage +
          s2.totalPhysAttack * (f.totalPhysRatio + f.extraPhysRatio) +
          s2.totalMagicPower * f.totalMagicRatio +
          Math.round(s1.maxHp * f.hpTargetRatio)) *
          s2.talentDmgMult
      );
      const def =
        f.damageType === 'True' ? 0 : f.damageType === 'Magic' ? s1.magicDef : s1.physDef;
      const mult = f.damageType === 'True' ? 1 : 120 / (120 + def);
      const finalDmg = Math.round(raw * mult);
      const reducedCd =
        f.cooldownSeconds > 0
          ? +(f.cooldownSeconds * (1 - s2.effectiveCdr / 100)).toFixed(1)
          : 0;
      return {
        formula: f,
        finalDamage: finalDmg,
        baseCd: f.cooldownSeconds,
        reducedCd,
      };
    });

    // Side 1 & Side 2 Basic Attack Physical & Magic Damage benchmarks
    const side1PhysBasicVsSide2 = basicSummary.finalDamage;
    const side1MagicEstVsSide2 = Math.round(
      s1.magicSkillRawEstimate * (120 / (120 + Math.max(0, s2.magicDef - s1.itemStats.magicPen)))
    );
    const side2PhysBasicVsSide1 = Math.round(
      s2.totalPhysAttack * s2.talentDmgMult * (120 / (120 + Math.max(0, s1.physDef - s2.itemStats.physicalPen)))
    );
    const side2MagicEstVsSide1 = Math.round(
      s2.magicSkillRawEstimate * (120 / (120 + Math.max(0, s1.magicDef - s2.itemStats.magicPen)))
    );

    let spellNote = '';
    if (spell1) {
      const sn = spell1.name.toLowerCase();
      if (sn.includes('execute')) {
        const exeDmg = Math.round(100 + 10 * level1 + s2.maxHp * 0.13);
        spellNote = `Execute dapat mengeksekusi dengan ~${exeDmg} True Damage (menembus Armor/Magic Def target).`;
      } else if (sn.includes('inspire')) {
        spellNote = `Inspire menggandakan Attack Speed & menambah Physical Penetration sementara saat Basic Attack.`;
      } else if (sn.includes('retribution')) {
        const retriDmg = 520 + 80 * level1;
        spellNote = `Retribution memberikan ${retriDmg} True Damage ke Turtle/Lord/Creep.`;
      } else {
        spellNote = `${spell1.name} (CD ${spellCdReduced}s setelah talent) siap digunakan dalam duel.`;
      }
    }

    const recommendations: string[] = [];
    if (
      s2.physDef >= 130 &&
      !equipped1.some((i) => i.name.toLowerCase().includes('malefic roar'))
    ) {
      recommendations.push(
        `Physical Defense ${hero2?.name || 'Lawan'} mencapai ${s2.physDef} — disarankan membeli Malefic Roar agar penetrasi menembus armor.`
      );
    }
    if (
      s2.maxHp >= 7500 &&
      !equipped1.some((i) => i.name.toLowerCase().includes('demon hunter')) &&
      !s1.isMagicBuild
    ) {
      recommendations.push(
        `HP lawan tebal (${s2.maxHp.toLocaleString('id-ID')}) — pertimbangkan Demon Hunter Sword atau Sea Halberd.`
      );
    }
    if (
      s2.magicDef >= 100 &&
      s1.isMagicBuild &&
      !equipped1.some((i) => i.name.toLowerCase().includes('divine glaive'))
    ) {
      recommendations.push(
        `Magic Defense lawan mencapai ${s2.magicDef} — tambahkan Divine Glaive agar skill Magic tetap tembus.`
      );
    }
    if (
      equipped2.some(
        (i) =>
          i.name.toLowerCase().includes('oracle') ||
          i.name.toLowerCase().includes('guardian helmet')
      ) &&
      !equipped1.some(
        (i) =>
          i.name.toLowerCase().includes('sea halberd') ||
          i.name.toLowerCase().includes('glowing wand')
      )
    ) {
      recommendations.push(
        'Lawan memakai item Regen/Shield tinggi — pasang Sea Halberd (Physical) atau Glowing Wand (Magic).'
      );
    }

    const totalComboDamage =
      basicSummary.finalDamage * 2 +
      allSkillsSummary.reduce((acc, s) => acc + s.finalDamage, 0);
    const hpAfterCurrent = Math.max(0, s2.maxHp - currentAttack.finalDamage);
    const hpAfterCombo = Math.max(0, s2.maxHp - totalComboDamage);
    const canBurstTarget = hpAfterCombo === 0;

    const hasMalefic = equipped1.some((i) => i.name.toLowerCase().includes('malefic roar'));
    const extraPhysPct = hasMalefic ? Math.min(20, Math.round(s2.physDef * 0.125)) : 0;
    const totalPhysPenPct = Math.min(60, s1.itemStats.physicalPenPct + extraPhysPct);
    const totalPhysPenFlat =
      s1.itemStats.physicalPen + (emblem1?.stats.physicalPen || 0) + s1.talentPhysPen;
    const effTargetPhysDef = Math.round(
      Math.max(0, s2.physDef * (1 - totalPhysPenPct / 100) - totalPhysPenFlat)
    );
    const physMitigationPct = Math.round((effTargetPhysDef / (120 + effTargetPhysDef)) * 100);

    const hasGlaive = equipped1.some((i) => i.name.toLowerCase().includes('divine glaive'));
    const extraMagicPct = hasGlaive ? Math.min(20, Math.round(s2.magicDef * 0.1)) : 0;
    const totalMagicPenPct = Math.min(60, s1.itemStats.magicPenPct + extraMagicPct);
    const totalMagicPenFlat =
      s1.itemStats.magicPen + (emblem1?.stats.magicPen || 0) + s1.talentMagicPen;
    const effTargetMagicDef = Math.round(
      Math.max(0, s2.magicDef * (1 - totalMagicPenPct / 100) - totalMagicPenFlat)
    );
    const magicMitigationPct = Math.round((effTargetMagicDef / (120 + effTargetMagicDef)) * 100);

    return {
      s1,
      s2,
      side1PhysBasicVsSide2,
      side1MagicEstVsSide2,
      side2PhysBasicVsSide1,
      side2MagicEstVsSide1,
      hero1BasePhys: s1.basePhysAtk,
      hero1BaseMagic: s1.baseMagicPower,
      emblemPhys: s1.emblemPhys,
      emblemMagic: s1.emblemMagic,
      itemPhysWithAdaptive: s1.itemPhysWithAdaptive,
      totalItemMagic: s1.totalItemMagic,
      totalPhysAttack: s1.totalPhysAttack,
      totalMagicPower: s1.totalMagicPower,
      itemCdr: s1.itemStats.cooldownReduction,
      emblemCdr: emblem1?.stats.cooldownReduction || 0,
      talentCdr: s1.talentCdr,
      rawCdr: s1.rawCdr,
      effectiveCdr: s1.effectiveCdr,
      cdrCap: s1.cdrCap,
      hasEnchantedTalisman: s1.hasEnchantedTalisman,
      talentSpellCdr: s1.talentSpellCdr,
      spellCdBase,
      spellCdReduced,
      spellNote,
      talentBonusLabel,
      critChance: Math.min(100, s1.itemStats.critChance + s1.talentCritChance),
      critMult: 2.0 + (s1.itemStats.critDamage + s1.talentCritDmg) / 100,
      targetMaxHp: s2.maxHp,
      targetPhysDef: s2.physDef,
      targetMagicDef: s2.magicDef,
      effTargetPhysDef,
      effTargetMagicDef,
      physMitigationPct,
      magicMitigationPct,
      totalPhysPenFlat,
      totalPhysPenPct,
      totalMagicPenFlat,
      totalMagicPenPct,
      currentAttack,
      allSkillsSummary,
      side2SkillsSummary,
      basicSummary,
      totalComboDamage,
      hpAfterCurrent,
      hpAfterCombo,
      canBurstTarget,
      recommendations,
    };
  }, [
    hero1,
    hero1Detail,
    hero2,
    hero2Detail,
    equipped1,
    equipped2,
    level1,
    level2,
    emblem1,
    emblem2,
    selectedTalents1,
    selectedTalents2,
    spell1,
    spell2,
    selectedSkillIdx,
    enemyLowHp,
  ]);

  function applyRecommendedBuild(side: 1 | 2) {
    const det = side === 1 ? hero1Detail : hero2Detail;
    if (!det?.recommendedBuildIds?.length) return;
    const next: Array<EquipmentItem | null> = [null, null, null, null, null, null];
    det.recommendedBuildIds.slice(0, 6).forEach((id, idx) => {
      next[idx] = equipById.get(id) || null;
    });
    if (side === 1) setItems1(next);
    else setItems2(next);
  }

  function renderSideStatGrid(side: 1 | 2) {
    const p = side === 1 ? duel.s1 : duel.s2;
    const heroName = (side === 1 ? hero1?.name : hero2?.name) || (side === 1 ? 'Hero Anda' : 'Target Lawan');
    const physDmgEst = side === 1 ? duel.side1PhysBasicVsSide2 : duel.side2PhysBasicVsSide1;
    const magicDmgEst = side === 1 ? duel.side1MagicEstVsSide2 : duel.side2MagicEstVsSide1;

    const cards = [
      {
        label: 'HP',
        value: p.maxHp.toLocaleString('id-ID'),
        color: 'text-emerald-600 dark:text-emerald-300',
        breakdown: `Hero Lv.${side === 1 ? level1 : level2} (${p.baseHp}) + Item (${p.itemStats.maxHp}) + Emblem (${p.emblemHp}) + Talent (${p.talentHp})`,
        explanation:
          'HP (Health Points) menentukan total darah maksimal hero sebelum tereliminasi. Item seperti Guardian Helmet, Cursed Helmet, dan Dominance/Immortality menambah daya tahan HP terhadap burst Physical maupun Magic.',
      },
      {
        label: 'Physical Defense',
        value: String(p.physDef),
        color: 'text-amber-600 dark:text-amber-300',
        breakdown: `Hero Dasar (${p.basePhysDef}) + Item (${p.itemStats.physicalDefense}) + Emblem (${p.emblemPhysDef}) + Talent (${p.talentPhysDef})`,
        explanation:
          'Physical Defense meredam serangan Basic Attack dan Skill bertipe Physical dengan rumus 120 / (120 + Def Efektif). Semakin tinggi Physical Defense, semakin kecil Damage Physical yang masuk.',
      },
      {
        label: 'Magic Defense',
        value: String(p.magicDef),
        color: 'text-sky-600 dark:text-sky-300',
        breakdown: `Hero Dasar (${p.baseMagicDef}) + Item (${p.itemStats.magicDefense}) + Emblem (${p.emblemMagicDef}) + Talent (${p.talentMagicDef})`,
        explanation:
          'Magic Defense menahan serangan Skill & pasif bertipe Magic Damage. Item seperti Athena’s Shield dan Radiant Armor memberikan pengurangan ekstra terhadap burst atau DPS Mage.',
      },
      {
        label: 'Physical Attack',
        value: String(p.totalPhysAttack),
        color: 'text-rose-600 dark:text-rose-300',
        breakdown: `Hero Dasar (${p.basePhysAtk}) + Emblem & Talent (${p.emblemPhys}) + Item (${p.itemPhysWithAdaptive})`,
        explanation:
          'Physical Attack adalah statistik kekuatan serangan fisik yang mengalikan kerusakan Basic Attack (100% Total Physical Attack) dan rasio skill fisik hero.',
      },
      {
        label: 'Damage Physical',
        value: `${physDmgEst.toLocaleString('id-ID')} /hit`,
        color: 'text-orange-600 dark:text-orange-300',
        breakdown: `Output Basic Attack setelah menembus Armor lawan (Penetrasi: ${p.itemStats.physicalPen + p.talentPhysPen} Flat + ${p.itemStats.physicalPenPct}%)`,
        explanation:
          'Damage Physical adalah kerusakan aktual bertipe fisik yang diterima lawan setelah dikurangi Physical Defense efektif lawan (setelah dipotong Physical Penetration).',
      },
      {
        label: 'Damage Magic',
        value: `${p.totalMagicPower} MP · ~${magicDmgEst.toLocaleString('id-ID')}`,
        color: 'text-violet-600 dark:text-violet-300',
        breakdown: `Magic Power Hero (${p.baseMagicPower}) + Emblem (${p.emblemMagic}) + Item (${p.totalItemMagic}) | Estimasi tembus Magic Def lawan`,
        explanation:
          'Damage Magic bersumber dari Magic Power dan rasio skill sihir hero (ditambah pasif item seperti Holy Crystal atau Lightning Truncheon) sebelum diredam oleh Magic Defense efektif lawan.',
      },
    ];

    return (
      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-accent" />
            <span>Atribut &amp; Penjelasan (Ketuk untuk detail)</span>
          </span>
          <span className="text-[11px] font-mono-num font-semibold text-sky-600 dark:text-sky-300">
            CDR {p.effectiveCdr}% / {p.cdrCap}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {cards.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() =>
                setShortcutPopup({
                  kind: 'stat',
                  side,
                  heroName,
                  title: c.label,
                  valueLabel: c.value,
                  breakdown: c.breakdown,
                  explanation: c.explanation,
                })
              }
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] hover:border-accent border border-slate-200 dark:border-white/10 text-left transition-colors group"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {c.label}
                </span>
                <Info className="w-3 h-3 text-slate-400 group-hover:text-accent shrink-0" />
              </div>
              <span className={`font-mono-num text-xs sm:text-sm font-bold block mt-0.5 truncate ${c.color}`}>
                {c.value}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight text-balance">
            {ui.calcTitle}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {ui.calcSubtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setItems1([null, null, null, null, null, null]);
            setItems2([null, null, null, null, null, null]);
          }}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#1A2333] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Semua Item</span>
        </button>
      </section>

      {/* Dual Duel Setup Cards: Symmetrical Side 1 (Hero Anda) & Side 2 (Target Lawan Bebas Pilih) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* BAGIAN 1: HERO & BUILD ANDA */}
        <section className="bg-white dark:bg-[#131A26] border border-amber-400/50 rounded-2xl p-4 sm:p-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Swords className="w-5 h-5 text-accent" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                1. Hero &amp; Build Anda (Yang Dicoba)
              </h2>
            </div>
            {hero1Detail && hero1Detail.recommendedBuildIds.length > 0 && (
              <button
                type="button"
                onClick={() => applyRecommendedBuild(1)}
                className="btn-accent px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
              >
                Isi Rekomendasi
              </button>
            )}
          </div>

          {/* Zero-Crop Landscape Hero Box + Level */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <button
              type="button"
              onClick={() => setHeroPickerSide(1)}
              className="group relative w-full sm:w-44 aspect-[16/10] rounded-xl bg-slate-900 border-2 border-amber-400/70 overflow-hidden shrink-0"
            >
              {hero1 ? (
                <>
                  <GameImage
                    src={getHeroDisplayImage(hero1, hero1Detail?.painting || hero1Detail?.headBig)}
                    name={hero1.name}
                    fullFrame
                    className="w-full h-full"
                    imgClassName="group-hover:scale-105 transition-transform"
                    rounded="none"
                  />
                  <span className="absolute inset-x-0 bottom-0 z-10 py-1 bg-black/80 text-[10px] font-semibold text-amber-200 text-center">
                    Ganti Hero
                  </span>
                </>
              ) : (
                <Plus className="w-6 h-6 text-accent m-auto" />
              )}
            </button>

            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {hero1?.name || 'Pilih Hero'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {hero1?.roles.join(' / ')}
              </p>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Level Hero</span>
                  <span className="font-mono-num font-bold text-amber-600 dark:text-amber-300">
                    Lv. {level1}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={level1}
                  onChange={(e) => setLevel1(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 6 Circular Item Slots */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
              6 Slot Item (Attack, Magic, Defense, Sepatu, Jungle Retri, Roam)
            </span>
            <div className="grid grid-cols-6 gap-2">
              {items1.map((slotItem, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setItemPickerTarget({ side: 1, slot: idx })}
                  className="flex flex-col items-center gap-1 group min-w-0"
                >
                  <div
                    className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all ${
                      slotItem
                        ? 'border-amber-400 bg-slate-100 dark:bg-[#0B0F17]'
                        : 'border-dashed border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-[#0B0F17] hover:border-amber-400'
                    }`}
                  >
                    {slotItem ? (
                      <GameImage
                        src={slotItem.icon}
                        name={slotItem.name}
                        className="w-full h-full"
                        rounded="full"
                      />
                    ) : (
                      <Plus className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full text-center">
                    {slotItem ? slotItem.name : `Slot ${idx + 1}`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Emblem Set & Battle Spell */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <div className="space-y-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium block">
                Set Emblem
              </span>
              <button
                type="button"
                onClick={() => setLoadoutPicker({ kind: 'emblem', side: 1 })}
                className="w-full min-h-[48px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F17] hover:border-amber-400 border border-slate-200 dark:border-white/10 flex items-center gap-2.5 text-left transition-colors"
              >
                {emblem1?.icon ? (
                  <GameImage
                    src={emblem1.icon}
                    name={emblem1.name}
                    className="w-8 h-8 shrink-0"
                    rounded="lg"
                  />
                ) : (
                  <Plus className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate flex-1">
                  {emblem1?.name || 'Pilih Set Emblem'}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium block">
                Battle Spell
              </span>
              <button
                type="button"
                onClick={() => setLoadoutPicker({ kind: 'spell', side: 1 })}
                className="w-full min-h-[48px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F17] hover:border-amber-400 border border-slate-200 dark:border-white/10 flex items-center gap-2.5 text-left transition-colors"
              >
                {spell1?.icon ? (
                  <GameImage
                    src={spell1.icon}
                    name={spell1.name}
                    className="w-8 h-8 shrink-0"
                    rounded="full"
                  />
                ) : (
                  <Plus className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">
                    {spell1?.name || 'Pilih Spell'}
                  </span>
                  {spell1 && (
                    <span className="text-[10px] font-mono-num text-slate-500 dark:text-slate-400">
                      CD {spell1.cd}s
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>
          </div>

          {/* Talent 1, 2, 3 (Ketuk untuk Shortcut Penjelasan + Ganti Talent) */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
              Talent 1, 2 &amp; 3 (Ketuk ikon untuk Penjelasan, atau tombol Ganti)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {([0, 1, 2] as const).map((tierIdx) => {
                const tierNum = (tierIdx + 1) as 1 | 2 | 3;
                const pickedTalent =
                  emblemTalents.find((t) => t.id === talent1Ids[tierIdx]) || null;
                return (
                  <div
                    key={tierNum}
                    className="relative rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 hover:border-amber-400 transition-colors overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setShortcutPopup({
                          kind: 'talent',
                          side: 1,
                          tier: tierNum,
                          heroName: hero1?.name || 'Hero Anda',
                          talent: pickedTalent,
                        })
                      }
                      className="w-full min-h-[74px] p-2 flex flex-col items-center justify-center gap-1 text-center"
                    >
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        Talent {tierNum}
                      </span>
                      {pickedTalent ? (
                        <>
                          <GameImage
                            src={pickedTalent.icon}
                            name={pickedTalent.name}
                            className="w-8 h-8 shrink-0"
                            rounded="full"
                          />
                          <span className="text-[10px] font-semibold text-slate-900 dark:text-slate-100 truncate w-full">
                            {pickedTalent.name}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full border border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center text-slate-400">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] text-slate-400">Kosong</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      title={`Ganti Talent ${tierNum}`}
                      onClick={() => setLoadoutPicker({ kind: 'talent', side: 1, tier: tierNum })}
                      className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-white/90 dark:bg-[#131A26]/90 border border-slate-200 dark:border-white/15 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-accent"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Symmetrical 6 Stat Cards (Side 1) */}
          {renderSideStatGrid(1)}
        </section>

        {/* BAGIAN 2: TARGET LAWAN / COUNTER (BEBAS PILIH HERO APA SAJA) */}
        <section className="bg-white dark:bg-[#131A26] border border-rose-400/50 rounded-2xl p-4 sm:p-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-rose-500" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                2. Target Lawan / Counter (Yang Diuji)
              </h2>
            </div>
            {hero2Detail && hero2Detail.recommendedBuildIds.length > 0 && (
              <button
                type="button"
                onClick={() => applyRecommendedBuild(2)}
                className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-700 dark:text-rose-200 text-xs font-semibold shrink-0 transition-colors"
              >
                Isi Rekomendasi
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <button
              type="button"
              onClick={() => setHeroPickerSide(2)}
              className="group relative w-full sm:w-44 aspect-[16/10] rounded-xl bg-slate-900 border-2 border-rose-400/70 overflow-hidden shrink-0"
            >
              {hero2 ? (
                <>
                  <GameImage
                    src={getHeroDisplayImage(hero2, hero2Detail?.painting || hero2Detail?.headBig)}
                    name={hero2.name}
                    fullFrame
                    className="w-full h-full"
                    imgClassName="group-hover:scale-105 transition-transform"
                    rounded="none"
                  />
                  <span className="absolute inset-x-0 bottom-0 z-10 py-1 bg-black/80 text-[10px] font-semibold text-rose-200 text-center">
                    Ganti Target Hero
                  </span>
                </>
              ) : (
                <Plus className="w-6 h-6 text-rose-500 m-auto" />
              )}
            </button>

            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {hero2?.name || 'Pilih Target'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {hero2?.roles.join(' / ') || 'Uji dengan hero apa saja'}
              </p>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Level Lawan</span>
                  <span className="font-mono-num font-bold text-rose-600 dark:text-rose-300">
                    Lv. {level2}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={level2}
                  onChange={(e) => setLevel2(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
              6 Slot Item Lawan (Bebas uji item Attack, Magic, Defense, Roam, Jungle, Sepatu)
            </span>
            <div className="grid grid-cols-6 gap-2">
              {items2.map((slotItem, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setItemPickerTarget({ side: 2, slot: idx })}
                  className="flex flex-col items-center gap-1 group min-w-0"
                >
                  <div
                    className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all ${
                      slotItem
                        ? 'border-rose-400 bg-slate-100 dark:bg-[#0B0F17]'
                        : 'border-dashed border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-[#0B0F17] hover:border-rose-400'
                    }`}
                  >
                    {slotItem ? (
                      <GameImage
                        src={slotItem.icon}
                        name={slotItem.name}
                        className="w-full h-full"
                        rounded="full"
                      />
                    ) : (
                      <Plus className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full text-center">
                    {slotItem ? slotItem.name : `Slot ${idx + 1}`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Emblem Lawan, Spell Lawan & HP <50% */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <div className="space-y-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium block">
                Emblem Lawan
              </span>
              <button
                type="button"
                onClick={() => setLoadoutPicker({ kind: 'emblem', side: 2 })}
                className="w-full min-h-[44px] px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] hover:border-rose-400 border border-slate-200 dark:border-white/10 flex items-center gap-2 text-left transition-colors"
              >
                {emblem2?.icon ? (
                  <GameImage
                    src={emblem2.icon}
                    name={emblem2.name}
                    className="w-7 h-7 shrink-0"
                    rounded="lg"
                  />
                ) : (
                  <Plus className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate flex-1">
                  {emblem2?.name || 'Pilih'}
                </span>
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium block">
                Spell Lawan
              </span>
              <button
                type="button"
                onClick={() => setLoadoutPicker({ kind: 'spell', side: 2 })}
                className="w-full min-h-[44px] px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] hover:border-rose-400 border border-slate-200 dark:border-white/10 flex items-center gap-2 text-left transition-colors"
              >
                {spell2?.icon ? (
                  <GameImage
                    src={spell2.icon}
                    name={spell2.name}
                    className="w-7 h-7 shrink-0"
                    rounded="full"
                  />
                ) : (
                  <Plus className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate flex-1">
                  {spell2?.name || 'Pilih'}
                </span>
              </button>
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setEnemyLowHp((v) => !v)}
                className={`min-h-[44px] px-3 rounded-xl text-xs font-medium border transition-colors ${
                  enemyLowHp
                    ? 'bg-rose-500/20 border-rose-400 text-rose-700 dark:text-rose-200'
                    : 'bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                }`}
              >
                HP Lawan &lt;50%: {enemyLowHp ? 'Ya' : 'Tidak'}
              </button>
            </div>
          </div>

          {/* Talent 1, 2, 3 Lawan (Ketuk untuk Shortcut Penjelasan + Ganti Talent) */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
              Talent 1, 2 &amp; 3 Lawan (Ketuk ikon untuk Penjelasan, atau tombol Ganti)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {([0, 1, 2] as const).map((tierIdx) => {
                const tierNum = (tierIdx + 1) as 1 | 2 | 3;
                const pickedTalent =
                  emblemTalents.find((t) => t.id === talent2Ids[tierIdx]) || null;
                return (
                  <div
                    key={tierNum}
                    className="relative rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 hover:border-rose-400 transition-colors overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setShortcutPopup({
                          kind: 'talent',
                          side: 2,
                          tier: tierNum,
                          heroName: hero2?.name || 'Target Lawan',
                          talent: pickedTalent,
                        })
                      }
                      className="w-full min-h-[74px] p-2 flex flex-col items-center justify-center gap-1 text-center"
                    >
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        Talent {tierNum}
                      </span>
                      {pickedTalent ? (
                        <>
                          <GameImage
                            src={pickedTalent.icon}
                            name={pickedTalent.name}
                            className="w-8 h-8 shrink-0"
                            rounded="full"
                          />
                          <span className="text-[10px] font-semibold text-slate-900 dark:text-slate-100 truncate w-full">
                            {pickedTalent.name}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full border border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center text-slate-400">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] text-slate-400">Kosong</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      title={`Ganti Talent ${tierNum} Lawan`}
                      onClick={() => setLoadoutPicker({ kind: 'talent', side: 2, tier: tierNum })}
                      className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-white/90 dark:bg-[#131A26]/90 border border-slate-200 dark:border-white/15 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-rose-500"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Symmetrical 6 Stat Cards (Side 2) */}
          {renderSideStatGrid(2)}
        </section>
      </div>

      {/* Symmetrical Skills Section: Side 1 Skills (Vertical List) + Side 2 Skills (Click any skill -> Shortcut Penjelasan!) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Side 1: Hero 1 Skills + CDR */}
        <section className="bg-white dark:bg-[#131A26] border border-amber-400/40 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-accent shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Skill {hero1?.name || 'Hero Anda'} &amp; Cek CDR ({duel.effectiveCdr}% / {duel.cdrCap}%)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ketuk skill untuk hitung damage duel &amp; buka shortcut penjelasan skill.
                </p>
              </div>
            </div>
            {spell1 && (
              <span className="text-xs font-mono-num font-semibold text-sky-600 dark:text-sky-300 shrink-0">
                Spell {spell1.name}: {duel.spellCdBase}s → {duel.spellCdReduced}s
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedSkillIdx(-1)}
              className={`w-full min-h-[68px] p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${
                selectedSkillIdx === -1
                  ? 'btn-accent shadow-md'
                  : 'bg-slate-50 dark:bg-[#0B0F17] hover:bg-slate-100 dark:hover:bg-[#1A2333] border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-black/15 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <Swords className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold opacity-75 block">Serangan Dasar</span>
                  <span className="text-sm font-bold block">Basic Attack</span>
                </div>
              </div>
              <div className="text-right shrink-0 font-mono-num">
                <span className="text-sm font-bold block">
                  {duel.basicSummary.finalDamage.toLocaleString('id-ID')} Dmg
                </span>
                <span className="text-[11px] opacity-80 block">Tanpa Cooldown</span>
              </div>
            </button>

            {hero1Detail?.skills.map((sk, idx) => {
              const sum = duel.allSkillsSummary[idx];
              const roleLabel =
                idx === 0
                  ? 'Pasif'
                  : idx === hero1Detail.skills.length - 1 && hero1Detail.skills.length >= 4
                  ? 'Ultimate'
                  : `Skill ${idx}`;
              return (
                <button
                  key={sk.skillid || idx}
                  type="button"
                  onClick={() => {
                    setSelectedSkillIdx(idx);
                    if (sum) {
                      setShortcutPopup({
                        kind: 'skill',
                        side: 1,
                        heroName: hero1?.name || 'Hero Anda',
                        slotLabel: roleLabel,
                        skill: sk,
                        effectiveCdr: duel.effectiveCdr,
                        estDamage: sum.finalDamage,
                        formulaLabel: sum.formula.formulaLabel,
                        damageType: sum.formula.damageType,
                        baseCd: sum.baseCd,
                        reducedCd: sum.reducedCd,
                      });
                    }
                  }}
                  className={`w-full min-h-[68px] p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${
                    selectedSkillIdx === idx
                      ? 'btn-accent shadow-md'
                      : 'bg-slate-50 dark:bg-[#0B0F17] hover:bg-slate-100 dark:hover:bg-[#1A2333] border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <GameImage
                      src={sk.skillicon}
                      name={sk.skillname}
                      className="w-11 h-11 shrink-0 border border-white/20"
                      rounded="xl"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-semibold opacity-75 block">
                        {roleLabel} · Ketuk untuk Penjelasan
                      </span>
                      <span className="text-sm font-bold block truncate">{sk.skillname}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono-num">
                    <span className="text-sm font-bold block">
                      {sum ? `${sum.finalDamage.toLocaleString('id-ID')} Dmg` : '-'}
                    </span>
                    <span className="text-[11px] opacity-85 block">
                      {sum && sum.baseCd > 0 ? `CD ${sum.baseCd}s → ${sum.reducedCd}s` : 'Pasif / Tanpa CD'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Side 2: Hero 2 (Target Lawan) Skills + CDR (Click any skill -> Shortcut Penjelasan!) */}
        <section className="bg-white dark:bg-[#131A26] border border-rose-400/40 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Skill {hero2?.name || 'Target Lawan'} (CDR: {duel.s2.effectiveCdr}% / {duel.s2.cdrCap}%)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ketuk skill hero lawan di bawah untuk memunculkan shortcut penjelasan lengkapnya.
                </p>
              </div>
            </div>
            {spell2 && (
              <span className="text-xs font-mono-num font-semibold text-rose-600 dark:text-rose-300 shrink-0">
                Spell {spell2.name}: {spell2.cd}s
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {!hero2Detail ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
                Memuat daftar skill {hero2?.name || 'Target'}...
              </p>
            ) : (
              hero2Detail.skills.map((sk, idx) => {
                const sum = duel.side2SkillsSummary[idx];
                const roleLabel =
                  idx === 0
                    ? 'Pasif'
                    : idx === hero2Detail.skills.length - 1 && hero2Detail.skills.length >= 4
                    ? 'Ultimate'
                    : `Skill ${idx}`;
                return (
                  <button
                    key={sk.skillid || idx}
                    type="button"
                    onClick={() => {
                      if (sum) {
                        setShortcutPopup({
                          kind: 'skill',
                          side: 2,
                          heroName: hero2?.name || 'Target Lawan',
                          slotLabel: roleLabel,
                          skill: sk,
                          effectiveCdr: duel.s2.effectiveCdr,
                          estDamage: sum.finalDamage,
                          formulaLabel: sum.formula.formulaLabel,
                          damageType: sum.formula.damageType,
                          baseCd: sum.baseCd,
                          reducedCd: sum.reducedCd,
                        });
                      }
                    }}
                    className="w-full min-h-[68px] p-3 rounded-2xl border bg-slate-50 dark:bg-[#0B0F17] hover:bg-slate-100 dark:hover:bg-[#1A2333] border-slate-200 dark:border-white/10 hover:border-rose-400 text-left flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <GameImage
                        src={sk.skillicon}
                        name={sk.skillname}
                        className="w-11 h-11 shrink-0 border border-rose-500/20"
                        rounded="xl"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-300 block">
                          {roleLabel} · Ketuk untuk Penjelasan
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block truncate">
                          {sk.skillname}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono-num">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                        {sum ? `~${sum.finalDamage.toLocaleString('id-ID')} Dmg` : '-'}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        {sum && sum.baseCd > 0 ? `CD ${sum.baseCd}s → ${sum.reducedCd}s` : 'Pasif / Tanpa CD'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Penjelasan Pengurangan Cooldown (CDR) */}
      <section className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 space-y-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Penjelasan Pengurangan Cooldown (Cooldown Reduction / CDR)
          </span>
          <span className="font-mono-num font-bold text-sky-600 dark:text-sky-300">
            {duel.effectiveCdr}% Aktif (Maks {duel.cdrCap}%)
          </span>
        </div>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong>Sumber CDR Hero Anda:</strong> Item (<strong>{duel.itemCdr}%</strong>) + Set Emblem (<strong>{duel.emblemCdr}%</strong>) + Talent (<strong>{duel.talentCdr}%</strong>) = <strong>{duel.rawCdr}%</strong>.
          {duel.rawCdr > duel.cdrCap
            ? ` Karena melebihi batas maksimal ${duel.cdrCap}%, nilai yang dihitung adalah ${duel.cdrCap}%.`
            : ` Batas maksimal normal CDR di Mobile Legends adalah 40%${duel.hasEnchantedTalisman ? ' (naik menjadi 45% karena Anda memakai Enchanted Talisman)' : ' (dapat naik menjadi 45% dengan Enchanted Talisman)'}.`}
        </p>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong>Cara Kerja ke Skill &amp; Spell:</strong>{' '}
          <span className="font-mono-num font-semibold">CD Akhir = CD Dasar × (1 - {duel.effectiveCdr}%)</span>.
          {duel.currentAttack.baseCd > 0
            ? ` Skill "${duel.currentAttack.name}" turun dari ${duel.currentAttack.baseCd}s menjadi ${duel.currentAttack.reducedCd}s.`
            : ' Pilih skill aktif untuk melihat pemotongan detik cooldown-nya.'}
          {spell1 &&
            ` Battle Spell ${spell1.name}: ${duel.spellCdBase}s → ${duel.spellCdReduced}s.`}
        </p>
      </section>

      {/* Final Hasil Uji Tembus Pertahanan & Penjumlahan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Hasil Uji Serangan ke {hero2?.name || 'Target'} (Apakah Tembus?)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-xl p-3.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Damage Masuk ({duel.currentAttack.name})
              </span>
              <span className="font-mono-num text-2xl font-bold text-amber-600 dark:text-amber-300">
                {duel.currentAttack.finalDamage.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-xl p-3.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                1x Kombo Penuh ke Target
              </span>
              <span className="font-mono-num text-2xl font-bold text-sky-600 dark:text-sky-300">
                {duel.totalComboDamage.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-xl p-3.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Sisa HP Target Setelah Kombo
              </span>
              <span
                className={`font-mono-num text-2xl font-bold ${
                  duel.canBurstTarget
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : 'text-rose-600 dark:text-rose-300'
                }`}
              >
                {duel.hpAfterCombo.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Simulasi Bar HP {hero2?.name} ({duel.hpAfterCombo.toLocaleString('id-ID')} / {duel.targetMaxHp.toLocaleString('id-ID')})
              </span>
              <span className="font-mono-num font-bold text-amber-600 dark:text-amber-300">
                {duel.canBurstTarget ? 'TERELIMINASI (TEMBUS)' : 'MASIH BERTAHAN'}
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{
                  width: `${Math.round((duel.hpAfterCombo / Math.max(1, duel.targetMaxHp)) * 100)}%`,
                }}
              />
            </div>
            {duel.spellNote && (
              <p className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                <strong>Battle Spell:</strong> {duel.spellNote}
              </p>
            )}
          </div>

          {duel.recommendations.length > 0 ? (
            <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Saran Item agar Menembus Pertahanan Target:</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-200 list-disc pl-4">
                {duel.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Build Anda sudah siap menembus komposisi pertahanan target ini!</span>
            </div>
          )}
        </section>

        <section className="lg:col-span-5 bg-white dark:bg-[#131A26] border border-amber-400/40 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-500" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Penjumlahan Damage (Hero + Item + Emblem)
            </h3>
          </div>

          <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Damage Dasar Hero</span>
              <span className="font-mono-num font-semibold text-sky-600 dark:text-sky-300">
                {duel.currentAttack.finalHeroOnly.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Tambahan Item + Emblem + Pasif</span>
              <span className="font-mono-num font-semibold text-emerald-600 dark:text-emerald-300">
                + {duel.currentAttack.finalBonusFromItemEmblem.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-white/10 font-bold text-base">
              <span className="text-slate-900 dark:text-slate-100">Total Damage Masuk</span>
              <span className="font-mono-num text-amber-600 dark:text-amber-300">
                = {duel.currentAttack.finalDamage.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Total Physical Attack</span>
              <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                {duel.totalPhysAttack}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Total Magic Power</span>
              <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                {duel.totalMagicPower}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Defense Efektif Target</span>
              <span className="font-mono-num font-semibold text-rose-600 dark:text-rose-300">
                {duel.currentAttack.effDef} ({(duel.currentAttack.defMult * 100).toFixed(1)}% tembus)
              </span>
            </div>
            {duel.currentAttack.passiveNotes.length > 0 && (
              <p className="text-emerald-600 dark:text-emerald-300 pt-1">
                <strong>Pasif Aktif:</strong> {duel.currentAttack.passiveNotes.join(' · ')}
              </p>
            )}
            {duel.currentAttack.targetMitigationNotes.length > 0 && (
              <p className="text-rose-600 dark:text-rose-300 pt-1">
                <strong>Redaman Lawan:</strong>{' '}
                {duel.currentAttack.targetMitigationNotes.join(' · ')}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Penjelasan Lengkap HP, Physical Attack, Damage Physical/Magic, Defense Physical/Magic */}
      <section className="bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            Penjelasan Lengkap HP, Physical Attack, Damage &amp; Defense Kedua Hero
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Perbandingan langsung antara {hero1?.name || 'Hero Anda'} (Slot 1) dan {hero2?.name || 'Target'} (Slot 2).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-emerald-600 dark:text-emerald-300">
                1. HP Maksimal
              </span>
              <span className="font-mono-num font-bold text-slate-900 dark:text-slate-100">
                {duel.s1.maxHp.toLocaleString('id-ID')} vs {duel.s2.maxHp.toLocaleString('id-ID')}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Total nyawa maksimal gabungan Level Hero + Item + Emblem + Talent Vitality. Item penambah HP tinggi efektif menghadapi True Damage dan burst.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-amber-600 dark:text-amber-300">
                2. Physical Attack
              </span>
              <span className="font-mono-num font-bold text-slate-900 dark:text-slate-100">
                {duel.s1.totalPhysAttack} vs {duel.s2.totalPhysAttack}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Stat dasar serangan fisik (Hero {duel.hero1BasePhys} + Emblem {duel.emblemPhys} + Item {duel.itemPhysWithAdaptive}) yang meningkatkan Basic Attack &amp; Skill bertipe Physical.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-orange-600 dark:text-orange-300">
                3. Damage Physical
              </span>
              <span className="font-mono-num font-bold text-slate-900 dark:text-slate-100">
                {duel.side1PhysBasicVsSide2} vs {duel.side2PhysBasicVsSide1}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Damage fisik bersih yang benar-benar tembus setelah dikurangi Physical Defense efektif lawan (Penetrasi: {duel.totalPhysPenFlat} + {duel.totalPhysPenPct}%).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-violet-600 dark:text-violet-300">
                4. Damage Magic (Magic Power)
              </span>
              <span className="font-mono-num font-bold text-slate-900 dark:text-slate-100">
                {duel.s1.totalMagicPower} vs {duel.s2.totalMagicPower}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Magic Power ({duel.hero1BaseMagic} + {duel.emblemMagic} + {duel.totalItemMagic}) menghasilkan Damage Magic (estimasi ~{duel.side1MagicEstVsSide2}) yang dipengaruhi Magic Penetration ({duel.totalMagicPenFlat} + {duel.totalMagicPenPct}%).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-rose-600 dark:text-rose-300">
                5. Physical Defense
              </span>
              <span className="font-mono-num font-bold text-slate-900 dark:text-slate-100">
                {duel.s1.physDef} vs {duel.s2.physDef}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Meredam serangan Physical sekitar <strong>{duel.physMitigationPct}%</strong> (Def Efektif target: {duel.effTargetPhysDef}). Lawan juga bisa memakai Antique Cuirass untuk mengurangi Physical Attack penyerang.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-sky-600 dark:text-sky-300">
                6. Magic Defense
              </span>
              <span className="font-mono-num font-bold text-slate-900 dark:text-slate-100">
                {duel.s1.magicDef} vs {duel.s2.magicDef}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Meredam serangan Magic sekitar <strong>{duel.magicMitigationPct}%</strong> (Def Efektif target: {duel.effTargetMagicDef}), diperkuat pasif Athena&apos;s Shield / Radiant Armor. True Damage menembus kedua defense.
            </p>
          </div>
        </div>
      </section>

      {/* Shortcut Penjelasan Modal (Klik Skill / Talent / Atribut dari Kedua Hero) */}
      {shortcutPopup && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setShortcutPopup(null)}
        >
          <div
            className="w-full sm:max-w-lg max-h-[85vh] bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent block">
                  Shortcut Penjelasan · {shortcutPopup.heroName}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                  {shortcutPopup.kind === 'skill'
                    ? `${shortcutPopup.slotLabel}: ${shortcutPopup.skill.skillname}`
                    : shortcutPopup.kind === 'talent'
                    ? `Talent ${shortcutPopup.tier}: ${shortcutPopup.talent?.name || 'Belum Dipilih'}`
                    : shortcutPopup.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShortcutPopup(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {shortcutPopup.kind === 'skill' && (
                <>
                  <div className="flex items-center gap-3.5">
                    <GameImage
                      src={shortcutPopup.skill.skillicon}
                      name={shortcutPopup.skill.skillname}
                      className="w-14 h-14 shrink-0"
                      rounded="xl"
                    />
                    <div className="space-y-1 min-w-0">
                      <p className="font-mono-num text-xs font-semibold text-accent">
                        Tipe: {shortcutPopup.damageType} · Rumus: {shortcutPopup.formulaLabel}
                      </p>
                      <p className="font-mono-num text-xs text-slate-600 dark:text-slate-300">
                        {shortcutPopup.baseCd > 0
                          ? `Cooldown: ${shortcutPopup.baseCd}s → ${shortcutPopup.reducedCd}s (CDR ${shortcutPopup.effectiveCdr}%)`
                          : 'Pasif / Tanpa Cooldown'}
                        {typeof shortcutPopup.estDamage === 'number'
                          ? ` · Estimasi: ${shortcutPopup.estDamage.toLocaleString('id-ID')} Dmg`
                          : ''}
                      </p>
                      {shortcutPopup.skill.cdAndCost && (
                        <p className="text-[11px] font-mono-num text-slate-500">
                          {shortcutPopup.skill.cdAndCost}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 leading-relaxed text-slate-700 dark:text-slate-200">
                    <MlbbRichText text={shortcutPopup.skill.skilldesc} />
                  </div>
                </>
              )}

              {shortcutPopup.kind === 'talent' && (
                <>
                  {shortcutPopup.talent ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3.5">
                        <GameImage
                          src={shortcutPopup.talent.icon}
                          name={shortcutPopup.talent.name}
                          className="w-14 h-14 shrink-0"
                          rounded="full"
                        />
                        <div>
                          <span className="text-xs font-bold text-accent block">
                            Talent Tier {shortcutPopup.tier}
                          </span>
                          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {shortcutPopup.talent.name}
                          </p>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 leading-relaxed">
                        {shortcutPopup.talent.desc}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400">
                      Slot Talent {shortcutPopup.tier} masih kosong. Pilih salah satu talent emblem untuk menambahkan bonus statistik atau pasif unik.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const target = {
                        kind: 'talent' as const,
                        side: shortcutPopup.side,
                        tier: shortcutPopup.tier,
                      };
                      setShortcutPopup(null);
                      setLoadoutPicker(target);
                    }}
                    className="btn-accent w-full min-h-[44px] rounded-xl font-bold text-xs"
                  >
                    Pilih / Ganti Talent {shortcutPopup.tier}
                  </button>
                </>
              )}

              {shortcutPopup.kind === 'stat' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 space-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      Nilai Total Saat Ini
                    </span>
                    <span className="font-mono-num text-2xl font-bold text-accent">
                      {shortcutPopup.valueLabel}
                    </span>
                    <p className="text-xs font-mono-num text-slate-600 dark:text-slate-300 pt-1">
                      {shortcutPopup.breakdown}
                    </p>
                  </div>
                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                    {shortcutPopup.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Picker Modal */}
      <HeroPickerModal
        open={heroPickerSide !== null}
        title={
          heroPickerSide === 1
            ? 'Pilih Hero Anda (Slot 1)'
            : 'Pilih Target Lawan / Counter (Slot 2)'
        }
        heroes={heroes}
        selectedHeroId={heroPickerSide === 1 ? hero1?.id : hero2?.id}
        onSelect={(h) => {
          if (heroPickerSide === 1) setHero1(h);
          else if (heroPickerSide === 2) setHero2(h);
        }}
        onClose={() => setHeroPickerSide(null)}
      />

      {/* Item Picker Modal */}
      <ItemPickerModal
        open={itemPickerTarget !== null}
        slotIndex={itemPickerTarget ? itemPickerTarget.slot : null}
        items={equipment}
        currentItem={
          itemPickerTarget
            ? itemPickerTarget.side === 1
              ? items1[itemPickerTarget.slot]
              : items2[itemPickerTarget.slot]
            : null
        }
        onSelect={(item) => {
          if (!itemPickerTarget) return;
          if (itemPickerTarget.side === 1) {
            setItems1((prev) => {
              const next = [...prev];
              next[itemPickerTarget.slot] = item;
              return next;
            });
          } else {
            setItems2((prev) => {
              const next = [...prev];
              next[itemPickerTarget.slot] = item;
              return next;
            });
          }
        }}
        onClose={() => setItemPickerTarget(null)}
      />

      {/* Visual MLBB Icon Picker Modal (Emblem Set, Battle Spell, Talent 1/2/3 for BOTH Sides) */}
      {loadoutPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setLoadoutPicker(null)}
        >
          <div
            className="w-full sm:max-w-2xl max-h-[85vh] bg-white dark:bg-[#131A26] border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {loadoutPicker.kind === 'emblem'
                    ? `Pilih Set Emblem (${loadoutPicker.side === 1 ? 'Hero Anda' : 'Target Lawan'})`
                    : loadoutPicker.kind === 'spell'
                    ? `Pilih Battle Spell (${loadoutPicker.side === 1 ? 'Hero Anda' : 'Target Lawan'})`
                    : `Pilih Talent Tier ${loadoutPicker.tier} (${loadoutPicker.side === 1 ? 'Hero Anda' : 'Target Lawan'})`}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pilih dengan ikon resmi Mobile Legends agar langsung dikenali.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLoadoutPicker(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {loadoutPicker.kind === 'emblem' &&
                emblemSets.map((em) => {
                  const active =
                    loadoutPicker.side === 1 ? emblem1Id === em.id : emblem2Id === em.id;
                  return (
                    <button
                      key={em.id}
                      type="button"
                      onClick={() => {
                        if (loadoutPicker.side === 1) setEmblem1Id(em.id);
                        else setEmblem2Id(em.id);
                        setLoadoutPicker(null);
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                        active
                          ? 'btn-accent'
                          : 'bg-slate-50 dark:bg-[#0B0F17] hover:bg-slate-100 dark:hover:bg-[#1A2333] border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <GameImage
                        src={em.icon}
                        name={em.name}
                        className="w-11 h-11 shrink-0"
                        rounded="lg"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{em.name}</p>
                        <p className="text-[11px] opacity-80 line-clamp-2">{em.rawAttr}</p>
                      </div>
                    </button>
                  );
                })}

              {loadoutPicker.kind === 'spell' &&
                spells.map((sp) => {
                  const active =
                    loadoutPicker.side === 1 ? spell1Id === sp.id : spell2Id === sp.id;
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => {
                        if (loadoutPicker.side === 1) setSpell1Id(sp.id);
                        else setSpell2Id(sp.id);
                        setLoadoutPicker(null);
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                        active
                          ? 'btn-accent'
                          : 'bg-slate-50 dark:bg-[#0B0F17] hover:bg-slate-100 dark:hover:bg-[#1A2333] border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <GameImage
                        src={sp.icon}
                        name={sp.name}
                        className="w-11 h-11 shrink-0"
                        rounded="full"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold truncate">{sp.name}</p>
                          <span className="text-[11px] font-mono-num shrink-0 opacity-80">
                            CD {sp.cd}s
                          </span>
                        </div>
                        <p className="text-[11px] opacity-80 line-clamp-2">{sp.desc}</p>
                      </div>
                    </button>
                  );
                })}

              {loadoutPicker.kind === 'talent' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = loadoutPicker.tier - 1;
                      const setter = loadoutPicker.side === 1 ? setTalent1Ids : setTalent2Ids;
                      setter((prev) => {
                        const next: [number | null, number | null, number | null] = [...prev];
                        next[idx] = null;
                        return next;
                      });
                      setLoadoutPicker(null);
                    }}
                    className="sm:col-span-2 p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-white/20 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    Kosongkan Slot Talent {loadoutPicker.tier}
                  </button>
                  {talentsByTier[loadoutPicker.tier].map((t) => {
                    const currentArr = loadoutPicker.side === 1 ? talent1Ids : talent2Ids;
                    const active = currentArr[loadoutPicker.tier - 1] === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          const idx = loadoutPicker.tier - 1;
                          const setter = loadoutPicker.side === 1 ? setTalent1Ids : setTalent2Ids;
                          setter((prev) => {
                            const next: [number | null, number | null, number | null] = [...prev];
                            next[idx] = t.id;
                            return next;
                          });
                          setLoadoutPicker(null);
                        }}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                          active
                            ? 'btn-accent'
                            : 'bg-slate-50 dark:bg-[#0B0F17] hover:bg-slate-100 dark:hover:bg-[#1A2333] border-slate-200 dark:border-white/10'
                        }`}
                      >
                        <GameImage
                          src={t.icon}
                          name={t.name}
                          className="w-11 h-11 shrink-0"
                          rounded="full"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{t.name}</p>
                          <p className="text-[11px] opacity-80 line-clamp-2">{t.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
