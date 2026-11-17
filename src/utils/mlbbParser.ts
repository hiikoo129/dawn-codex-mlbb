import type { EquipmentItem, HeroRole, HeroSkill, ParsedItemStats } from '../types/mlbb';

export interface TextSegment {
  text: string;
  color?: string;
}

const COLOR_MAP: Record<string, string> = {
  a6aafb: '#93C5FD',
  fba51f: '#FBBF24',
  fb1f1f: '#F87171',
  '404495': '#818CF8',
  '62a2fb': '#60A5FA',
  '7e40ff': '#C084FC',
  '1ffbfb': '#2DD4BF',
  '26e407': '#4ADE80',
  '66ff66': '#4ADE80',
  '62f8fe': '#22D3EE',
  '7f62fe': '#A78BFA',
  ffe63c: '#FDE047',
  ffdfa2: '#FDE68A',
  '8098ab': '#94A3B8',
  ff0000: '#F87171',
  ffffff: '#F8FAFC',
};

export function parseMlbbMarkup(raw: string): TextSegment[] {
  if (!raw) return [];
  const cleaned = raw.replace(/\r\n/g, '\n');
  const regex = /<font\s+color=["']?#?([0-9a-fA-F]{6})["']?\s*>([\s\S]*?)<\/font>/gi;
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      const plain = cleaned.slice(lastIndex, match.index).replace(/<[^>]+>/g, '');
      if (plain) segments.push({ text: plain });
    }
    const hex = match[1].toLowerCase();
    const inner = match[2].replace(/<[^>]+>/g, '');
    if (inner) {
      segments.push({
        text: inner,
        color: COLOR_MAP[hex] || `#${hex}`,
      });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < cleaned.length) {
    const tail = cleaned.slice(lastIndex).replace(/<[^>]+>/g, '');
    if (tail) segments.push({ text: tail });
  }

  return segments;
}

