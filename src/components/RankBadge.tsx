import { useId } from 'react';
import { Star } from 'lucide-react';
import type { RankInfo } from '../utils/mlbbParser';

interface RankBadgeProps {
  tierName: string;
  size?: 'sm' | 'md' | 'lg';
}

type TierKey =
  | 'warrior'
  | 'elite'
  | 'master'
  | 'grandmaster'
  | 'epic'
  | 'legend'
  | 'mythic'
  | 'honor'
  | 'glory'
  | 'immortal';

function resolveTierKey(tierName: string): TierKey {
  const t = tierName.toLowerCase();
  if (t.includes('immortal')) return 'immortal';
  if (t.includes('glory')) return 'glory';
  if (t.includes('honor')) return 'honor';
  if (t.includes('mythic')) return 'mythic';
  if (t.includes('legend')) return 'legend';
  if (t.includes('epic')) return 'epic';
  if (t.includes('grandmaster')) return 'grandmaster';
  if (t.includes('master')) return 'master';
  if (t.includes('elite')) return 'elite';
  return 'warrior';
}

export function RankBadge({ tierName, size = 'md' }: RankBadgeProps) {
  const uid = useId().replace(/:/g, '');
  const tier = resolveTierKey(tierName);
  const dim = size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-16 h-16' : 'w-14 h-14';

  return (
    <div
      className={`${dim} relative flex items-center justify-center shrink-0 select-none`}
      aria-label={`Rank ${tierName}`}
    >
      <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-md">
        {/* 1. WARRIOR: Crossed iron blades + Bronze armored shield */}
        {tier === 'warrior' && (
          <g>
            <defs>
              <linearGradient id={`${uid}-w`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#B47B48" />
                <stop offset="100%" stopColor="#4A2E16" />
              </linearGradient>
              <linearGradient id={`${uid}-ws`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
            </defs>
            {/* Crossed Swords behind shield */}
            <path d="M14 14 L22 10 L62 56 L55 62 Z" fill={`url(#${uid}-ws)`} stroke="#E2E8F0" strokeWidth="1" />
            <path d="M66 14 L58 10 L18 56 L25 62 Z" fill={`url(#${uid}-ws)`} stroke="#E2E8F0" strokeWidth="1" />
            <rect x="12" y="54" width="12" height="4" rx="1.5" transform="rotate(-40 18 56)" fill="#B47B48" />
            <rect x="56" y="54" width="12" height="4" rx="1.5" transform="rotate(40 62 56)" fill="#B47B48" />
            {/* Bronze Heater Shield */}
            <path
              d="M40 16 L58 23 V42 C58 53 49 62 40 67 C31 62 22 53 22 42 V23 Z"
              fill={`url(#${uid}-w)`}
              stroke="#E2B986"
              strokeWidth="2.5"
            />
            <path d="M40 22 L51 27 V41 C51 49 45 55 40 59 C35 55 29 49 29 41 V27 Z" fill="#2A1B0E" opacity="0.55" />
            {/* Bronze Crest Spear */}
            <polygon points="40,26 44,40 40,54 36,40" fill="#FDE68A" />
          </g>
        )}

        {/* 2. ELITE: Silver winged steel shield + Cyan-Silver gem */}
        {tier === 'elite' && (
          <g>
            <defs>
              <linearGradient id={`${uid}-el`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#CBD5E1" />
                <stop offset="100%" stopColor="#1E3A5F" />
              </linearGradient>
              <linearGradient id={`${uid}-elw`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#E2E8F0" />
                <stop offset="100%" stopColor="#64748B" />
              </linearGradient>
            </defs>
            {/* Silver Swept Wings */}
            <path d="M6 22 L24 27 L22 45 L10 38 Z" fill={`url(#${uid}-elw)`} stroke="#F8FAFC" strokeWidth="1" />
            <path d="M74 22 L56 27 L58 45 L70 38 Z" fill={`url(#${uid}-elw)`} stroke="#F8FAFC" strokeWidth="1" />
            <path d="M12 16 L26 23 L24 30 L8 24 Z" fill="#93C5FD" />
            <path d="M68 16 L54 23 L56 30 L72 24 Z" fill="#93C5FD" />
            {/* Steel Shield */}
            <path
              d="M40 13 L58 21 V42 C58 54 48 63 40 68 C32 63 22 54 22 42 V21 Z"
              fill={`url(#${uid}-el)`}
              stroke="#BAE6FD"
              strokeWidth="2.4"
            />
            {/* Top Chevron Spire */}
            <polygon points="40,7 46,16 34,16" fill="#38BDF8" />
            {/* Radiant Cyan Core */}
            <polygon points="40,27 49,39 40,52 31,39" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="1.5" />
            <polygon points="40,32 45,39 40,47 35,39" fill="#E0F2FE" />
          </g>
        )}

        {/* 3. MASTER: Burnished Gold horned knight crest + Ruby gem */}
        {tier === 'master' && (
          <g>
            <defs>
              <linearGradient id={`${uid}-ms`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FACC15" />
                <stop offset="100%" stopColor="#92400E" />
              </linearGradient>
            </defs>
            {/* Gold Horns / Helmet Fins */}
            <path d="M10 18 C14 10, 22 14, 25 22 L20 44 L9 36 Z" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.2" />
            <path d="M70 18 C66 10, 58 14, 55 22 L60 44 L71 36 Z" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.2" />
            {/* Royal Gold Shield */}
            <path
              d="M40 12 L57 22 V42 C57 54 48 63 40 69 C32 63 23 54 23 42 V22 Z"
              fill={`url(#${uid}-ms)`}
              stroke="#FEF08A"
              strokeWidth="2.4"
            />
            <path d="M40 19 L50 26 V41 C50 49 44 56 40 60 C36 56 30 49 30 41 V26 Z" fill="#451A03" opacity="0.6" />
            {/* Crown Spike */}
            <polygon points="40,6 45,15 35,15" fill="#FEF08A" />
            {/* Ruby Core */}
            <polygon points="40,28 48,39 40,51 32,39" fill="#EF4444" stroke="#FDE047" strokeWidth="1.8" />
            <polygon points="40,33 44,39 40,46 36,39" fill="#FCA5A5" />
          </g>
        )}

        {/* 4. GRANDMASTER: Twin Emerald-Silver Dragon Wings + Emerald Core */}
        {tier === 'grandmaster' && (
          <g>
            <defs>
              <linearGradient id={`${uid}-gm`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#064E3B" />
              </linearGradient>
            </defs>
            {/* Multi-feathered Silver-Emerald Wings */}
            <path d="M4 16 L24 24 L21 48 L6 34 Z" fill="#A7F3D0" stroke="#059669" strokeWidth="1.2" />
            <path d="M76 16 L56 24 L59 48 L74 34 Z" fill="#A7F3D0" stroke="#059669" strokeWidth="1.2" />
            <path d="M8 29 L23 34 L22 52 L11 46 Z" fill="#10B981" />
            <path d="M72 29 L57 34 L58 52 L69 46 Z" fill="#10B981" />
            {/* Ornate Lance Shield */}
            <path
              d="M40 11 L58 21 V43 C58 55 48 64 40 70 C32 64 22 55 22 43 V21 Z"
              fill={`url(#${uid}-gm)`}
              stroke="#E2E8F0"
              strokeWidth="2.5"
            />
            <polygon points="40,4 46,16 34,16" fill="#A7F3D0" />
            {/* Faceted Emerald Star */}
            <polygon points="40,25 50,39 40,54 30,39" fill="#6EE7B7" stroke="#ECFDF5" strokeWidth="1.6" />
            <polygon points="40,31 45,39 40,48 35,39" fill="#047857" />
          </g>
        )}

        {/* 5. EPIC: Iconic Teal-Gold Rhino Horned Shield */}
        {tier === 'epic' && (
          <g>
            <defs>
              <linearGradient id={`${uid}-ep`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2DD4BF" />
                <stop offset="100%" stopColor="#0F4C5C" />
              </linearGradient>
            </defs>
            {/* Forward Swept Rhino Horns & Blade Wings */}
            <path d="M6 12 C10 28, 16 38, 25 46 L23 26 Z" fill="#99F6E4" stroke="#0F766E" strokeWidth="1.2" />
            <path d="M74 12 C70 28, 64 38, 55 46 L57 26 Z" fill="#99F6E4" stroke="#0F766E" strokeWidth="1.2" />
            <path d="M12 42 L25 46 L25 58 L15 52 Z" fill="#F59E0B" />
            <path d="M68 42 L55 46 L55 58 L65 52 Z" fill="#F59E0B" />
            {/* Armored Teal Rhino Shield */}
            <path
              d="M40 12 L59 22 V43 C59 56 49 65 40 71 C31 65 21 56 21 43 V22 Z"
              fill={`url(#${uid}-ep)`}
              stroke="#FDE68A"
              strokeWidth="2.5"
            />
            {/* Top Nasal Horn */}
            <polygon points="40,5 45,18 35,18" fill="#FBBF24" />
            {/* Hexagonal Teal-Gold Core */}
            <polygon points="40,26 49,33 49,45 40,53 31,45 31,33" fill="#134E4A" stroke="#5EEAD4" strokeWidth="1.8" />
            <polygon points="40,30 45,39 40,48 35,39" fill="#5EEAD4" />
          </g>
        )}

        {/* 6. LEGEND: Fiery Gold & Crimson Phoenix/Griffin Crest */}
        {tier === 'legend' && (
          <g>
            <defs>
              <linearGradient id={`${uid}-lg`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FB923C" />
                <stop offset="100%" stopColor="#991B1B" />
              </linearGradient>
            </defs>
            {/* Blazing Phoenix/Griffin Sweeping Wings */}
            <path d="M3 12 L24 22 L22 44 L5 28 Z" fill="#FBBF24" stroke="#FEF08A" strokeWidth="1" />
            <path d="M77 12 L56 22 L58 44 L75 28 Z" fill="#FBBF24" stroke="#FEF08A" strokeWidth="1" />
            <path d="M7 30 L24 36 L23 54 L11 46 Z" fill="#EA580C" />
            <path d="M73 30 L56 36 L57 54 L69 46 Z" fill="#EA580C" />
            {/* Crown Spires */}
            <polygon points="29,16 33,6 37,16" fill="#FDE047" />
            <polygon points="43,16 47,6 51,16" fill="#FDE047" />
            <polygon points="36,14 40,3 44,14" fill="#FEF08A" />
            {/* Crimson-Gold Shield */}
            <path
              d="M40 14 L58 23 V44 C58 56 49 65 40 71 C31 65 22 56 22 44 V23 Z"
              fill={`url(#${uid}-lg)`}
              stroke="#FDE047"
              strokeWidth="2.6"
            />
            <polygon points="40,27 50,39 40,54 30,39" fill="#FDE047" stroke="#FFFBEB" strokeWidth="1.5" />
            <polygon points="40,33 45,39 40,47 35,39" fill="#DC2626" />
          </g>
        )}

        {/* 7. MYTHIC: Regal Gold & Violet-Crimson Winged Crown */}
        {tier === 'mythic' && (
          <g>
            <defs>
              <linearGradient id={`${uid}-my`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#581C87" />
              </linearGradient>
            </defs>
            {/* Angelic Golden Wings */}
            <path d="M2 10 L25 22 L23 48 L6 30 Z" fill="#FBBF24" stroke="#FEF08A" strokeWidth="1.2" />
            <path d="M78 10 L55 22 L57 48 L74 30 Z" fill="#FBBF24" stroke="#FEF08A" strokeWidth="1.2" />
            <path d="M7 33 L24 39 L22 56 L11 49 Z" fill="#D97706" />
            <path d="M73 33 L56 39 L58 56 L69 49 Z" fill="#D97706" />
            {/* Royal Mythic Crown */}
            <path d="M25 18 L28 7 L35 14 L40 4 L45 14 L52 7 L55 18 Z" fill="#FDE047" stroke="#FEF9C3" strokeWidth="1" />
            {/* Violet-Gold Shield */}
            <path
              d="M40 16 L58 24 V44 C58 56 49 66 40 72 C31 66 22 56 22 44 V24 Z"
              fill={`url(#${uid}-my)`}
              stroke="#FDE047"
              strokeWidth="2.6"
            />
            <polygon points="40,27 50,39 40,54 30,39" fill="#C084FC" stroke="#FEF08A" strokeWidth="1.8" />
            <polygon points="40,33 45,39 40,47 35,39" fill="#FEF08A" />
          </g>
        )}

        {/* 8. MYTHICAL HONOR: Celestial Violet-Sapphire Wings + Halo Star */}
        {tier === 'honor' && (
          <g>
            <defs>
              <linearGradient id={`${uid}-hn`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>
            </defs>
            {/* Celestial Halo */}
            <circle cx="40" cy="40" r="26" fill="none" stroke="#93C5FD" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
            {/* Multi-tier Sapphire/Violet Wings */}
            <path d="M2 10 L25 22 L22 48 L5 28 Z" fill="#C084FC" stroke="#F3E8FF" strokeWidth="1.1" />
            <path d="M78 10 L55 22 L58 48 L75 28 Z" fill="#C084FC" stroke="#F3E8FF" strokeWidth="1.1" />
            <path d="M6 31 L24 37 L22 56 L10 49 Z" fill="#3B82F6" />
            <path d="M74 31 L56 37 L58 56 L70 49 Z" fill="#3B82F6" />
            {/* Celestial Crown */}
            <path d="M26 18 L30 6 L36 13 L40 3 L44 13 L50 6 L54 18 Z" fill="#E9D5FF" />
            {/* Honor Shield */}
            <path
              d="M40 16 L58 24 V44 C58 56 49 66 40 72 C31 66 22 56 22 44 V24 Z"
              fill={`url(#${uid}-hn)`}
              stroke="#E9D5FF"
              strokeWidth="2.6"
            />
            <polygon points="40,26 51,39 40,55 29,39" fill="#60A5FA" stroke="#FFFFFF" strokeWidth="1.6" />
            <polygon points="40,32 45,39 40,47 35,39" fill="#FFFFFF" />
          </g>
        )}

        {/* 9. MYTHICAL GLORY: Imperial Crimson-Gold Dragon Wings + Blazing Crown */}
        {tier === 'glory' && (
          <g>
            <defs>
              <linearGradient id={`${uid}-gl`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F43F5E" />
                <stop offset="100%" stopColor="#4C1D95" />
              </linearGradient>
            </defs>
            {/* Imperial Scarlet-Gold Wings */}
            <path d="M2 8 L25 21 L22 48 L4 27 Z" fill="#FB7185" stroke="#FEF08A" strokeWidth="1.2" />
            <path d="M78 8 L55 21 L58 48 L76 27 Z" fill="#FB7185" stroke="#FEF08A" strokeWidth="1.2" />
            <path d="M6 31 L23 36 L22 57 L10 50 Z" fill="#F59E0B" />
            <path d="M74 31 L57 36 L58 57 L70 50 Z" fill="#F59E0B" />
            {/* Blazing Dragon Crown */}
            <path d="M23 18 L27 5 L34 13 L40 2 L46 13 L53 5 L57 18 Z" fill="#FBBF24" stroke="#FEF9C3" strokeWidth="1.1" />
            {/* Crimson Sovereign Shield */}
            <path
              d="M40 16 L58 24 V45 C58 57 49 67 40 73 C31 67 22 57 22 45 V24 Z"
              fill={`url(#${uid}-gl)`}
              stroke="#FDE047"
              strokeWidth="2.8"
            />
            <polygon points="40,26 51,39 40,55 29,39" fill="#FDA4AF" stroke="#FEF08A" strokeWidth="1.8" />
            <polygon points="40,32 45,39 40,47 35,39" fill="#9F1239" />
          </g>
        )}

        {/* 10. MYTHICAL IMMORTAL: Molten Solar Gold & Crimson Imperial Wings */}
        {tier === 'immortal' && (
          <g>
            <defs>
              <linearGradient id={`${uid}-im`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="55%" stopColor="#DC2626" />
                <stop offset="100%" stopColor="#450A0A" />
              </linearGradient>
            </defs>
            {/* Radiant Solar Halo */}
            <circle cx="40" cy="40" r="30" fill="none" stroke="#FDE047" strokeWidth="1.8" strokeDasharray="5 3" />
            {/* Dual Majestic Golden Phoenix Wings */}
            <path d="M1 7 L25 21 L22 49 L3 27 Z" fill="#FDE047" stroke="#FEF9C3" strokeWidth="1.2" />
            <path d="M79 7 L55 21 L58 49 L77 27 Z" fill="#FDE047" stroke="#FEF9C3" strokeWidth="1.2" />
            <path d="M5 31 L24 37 L22 59 L9 51 Z" fill="#EF4444" stroke="#FDE047" strokeWidth="1" />
            <path d="M75 31 L56 37 L58 59 L71 51 Z" fill="#EF4444" stroke="#FDE047" strokeWidth="1" />
            {/* Supreme Immortal Crown */}
            <path d="M22 18 L26 5 L33 13 L40 1 L47 13 L54 5 L58 18 Z" fill="#FEF08A" stroke="#F59E0B" strokeWidth="1.2" />
            {/* Molten Gold & Crimson Shield */}
            <path
              d="M40 16 L59 24 V45 C59 58 49 68 40 74 C31 68 21 58 21 45 V24 Z"
              fill={`url(#${uid}-im)`}
              stroke="#FEF08A"
              strokeWidth="3"
            />
            <polygon points="40,26 51,39 40,56 29,39" fill="#FEF08A" stroke="#FFFFFF" strokeWidth="1.8" />
            <polygon points="40,32 45,39 40,48 35,39" fill="#DC2626" />
          </g>
        )}
      </svg>
    </div>
  );
}

export function RankStarsStrip({ rank }: { rank: RankInfo }) {
  const t = rank.tierName.toLowerCase();
  const isMythicPlus =
    t.includes('mythic') || t.includes('honor') || t.includes('glory') || t.includes('immortal');

  if (isMythicPlus) {
    return (
      <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-300 font-mono-num text-xs font-bold">
        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
        <span>× {rank.starsInDivision} Bintang</span>
      </div>
    );
  }

  const maxStars =
    t.includes('warrior') ? 3 : t.includes('elite') || t.includes('master') ? 4 : 5;

  return (
    <div className="flex items-center gap-1" aria-label={`${rank.starsInDivision} dari ${maxStars} bintang`}>
      {Array.from({ length: maxStars }).map((_, idx) => {
        const filled = idx < rank.starsInDivision;
        return (
          <Star
            key={idx}
            className={`w-4 h-4 ${
              filled
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-300 dark:text-slate-600'
            }`}
          />
        );
      })}
    </div>
  );
}
