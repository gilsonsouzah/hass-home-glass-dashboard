export const DYNAMIC_PRESET = 'dynamic';
export const DYNAMIC_REFRESH_MS = 5 * 60 * 1000;

export const PHASES = ['night', 'dawn', 'morning', 'day', 'golden', 'dusk'] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_LABELS_EN: Record<Phase, string> = {
  night: 'Night',
  dawn: 'Dawn',
  morning: 'Morning',
  day: 'Day',
  golden: 'Golden hour',
  dusk: 'Dusk',
};

export interface SunState {
  state?: string;
  attributes?: { elevation?: unknown; rising?: unknown };
}

interface HassLike {
  states?: Record<string, SunState | undefined>;
}

const NIGHT_BELOW_ELEVATION = -6;
const GOLDEN_BELOW_ELEVATION = 10;
const MORNING_BELOW_ELEVATION = 20;

// [start hour, phase] ascending; the last entry wraps past midnight into the first.
const CLOCK_PHASES: ReadonlyArray<readonly [number, Phase]> = [
  [5, 'dawn'],
  [7, 'morning'],
  [11, 'day'],
  [17, 'golden'],
  [19, 'dusk'],
  [20.5, 'night'],
];

const DAYLIGHT: ReadonlySet<Phase> = new Set(['morning', 'day', 'golden']);

const hourOf = (date: Date) => date.getHours() + date.getMinutes() / 60;

export function phaseFromClock(date: Date): Phase {
  const hour = hourOf(date);
  let phase: Phase = 'night';
  for (const [start, name] of CLOCK_PHASES) if (hour >= start) phase = name;
  return phase;
}

export function phaseFromElevation(elevation: number, rising: boolean): Phase {
  if (elevation < NIGHT_BELOW_ELEVATION) return 'night';
  if (elevation < 0) return rising ? 'dawn' : 'dusk';
  if (rising) return elevation < MORNING_BELOW_ELEVATION ? 'morning' : 'day';
  return elevation < GOLDEN_BELOW_ELEVATION ? 'golden' : 'day';
}

/**
 * Elevation wins over the clock so polar days and nights follow the real sun.
 * Without a usable elevation, the above/below_horizon state corrects the clock guess.
 * A missing `rising` flag falls back to before/after local noon.
 */
export function phaseFromSun(sun: SunState | undefined, date: Date): Phase {
  const clock = phaseFromClock(date);
  const elevation = sun?.attributes?.elevation;

  if (typeof elevation === 'number' && Number.isFinite(elevation)) {
    const rising = sun?.attributes?.rising;
    return phaseFromElevation(elevation, typeof rising === 'boolean' ? rising : hourOf(date) < 12);
  }
  if (sun?.state === 'above_horizon' && !DAYLIGHT.has(clock)) return hourOf(date) < 12 ? 'morning' : 'golden';
  if (sun?.state === 'below_horizon' && DAYLIGHT.has(clock)) return 'night';
  return clock;
}

export function currentPhase(hass: HassLike | undefined, date: Date): Phase {
  return phaseFromSun(hass?.states?.['sun.sun'], date);
}

const star = (x: number, y: number, size: number, alpha: number) =>
  `radial-gradient(${size}px ${size}px at ${x}% ${y}%, rgba(255, 255, 255, ${alpha}), transparent)`;

const NIGHT_STARS = [
  star(8, 12, 1.5, 0.9), star(21, 31, 1, 0.7), star(34, 8, 1.5, 0.8), star(47, 22, 1, 0.6),
  star(58, 14, 2, 0.9), star(69, 36, 1, 0.7), star(81, 9, 1.5, 0.8), star(92, 27, 1, 0.6),
  star(14, 52, 1, 0.5), star(39, 46, 1.5, 0.6), star(76, 55, 1, 0.5), star(88, 62, 1.5, 0.6),
].join(', ');

const sky = (...stops: string[]) => `linear-gradient(180deg, ${stops.join(', ')})`;

// Opaque rgb() stops so gradientLuminance can derive the title tone from the sky alone.
const SKIES: Record<Phase, string> = {
  night: sky('rgb(8, 12, 32) 0%', 'rgb(17, 26, 62) 55%', 'rgb(36, 40, 92) 100%'),
  dawn: sky('rgb(38, 43, 96) 0%', 'rgb(112, 86, 150) 45%', 'rgb(240, 150, 130) 80%', 'rgb(255, 190, 140) 100%'),
  morning: sky('rgb(92, 150, 220) 0%', 'rgb(150, 195, 235) 55%', 'rgb(255, 214, 170) 100%'),
  day: sky('rgb(40, 120, 215) 0%', 'rgb(86, 164, 235) 55%', 'rgb(150, 206, 245) 100%'),
  golden: sky('rgb(70, 100, 170) 0%', 'rgb(220, 130, 110) 55%', 'rgb(255, 179, 90) 100%'),
  dusk: sky('rgb(28, 32, 80) 0%', 'rgb(98, 64, 134) 50%', 'rgb(214, 104, 120) 85%', 'rgb(250, 150, 110) 100%'),
};

export function phaseBackground(phase: Phase): string {
  return phase === 'night' ? `${NIGHT_STARS}, ${SKIES.night}` : SKIES[phase];
}

/** Sky without the stars, which are too sparse to move the title tone. */
export const phaseSky = (phase: Phase): string => SKIES[phase];