export function stripMlbbMarkup(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function normalizeRole(raw: string): HeroRole | null {
  const lower = raw.trim().toLowerCase();
  if (lower === 'tank') return 'Tank';
  if (lower === 'fighter') return 'Fighter';
  if (lower === 'assassin') return 'Assassin';
  if (lower === 'mage') return 'Mage';
  if (lower === 'marksman') return 'Marksman';
  if (lower === 'support') return 'Support';
  return null;
}

export function createEmptyItemStats(): ParsedItemStats {
  return {
    physicalAttack: 0,
    magicPower: 0,
    attackSpeed: 0,
    critChance: 0,
    critDamage: 0,
    physicalPen: 0,
    physicalPenPct: 0,
    magicPen: 0,
    magicPenPct: 0,
    adaptiveAttack: 0,
    maxHp: 0,
    physicalDefense: 0,
    magicDefense: 0,
    cooldownReduction: 0,
    movementSpeed: 0,
    movementSpeedPct: 0,
    lifesteal: 0,
    spellVamp: 0,
    hybridLifesteal: 0,
    mana: 0,
    hpRegen: 0,
    manaRegen: 0,
  };
}

export function parseEquipmentTips(tipsHtml: string): {
  rawTips: string[];
  stats: ParsedItemStats;
} {
  const stats = createEmptyItemStats();
  const rawTips = tipsHtml
    .split(/<br\s*\/?>|\n/i)
    .map((line) => line.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);

  for (const line of rawTips) {
    const numMatch = line.match(/[+-]?\s*(\d+(?:\.\d+)?)\s*(%?)/);
    if (!numMatch) continue;
    const val = parseFloat(numMatch[1]);
    const isPct = numMatch[2] === '%';
    const lower = line.toLowerCase();

    if (lower.includes('adaptive penetration')) {
      stats.physicalPen += val;
      stats.magicPen += val;
    } else if (lower.includes('adaptive attack')) {
      stats.adaptiveAttack += val;
    } else if (lower.includes('physical attack')) {
      stats.physicalAttack += val;
    } else if (lower.includes('magic power')) {
      stats.magicPower += val;
    } else if (lower.includes('attack speed')) {
      stats.attackSpeed += val;
    } else if (lower.includes('critical chance')) {
      stats.critChance += val;
    } else if (lower.includes('critical damage') && !lower.includes('reduction')) {
      stats.critDamage += val;
    } else if (lower.includes('physical penetration')) {
      if (isPct) stats.physicalPenPct += val;
      else stats.physicalPen += val;
    } else if (lower.includes('magic penetration')) {
      if (isPct) stats.magicPenPct += val;
      else stats.magicPen += val;
    } else if (lower.includes('max hp')) {
      stats.maxHp += val;
    } else if (lower.includes('physical defense')) {
      stats.physicalDefense += val;
    } else if (lower.includes('magic defense')) {
      stats.magicDefense += val;
    } else if (lower.includes('physical & magic defense')) {
      stats.physicalDefense += val;
      stats.magicDefense += val;
    } else if (lower.includes('cooldown')) {
      stats.cooldownReduction += val;
    } else if (lower.includes('movement speed')) {
      if (isPct) stats.movementSpeedPct += val;
      else stats.movementSpeed += val;
    } else if (lower.includes('hybrid lifesteal')) {
      stats.hybridLifesteal += val;
    } else if (lower.includes('lifesteal')) {
      stats.lifesteal += val;
    } else if (lower.includes('spell vamp')) {
      stats.spellVamp += val;
    } else if (lower.includes('hp regen')) {
      stats.hpRegen += val;
    } else if (lower.includes('mana regen')) {
      stats.manaRegen += val;
    } else if (lower.includes('mana')) {
      stats.mana += val;
    }
  }

  return { rawTips, stats };
}

export interface ParsedSkillFormula {
  damageType: 'Physical' | 'Magic' | 'True' | 'Utility';
  baseDamage: number;
  totalPhysRatio: number;
  extraPhysRatio: number;
  totalMagicRatio: number;
  hpTargetRatio: number;
  cooldownSeconds: number;
  formulaLabel: string;
}

export function parseSkillCooldown(cdAndCost: string): number {
  if (!cdAndCost) return 0;
  const m = cdAndCost.match(/CD\s*:\s*(\d+(?:\.\d+)?)/i);
  if (m) return parseFloat(m[1]) || 0;
  return 0;
}

export function parseSkillDamageFormula(skill: HeroSkill): ParsedSkillFormula {
  const plain = stripMlbbMarkup(skill.skilldesc);
  const lower = plain.toLowerCase();
  const cooldownSeconds = parseSkillCooldown(skill.cdAndCost);

  let damageType: ParsedSkillFormula['damageType'] = 'Utility';
  if (lower.includes('true damage')) damageType = 'True';
  else if (lower.includes('magic damage')) damageType = 'Magic';
  else if (lower.includes('physical damage')) damageType = 'Physical';

  const scalingMatch = plain.match(
    /(\d+(?:\.\d+)?)\s*\(\s*\+(\d+(?:\.\d+)?)%\s*([^)]+)\)/i
  );

  let baseDamage = 0;
  let totalPhysRatio = 0;
  let extraPhysRatio = 0;
  let totalMagicRatio = 0;
  let hpTargetRatio = 0;

  if (scalingMatch) {
    baseDamage = parseFloat(scalingMatch[1]) || 0;
    const pct = (parseFloat(scalingMatch[2]) || 0) / 100;
    const statLabel = scalingMatch[3].toLowerCase();

    if (statLabel.includes('ekstra physical') || statLabel.includes('extra physical')) {
      extraPhysRatio = pct;
      if (damageType === 'Utility') damageType = 'Physical';
    } else if (statLabel.includes('physical attack')) {
      totalPhysRatio = pct;
      if (damageType === 'Utility') damageType = 'Physical';
    } else if (statLabel.includes('magic power')) {
      totalMagicRatio = pct;
      if (damageType === 'Utility') damageType = 'Magic';
    } else if (statLabel.includes('hp')) {
      hpTargetRatio = pct;
    }
  } else {
    const baseOnly = plain.match(
      /(?:memberikan|deals?)\s+(\d+(?:\.\d+)?)\s+(?:physical|magic|true)\s+damage/i
    );
    if (baseOnly) {
      baseDamage = parseFloat(baseOnly[1]) || 0;
    }
  }

  const allScalings = [
    ...plain.matchAll(
      /\+(\d+(?:\.\d+)?)%\s*(Total Physical Attack|Ekstra Physical Attack|Extra Physical Attack|Total Magic Power)/gi
    ),
  ];
  if (allScalings.length > 0 && !scalingMatch) {
    for (const m of allScalings) {
      const pct = (parseFloat(m[1]) || 0) / 100;
      const lbl = m[2].toLowerCase();
      if (lbl.includes('ekstra') || lbl.includes('extra')) extraPhysRatio += pct;
      else if (lbl.includes('physical')) totalPhysRatio += pct;
      else if (lbl.includes('magic')) totalMagicRatio += pct;
    }
  }

  const parts: string[] = [];
  if (baseDamage > 0) parts.push(`${baseDamage}`);
  if (totalPhysRatio > 0) parts.push(`+${Math.round(totalPhysRatio * 100)}% Total Phys`);
  if (extraPhysRatio > 0) parts.push(`+${Math.round(extraPhysRatio * 100)}% Ekstra Phys`);
  if (totalMagicRatio > 0) parts.push(`+${Math.round(totalMagicRatio * 100)}% Total Magic`);
  if (hpTargetRatio > 0) parts.push(`+${Math.round(hpTargetRatio * 100)}% HP`);

  return {
    damageType,
    baseDamage,
    totalPhysRatio,
    extraPhysRatio,
    totalMagicRatio,
    hpTargetRatio,
    cooldownSeconds,
    formulaLabel: parts.length > 0 ? parts.join(' ') : 'Efek Utilitas / Pasif',
  };
}

