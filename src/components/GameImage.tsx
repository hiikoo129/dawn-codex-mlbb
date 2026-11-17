import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { applyImageQuality } from '../services/mlbbApi';

interface GameImageProps {
  src?: string;
  name: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  rounded?: 'full' | 'lg' | 'xl' | '2xl' | 'none';
  fullFrame?: boolean;
}

function getInitials(name: string): string {
  const parts = name
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'ML';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getToneFromName(name: string): string {
  const tones = [
    'from-amber-500/25 to-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-500/30',
    'from-sky-500/25 to-sky-900/40 text-sky-800 dark:text-sky-200 border-sky-500/30',
    'from-rose-500/25 to-rose-900/40 text-rose-800 dark:text-rose-200 border-rose-500/30',
    'from-emerald-500/25 to-emerald-900/40 text-emerald-800 dark:text-emerald-200 border-emerald-500/30',
    'from-violet-500/25 to-violet-900/40 text-violet-800 dark:text-violet-200 border-violet-500/30',
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return tones[sum % tones.length];
}

export function GameImage({
  src,
  name,
  alt,
  className = 'w-12 h-12',
  imgClassName = 'w-full h-full object-cover',
  fallbackClassName = '',
  rounded = 'xl',
  fullFrame = false,
}: GameImageProps) {
  const { settings } = useAppContext();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const resolvedSrc = applyImageQuality(src, settings.imageQuality);
  const failed = !resolvedSrc || failedSrc === resolvedSrc;

  const radiusClass =
    rounded === 'full'
      ? 'rounded-full'
      : rounded === 'lg'
      ? 'rounded-lg'
      : rounded === 'xl'
      ? 'rounded-xl'
      : rounded === '2xl'
      ? 'rounded-2xl'
      : '';

  if (failed) {
    const tone = getToneFromName(name);
    return (
      <div
        role="img"
        aria-label={alt || name}
        className={`flex items-center justify-center bg-gradient-to-br border font-display font-bold select-none shrink-0 ${tone} ${radiusClass} ${className} ${fallbackClassName}`}
      >
        <span className="text-xs sm:text-sm tracking-tight">{getInitials(name)}</span>
      </div>
    );
  }

  if (fullFrame) {
    return (
      <div className={`relative overflow-hidden bg-slate-900 shrink-0 ${radiusClass} ${className}`}>
        <img
          src={resolvedSrc}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-md opacity-45 pointer-events-none"
        />
        <img
          src={resolvedSrc}
          alt={alt || name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(resolvedSrc)}
          className={`relative z-[1] w-full h-full object-contain object-center ${imgClassName}`}
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-slate-200 dark:bg-[#1A2333] shrink-0 ${radiusClass} ${className}`}>
      <img
        src={resolvedSrc}
        alt={alt || name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(resolvedSrc)}
        className={imgClassName}
      />
    </div>
  );
}