export interface HeroBaseProfile {
  basePhysicalAttackLv1: number;
  physicalAttackPerLevel: number;
  baseMagicPowerLv1: number;
  baseAttackSpeed: number;
  attackSpeedPerLevel: number;
  baseHpLv1: number;
  hpPerLevel: number;
  basePhysDefLv1: number;
  physDefPerLevel: number;
  baseMagicDefLv1: number;
  magicDefPerLevel: number;
  primaryDamageType: 'Physical' | 'Magic';
}

export function getHeroBaseProfile(roles: HeroRole[]): HeroBaseProfile {
  const primary = roles[0] || 'Fighter';
  switch (primary) {
    case 'Marksman':
      return {
        basePhysicalAttackLv1: 118,
        physicalAttackPerLevel: 9.5,
        baseMagicPowerLv1: 0,
        baseAttackSpeed: 0.85,
        attackSpeedPerLevel: 0.032,
        baseHpLv1: 2450,
        hpPerLevel: 155,
        basePhysDefLv1: 17,
        physDefPerLevel: 3.1,
        baseMagicDefLv1: 15,
        magicDefPerLevel: 1.6,
        primaryDamageType: 'Physical',
      };
    case 'Assassin':
      return {
        basePhysicalAttackLv1: 124,
        physicalAttackPerLevel: 10.2,
        baseMagicPowerLv1: 0,
        baseAttackSpeed: 0.88,
        attackSpeedPerLevel: 0.028,
        baseHpLv1: 2560,
        hpPerLevel: 168,
        basePhysDefLv1: 19,
        physDefPerLevel: 3.4,
        baseMagicDefLv1: 15,
        magicDefPerLevel: 1.8,
        primaryDamageType: 'Physical',
      };
    case 'Fighter':
      return {
        basePhysicalAttackLv1: 121,
        physicalAttackPerLevel: 9.2,
        baseMagicPowerLv1: 0,
        baseAttackSpeed: 0.82,
        attackSpeedPerLevel: 0.022,
        baseHpLv1: 2740,
        hpPerLevel: 195,
        basePhysDefLv1: 22,
        physDefPerLevel: 3.8,
        baseMagicDefLv1: 15,
        magicDefPerLevel: 2.0,
        primaryDamageType: 'Physical',
      };
    case 'Mage':
      return {
        basePhysicalAttackLv1: 105,
        physicalAttackPerLevel: 6.0,
        baseMagicPowerLv1: 25,
        baseAttackSpeed: 0.78,
        attackSpeedPerLevel: 0.015,
        baseHpLv1: 2480,
        hpPerLevel: 158,
        basePhysDefLv1: 18,
        physDefPerLevel: 3.0,
        baseMagicDefLv1: 15,
        magicDefPerLevel: 1.7,
        primaryDamageType: 'Magic',
      };
    case 'Tank':
      return {
        basePhysicalAttackLv1: 112,
        physicalAttackPerLevel: 7.4,
        baseMagicPowerLv1: 0,
        baseAttackSpeed: 0.78,
        attackSpeedPerLevel: 0.016,
        baseHpLv1: 2980,
        hpPerLevel: 240,
        basePhysDefLv1: 26,
        physDefPerLevel: 4.5,
        baseMagicDefLv1: 18,
        magicDefPerLevel: 2.3,
        primaryDamageType: 'Physical',
      };
    case 'Support':
      return {
        basePhysicalAttackLv1: 104,
        physicalAttackPerLevel: 6.2,
        baseMagicPowerLv1: 20,
        baseAttackSpeed: 0.79,
        attackSpeedPerLevel: 0.016,
        baseHpLv1: 2620,
        hpPerLevel: 175,
        basePhysDefLv1: 20,
        physDefPerLevel: 3.2,
        baseMagicDefLv1: 16,
        magicDefPerLevel: 1.9,
        primaryDamageType: 'Magic',
      };
  }
}

export interface ItemCounterGuide {
  countersItems: string[];
  counteredByItems: string[];
  understanding: string;
  whenToBuy: string;
}

/**
 * Generates tactical understanding and Item-vs-Item counter guidance for every MLBB equipment item.
 */
export function getItemCounterGuide(item: EquipmentItem): ItemCounterGuide {
  const n = item.name.toLowerCase();
  const passiveAll = item.passives.join(' ').toLowerCase();

  if (n.includes('sea halberd')) {
    return {
      countersItems: [
        'Oracle',
        "Haas's Claws",
        'Concentrated Energy',
        'Guardian Helmet',
        'Endless Battle',
        "Queen's Wings",
      ],
      counteredByItems: ['Dominance Ice', 'Blade Armor', 'Antique Cuirass'],
      understanding:
        'Pasif Lifebane memotong pemulihan HP dan Shield lawan menjadi 60%, sementara Punish menambah +8% damage terhadap hero ber-HP lebih tinggi seperti Tank atau Fighter tebal.',
      whenToBuy:
        'Beli saat berhadapan dengan komposisi heal/shield tinggi (Estes, Angela, Uranus, Esmeralda) atau lawan yang membeli Haas’s Claws / Oracle.',
    };
  }

  if (n.includes('dominance ice')) {
    return {
      countersItems: [
        'Demon Hunter Sword',
        'Corrosion Scythe',
        'Golden Staff',
        'Windtalker',
        "Haas's Claws",
        'Oracle',
      ],
      counteredByItems: ['Malefic Roar', 'Divine Glaive', 'Sea Halberd'],
      understanding:
        'Mengurangi Attack Speed penyerang serta menekan efek Shield dan HP Regen musuh di sekitar. Ini item wajib Roamer/Tank untuk meredam Marksman Attack Speed maupun Fighter Sustain.',
      whenToBuy:
        'Prioritaskan sebagai item defense pertama atau kedua ketika melawan Marksman berbasis Attack Speed atau hero lifesteal/heal tinggi.',
    };
  }

  if (n.includes('glowing wand')) {
    return {
      countersItems: [
        'Oracle',
        'Guardian Helmet',
        'Concentrated Energy',
        "Haas's Claws",
        'Radiant Armor (sebelum stack penuh)',
      ],
      counteredByItems: ['Radiant Armor', "Athena's Shield"],
      understanding:
        'Memberikan Magic Damage bakar berdasarkan % Max HP target sekaligus efek anti-heal (Lifebane), sangat efektif menembus Tank ber-HP tebal dan Mage/Support penyembuh.',
      whenToBuy:
        'Gunakan oleh Mage poke/DPS untuk membakar Tank tebal sekaligus menghentikan regen lawan tanpa harus mengorbankan slot Magic Power.',
    };
  }

  if (n.includes('malefic roar')) {
    return {
      countersItems: [
        'Antique Cuirass',
        'Blade Armor',
        'Dominance Ice',
        'Immortality',
        'Brute Force Breastplate',
      ],
      counteredByItems: ['Twilight Armor', 'Winter Crown', 'Wind of Nature'],
      understanding:
        'Memberikan Physical Penetration persentase yang membesar seiring tingginya Physical Defense lawan, sehingga armor tebal Tank tetap bisa ditembus.',
      whenToBuy:
        'Wajib dibeli pada mid-late game begitu Fighter atau Tank lawan mulai menumpuk Physical Defense di atas 120.',
    };
  }

  if (n.includes('divine glaive')) {
    return {
      countersItems: [
        "Athena's Shield",
        'Radiant Armor',
        'Oracle',
        'Tough Boots',
      ],
      counteredByItems: ['Winter Crown', 'Immortality'],
      understanding:
        'Memberikan Magic Penetration dasar + bonus penetrasi tambahan berdasarkan jumlah Magic Defense target, membuat Mage tetap sakit ke hero bertahanan sihir tinggi.',
      whenToBuy:
        'Beli saat lawan mulai membangun Athena’s Shield atau Radiant Armor agar burst maupun poke Magic tetap efektif.',
    };
  }

  if (n.includes('demon hunter sword')) {
    return {
      countersItems: [
        'Guardian Helmet',
        'Cursed Helmet',
        'Twilight Armor',
        'Sky Guardian / HP Stack',
      ],
      counteredByItems: ['Dominance Ice', 'Blade Armor', 'Antique Cuirass'],
      understanding:
        'Setiap Basic Attack memberikan tambahan Physical Damage sebesar persentase HP target saat ini, sangat mematikan bagi Tank dengan Max HP di atas 8.000.',
      whenToBuy:
        'Pilih untuk hero Attack Speed (Claude, Karrie, Miya, Moskov, Sun) ketika tim lawan memiliki 2+ hero ber-HP tebal.',
    };
  }

  if (n.includes('blade armor')) {
    return {
      countersItems: [
        "Berserker's Fury",
        'Windtalker',
        'Scarlet Phantom / Great Dragon Spear',
        'Demon Hunter Sword',
      ],
      counteredByItems: ['Malefic Roar', 'Radiant / Magic Pen', "Haas's Claws (lifesteal tinggi)"],
      understanding:
        'Memiliki Physical Defense tertinggi serta pengurangan Critical Damage dan pantulan damage kembali ke penyerang Basic Attack.',
      whenToBuy:
        'Beli untuk menghadapi Marksman Critical (Layla, Miya, Bruno, Irithel) atau penyerang Basic Attack cepat.',
    };
  }

  if (n.includes('antique cuirass')) {
    return {
      countersItems: [
        'Blade of Despair',
        'Blade of the Heptaseas',
        'Hunter Strike',
        'Sky Piercer',
        'Endless Battle',
      ],
      counteredByItems: ['Malefic Roar', 'Demon Hunter Sword'],
      understanding:
        'Saat terkena skill lawan, pasif Deter menurunkan Physical Attack penyerang secara drastis hingga beberapa stack, meredam kombo burst Assassin/Fighter.',
      whenToBuy:
        'Efektif menghadapi Assassin/Fighter berbasis skill fisik seperti Ling, Fanny, Hayabusa, Saber, Paquito, atau Terizla.',
    };
  }

  if (n.includes('athena')) {
    return {
      countersItems: [
        'Holy Crystal',
        'Lightning Truncheon',
        'Blood Wings',
        'Sky Piercer (Magic Burst)',
      ],
      counteredByItems: ['Divine Glaive', 'Glowing Wand (memicu shield sebelum burst)'],
      understanding:
        'Memberikan perisai pengurang 25% Magic Damage selama beberapa detik saat pertama kali menerima serangan sihir—sangat ampuh menahan satu kali kombo burst Mage.',
      whenToBuy:
        'Beli saat melawan Mage/Assassin burst satu kombo seperti Eudora, Kadita, Kagura, Pharsa, atau Harley.',
    };
  }

  if (n.includes('radiant armor')) {
    return {
      countersItems: [
        'Glowing Wand',
        'Feather of Heaven',
        'Ice Queen Wand',
        'Concentrated Energy',
      ],
      counteredByItems: ['Divine Glaive'],
      understanding:
        'Menumpuk pengurangan Magic Damage setiap kali menerima serangan sihir berulang kali (DPS Magic / poke terus-menerus).',
      whenToBuy:
        'Lebih unggul dibanding Athena’s Shield saat menghadapi Magic DPS beruntun seperti Chang’e, Kimmy, Yve, Valir, atau Natan.',
    };
  }

  if (n.includes('wind of nature')) {
    return {
      countersItems: [
        'Blade of Despair',
        'Blade of the Heptaseas',
        'Malefic Roar',
        'Sky Piercer (Physical)',
      ],
      counteredByItems: ['Winter Crown', 'Magic Damage / True Damage'],
      understanding:
        'Skill aktif memberikan kekebalan penuh terhadap seluruh Physical Damage selama 2 detik, memberi kesempatan Marksman membalikkan keadaan saat disergap Assassin.',
      whenToBuy:
        'Item penyelamat utama Marksman di mid-late game melawan Assassin Physical atau Fighter burst.',
    };
  }

  if (n.includes('winter crown')) {
    return {
      countersItems: [
        'Sky Piercer',
        'Blade of Despair',
        'Holy Crystal',
        'Lightning Truncheon',
      ],
      counteredByItems: ['Damage berkelanjutan setelah durasi beku habis'],
      understanding:
        'Skill aktif membekukan hero sehingga kebal terhadap segala jenis damage maupun Crowd Control selama 2 detik sembari menunggu cooldown skill atau bantuan tim.',
      whenToBuy:
        'Cocok dipakai Mage, Support, atau Fighter saat menghadapi ultimate pengunci burst seperti Hayabusa, Aldous, Harley, atau Saber.',
    };
  }

  // Generic dynamic classification for all remaining items (152 items)
  if (item.category === 'Attack') {
    const isCrit = item.stats.critChance > 0;
    const isPen = item.stats.physicalPen > 0 || item.stats.physicalPenPct > 0;
    return {
      countersItems: isPen
        ? ['Antique Cuirass', 'Dominance Ice', 'Blade Armor']
        : isCrit
        ? ['Queen’s Wings', 'Twilight Armor (HP non-armor)']
        : ['Windtalker', 'Item Squishy / Low Armor'],
      counteredByItems: isCrit
        ? ['Blade Armor', 'Dominance Ice']
        : ['Antique Cuirass', 'Wind of Nature'],
      understanding:
        passiveAll.includes('lifebane')
          ? 'Menekan pemulihan HP dan Shield target sambil meningkatkan output Physical Damage.'
          : `Memperkuat Physical Output melalui ${item.rawTips.join(', ') || 'efek pasif tempur'}.`,
      whenToBuy:
        item.tier === 'jadi'
          ? 'Bangun sesuai kebutuhan damage utama hero Physical Anda pada fase Early-Mid hingga Late Game.'
          : 'Ini adalah item mentahan yang dibeli bertahap untuk mempercepat penyelesaian item Physical utama.',
    };
  }

  if (item.category === 'Magic') {
    return {
      countersItems: ['Antique Cuirass', 'Wind of Nature', 'Dominance Ice (non-magic resist)'],
      counteredByItems: ["Athena's Shield", 'Radiant Armor', 'Oracle'],
      understanding: `Meningkatkan potensi skill Magic (${item.rawTips.join(', ') || 'pasif sihir'}) untuk poke, burst, atau sustain tim.`,
      whenToBuy:
        item.tier === 'jadi'
          ? 'Ideal untuk Mage, Assassin Magic, atau Support agar rotasi dan damage teamfight makin dominan.'
          : 'Bahan mentahan Magic awal untuk menambah Mana, CDR, atau Magic Power sambil mencicil item jadi.',
    };
  }

  if (item.category === 'Defense') {
    const isMagicDef = item.stats.magicDefense > item.stats.physicalDefense;
    return {
      countersItems: isMagicDef
        ? ['Holy Crystal', 'Lightning Truncheon', 'Glowing Wand']
        : ['Blade of Despair', 'Hunter Strike', 'Windtalker'],
      counteredByItems: isMagicDef ? ['Divine Glaive'] : ['Malefic Roar', 'Demon Hunter Sword'],
      understanding: `Memberikan ketahanan (${item.rawTips.join(', ') || 'pasif pelindung'}) agar frontline bertahan lebih lama di teamfight.`,
      whenToBuy:
        item.tier === 'jadi'
          ? 'Sesuaikan pembelian dengan sumber damage terbesar dari tim lawan (Physical vs Magic).'
          : 'Komponen pertahanan ekonomis di Early Game untuk menang laning sebelum item jadi selesai.',
    };
  }

  if (item.category === 'Movement') {
    return {
      countersItems: n.includes('tough')
        ? ['Efek Crowd Control / Slow / Magic Poke']
        : n.includes('warrior')
        ? ['Burst Physical Awal / Marksman Lane']
        : ['Mobilitas Rotasi & Cooldown'],
      counteredByItems: ['Skill Suppress (tidak terpengaruh Tough Boots)'],
      understanding: `Memberikan kecepatan gerak vital dan bonus bertahan/serangan (${item.rawTips.join(', ') || 'atribut sepatu'}).`,
      whenToBuy: 'Selalu selesaikan sepatu di awal permainan agar rotasi lane dan objektif Turtle lebih cepat.',
    };
  }

  if (item.category === 'Jungle') {
    return {
      countersItems: ['Keterlambatan Farming & Kontes Turtle/Lord'],
      counteredByItems: ['Invasi Buff Awal oleh Roamer/Mid Lawan'],
      understanding:
        'Blessing Retribution mempercepat eliminasi monster jungle dan memperkuat eksekusi objektif serta duel 1v1.',
      whenToBuy:
        'Wajib bagi Jungler bersama Spell Retribution agar tidak tertinggal level dan mudah mengamankan Lord/Turtle.',
    };
  }

  return {
    countersItems: ['Burst Tanpa Vision (Conceal)', 'Regen/Teamfight (Favor/Encourage)'],
    counteredByItems: ['Dominance Ice / Sea Halberd (melawan Favor)'],
    understanding:
      'Blessing Roam membagi Gold/EXP ekstra untuk rekan setim dan menyediakan skill aktif/pasif krusial saat teamfight.',
    whenToBuy:
      'Wajib dipilih oleh Roamer di detik pertama pertandingan agar core tim cepat kaya.',
  };
}

export interface RankInfo {
  tierIndex: number;
  tierName: string;
  division: string;
  starsInDivision: number;
  totalStars: number;
  fullLabel: string;
  timerSeconds: number;
  badgeColor: string;
}

const RANK_TIERS = [
  { name: 'Warrior', divs: ['III', 'II', 'I'], starsPerDiv: 3, timer: 50, color: '#94A3B8' },
  { name: 'Elite', divs: ['III', 'II', 'I'], starsPerDiv: 4, timer: 46, color: '#38BDF8' },
  { name: 'Master', divs: ['IV', 'III', 'II', 'I'], starsPerDiv: 4, timer: 43, color: '#FACC15' },
  { name: 'Grandmaster', divs: ['V', 'IV', 'III', 'II', 'I'], starsPerDiv: 5, timer: 39, color: '#34D399' },
  { name: 'Epic', divs: ['V', 'IV', 'III', 'II', 'I'], starsPerDiv: 5, timer: 35, color: '#2DD4BF' },
  { name: 'Legend', divs: ['V', 'IV', 'III', 'II', 'I'], starsPerDiv: 5, timer: 31, color: '#FB923C' },
];

export function getRankFromStars(totalStars: number): RankInfo {
  let remaining = Math.max(0, Math.floor(totalStars));

  for (let tIdx = 0; tIdx < RANK_TIERS.length; tIdx++) {
    const tier = RANK_TIERS[tIdx];
    for (const div of tier.divs) {
      if (remaining < tier.starsPerDiv) {
        return {
          tierIndex: tIdx,
          tierName: tier.name,
          division: div,
          starsInDivision: remaining,
          totalStars,
          fullLabel: `${tier.name} ${div} · ${remaining}★`,
          timerSeconds: tier.timer,
          badgeColor: tier.color,
        };
      }
      remaining -= tier.starsPerDiv;
    }
  }

  // Mythic tiers (stars beyond Legend I)
  const mythicStars = remaining;
  if (mythicStars < 25) {
    return {
      tierIndex: 6,
      tierName: 'Mythic',
      division: 'Grading/Mythic',
      starsInDivision: mythicStars,
      totalStars,
      fullLabel: `Mythic · ${mythicStars}★`,
      timerSeconds: 27,
      badgeColor: '#F59E0B',
    };
  }
  if (mythicStars < 50) {
    return {
      tierIndex: 7,
      tierName: 'Mythical Honor',
      division: 'Honor',
      starsInDivision: mythicStars,
      totalStars,
      fullLabel: `Mythical Honor · ${mythicStars}★`,
      timerSeconds: 24,
      badgeColor: '#A855F7',
    };
  }
  if (mythicStars < 100) {
    return {
      tierIndex: 8,
      tierName: 'Mythical Glory',
      division: 'Glory',
      starsInDivision: mythicStars,
      totalStars,
      fullLabel: `Mythical Glory · ${mythicStars}★`,
      timerSeconds: 21,
      badgeColor: '#F43F5E',
    };
  }

  return {
    tierIndex: 9,
    tierName: 'Mythical Immortal',
    division: 'Immortal',
    starsInDivision: mythicStars,
    totalStars,
    fullLabel: `Mythical Immortal · ${mythicStars}★`,
    timerSeconds: 18,
    badgeColor: '#FBBF24',
  };
}

/**
 * Generates deterministic locked Nickname, Tier Rank, and Main Role from MLBB ID + Zone ID.
 */
export function resolveMlbbAccountIdentity(
  mlbbId: string,
  mlbbZone: string
): { nickname: string; accountTier: string; accountRole: string } {
  const cleanId = mlbbId.replace(/[^0-9]/g, '');
  const cleanZone = mlbbZone.replace(/[^0-9]/g, '') || '2001';
  if (!cleanId) {
    return { nickname: '', accountTier: '', accountRole: '' };
  }

  let hash = 0;
  const seed = `${cleanId}:${cleanZone}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
  }

  const prefixes = ['Rex', 'Valk', 'Kuro', 'Zen', 'Aether', 'Nox', 'Sora', 'Ryu', 'Lumen', 'Draco'];
  const suffixes = ['Blitz', 'Fang', 'Blade', 'Pulse', 'Nova', 'Zero', 'Ace', 'Shadow', 'Vortex', 'Prime'];
  const tiers = [
    'Epic II',
    'Epic I',
    'Legend IV',
    'Legend II',
    'Mythic ★12',
    'Mythic ★21',
    'Mythical Honor ★34',
    'Mythical Glory ★58',
    'Mythical Immortal ★105',
  ];
  const roles = ['Assassin / Jungle', 'Marksman / Gold', 'Mage / Mid', 'Fighter / Exp', 'Tank / Roam', 'Support / Roam'];

  const nickname = `${prefixes[hash % prefixes.length]}${suffixes[(hash >> 4) % suffixes.length]}_${cleanId.slice(-3)}`;
  const accountTier = tiers[(hash >> 8) % tiers.length];
  const accountRole = roles[(hash >> 12) % roles.length];

  return { nickname, accountTier, accountRole };
}
