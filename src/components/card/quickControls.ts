// Pure logic behind the long-press quick-controls sheet. No imports and no DOM so node:test can load it.

type Attrs = Record<string, any>;

export type SheetKind = 'light' | 'cover' | 'fan' | 'climate' | 'media_player' | 'generic';

const SHEET_KINDS: readonly SheetKind[] = ['light', 'cover', 'fan', 'climate', 'media_player'];

export function sheetKind(domain: string): SheetKind {
  return SHEET_KINDS.find((kind) => kind === domain) ?? 'generic';
}

const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

const features = (attrs: Attrs) => num(attrs.supported_features) ?? 0;

const hasFeature = (attrs: Attrs, flag: number) => (features(attrs) & flag) !== 0;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

// --- light ---------------------------------------------------------------

const COLOR_MODES = ['hs', 'rgb', 'rgbw', 'rgbww', 'xy'];

export interface LightControls {
  brightness: boolean;
  colorTemp: { min: number; max: number } | null;
  colors: boolean;
}

export function lightControls(attrs: Attrs): LightControls {
  const modes = stringList(attrs.supported_color_modes);
  const brightness = modes.length > 0 ? modes.some((m) => m !== 'onoff') : num(attrs.brightness) !== null;
  const min = num(attrs.min_color_temp_kelvin) ?? 2000;
  const max = num(attrs.max_color_temp_kelvin) ?? 6500;
  return {
    brightness,
    colorTemp: modes.includes('color_temp') && min < max ? { min, max } : null,
    colors: modes.some((m) => COLOR_MODES.includes(m)),
  };
}

export function brightnessPercent(state: string, attrs: Attrs): number {
  const brightness = num(attrs.brightness);
  if (state !== 'on' || brightness === null) return state === 'on' ? 100 : 0;
  return clamp(Math.round((brightness / 255) * 100), 0, 100);
}

export function lightBrightnessCall(pct: number) {
  const rounded = Math.round(pct);
  return rounded <= 0
    ? { service: 'turn_off', data: {} }
    : { service: 'turn_on', data: { brightness_pct: Math.min(100, rounded) } };
}

export function colorTempKelvin(attrs: Attrs, range: { min: number; max: number }): number {
  const kelvin = num(attrs.color_temp_kelvin);
  return kelvin === null ? Math.round((range.min + range.max) / 2) : clamp(kelvin, range.min, range.max);
}

export interface ColorPreset {
  id: string;
  hs: [number, number];
}

export const COLOR_PRESETS: readonly ColorPreset[] = [
  { id: 'red', hs: [0, 100] },
  { id: 'orange', hs: [30, 100] },
  { id: 'yellow', hs: [55, 100] },
  { id: 'green', hs: [120, 100] },
  { id: 'blue', hs: [220, 100] },
  { id: 'purple', hs: [275, 100] },
  { id: 'pink', hs: [330, 100] },
];

export function matchesPreset(attrs: Attrs, preset: ColorPreset): boolean {
  const hs = attrs.hs_color;
  if (!Array.isArray(hs) || num(hs[0]) === null || num(hs[1]) === null) return false;
  const diff = Math.abs(hs[0] - preset.hs[0]);
  return Math.min(diff, 360 - diff) <= 8 && Math.abs(hs[1] - preset.hs[1]) <= 15;
}

// --- cover ---------------------------------------------------------------

const COVER = { OPEN: 1, CLOSE: 2, SET_POSITION: 4, STOP: 8 };

export interface CoverControls {
  position: boolean;
  open: boolean;
  close: boolean;
  stop: boolean;
}

export function coverControls(attrs: Attrs): CoverControls {
  return {
    position: hasFeature(attrs, COVER.SET_POSITION),
    open: hasFeature(attrs, COVER.OPEN),
    close: hasFeature(attrs, COVER.CLOSE),
    stop: hasFeature(attrs, COVER.STOP),
  };
}

export function coverPosition(state: string, attrs: Attrs): number {
  const position = num(attrs.current_position);
  if (position !== null) return clamp(Math.round(position), 0, 100);
  return state === 'open' ? 100 : 0;
}

// --- fan -----------------------------------------------------------------

const FAN = { SET_SPEED: 1, OSCILLATE: 2 };

export interface FanControls {
  speed: boolean;
  oscillate: boolean;
  step: number;
}

export function fanControls(attrs: Attrs): FanControls {
  const step = num(attrs.percentage_step);
  return {
    speed: hasFeature(attrs, FAN.SET_SPEED),
    oscillate: hasFeature(attrs, FAN.OSCILLATE),
    step: step !== null && step >= 1 ? step : 1,
  };
}

export function fanPercentage(state: string, attrs: Attrs): number {
  const percentage = num(attrs.percentage);
  return state === 'on' && percentage !== null ? clamp(Math.round(percentage), 0, 100) : 0;
}

// --- climate -------------------------------------------------------------

export interface ClimateControls {
  target: { value: number; min: number; max: number; step: number } | null;
  modes: string[];
}

export function climateControls(attrs: Attrs): ClimateControls {
  const value = num(attrs.temperature);
  const step = num(attrs.target_temp_step);
  return {
    target:
      value === null
        ? null
        : { value, min: num(attrs.min_temp) ?? 7, max: num(attrs.max_temp) ?? 35, step: step !== null && step > 0 ? step : 1 },
    modes: stringList(attrs.hvac_modes),
  };
}

// --- media player --------------------------------------------------------

const MEDIA = { PAUSE: 1, VOLUME_SET: 4, PREVIOUS_TRACK: 16, NEXT_TRACK: 32, PLAY: 16384 };

export interface MediaControls {
  volume: boolean;
  previous: boolean;
  next: boolean;
  playPause: boolean;
}

export function mediaControls(attrs: Attrs): MediaControls {
  return {
    volume: hasFeature(attrs, MEDIA.VOLUME_SET),
    previous: hasFeature(attrs, MEDIA.PREVIOUS_TRACK),
    next: hasFeature(attrs, MEDIA.NEXT_TRACK),
    playPause: (features(attrs) & (MEDIA.PAUSE | MEDIA.PLAY)) === (MEDIA.PAUSE | MEDIA.PLAY),
  };
}

export function volumePercent(attrs: Attrs): number {
  const level = num(attrs.volume_level);
  return level === null ? 0 : clamp(Math.round(level * 100), 0, 100);
}

// --- timing --------------------------------------------------------------

export interface Timers {
  now: () => number;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (id: unknown) => void;
}

export const realTimers: Timers = {
  now: () => Date.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

export const SLIDER_INTERVAL_MS = 250;

export interface RateLimiter<T> {
  push: (value: T) => void;
  flush: (value: T) => void;
  cancel: () => void;
}

/** At most one send per interval while pushing (the newest value wins); flush always delivers the final value. */
export function createRateLimiter<T>(
  send: (value: T) => void,
  intervalMs = SLIDER_INTERVAL_MS,
  timers: Timers = realTimers
): RateLimiter<T> {
  let lastSentAt = -Infinity;
  let sent: { value: T } | undefined;
  let pending: { value: T } | undefined;
  let timer: unknown;

  const clearTimer = () => {
    if (timer !== undefined) timers.clearTimer(timer);
    timer = undefined;
  };
  const fire = () => {
    clearTimer();
    if (!pending) return;
    sent = pending;
    pending = undefined;
    lastSentAt = timers.now();
    send(sent.value);
  };

  return {
    push(value) {
      pending = { value };
      if (timer !== undefined) return;
      const wait = lastSentAt + intervalMs - timers.now();
      if (wait <= 0) fire();
      else timer = timers.setTimer(fire, wait);
    },
    flush(value) {
      if (!pending && sent && Object.is(sent.value, value)) return;
      pending = { value };
      fire();
    },
    cancel() {
      clearTimer();
      pending = undefined;
    },
  };
}

export interface SyncGate<T> {
  hold: (ms?: number) => void;
  external: (value: T) => void;
  dispose: () => void;
}

/** Applies hass values unless the user is mid-interaction: while held (or settling after a send) the latest one is deferred. */
export function createSyncGate<T>(apply: (value: T) => void, settleMs = 800, timers: Timers = realTimers): SyncGate<T> {
  let holdUntil = -Infinity;
  let latest: { value: T } | undefined;
  let timer: unknown;

  const clearTimer = () => {
    if (timer !== undefined) timers.clearTimer(timer);
    timer = undefined;
  };
  const settle = () => {
    clearTimer();
    if (!latest) return;
    const wait = holdUntil - timers.now();
    if (wait === Infinity) return;
    if (wait > 0) {
      timer = timers.setTimer(settle, wait);
      return;
    }
    const { value } = latest;
    latest = undefined;
    apply(value);
  };

  return {
    hold(ms = settleMs) {
      holdUntil = ms === Infinity ? Infinity : timers.now() + ms;
      settle();
    },
    external(value) {
      latest = { value };
      settle();
    },
    dispose: clearTimer,
  };
}

export const LONG_PRESS_MS = 500;
export const LONG_PRESS_TOLERANCE_PX = 10;

export interface LongPress {
  down: (x: number, y: number) => void;
  move: (x: number, y: number) => void;
  up: () => boolean;
  cancel: () => void;
}

/** Fires onLongPress after the delay unless the pointer moves past the tolerance or lifts first. up() reports whether it fired. */
export function createLongPress(
  onLongPress: () => void,
  delayMs = LONG_PRESS_MS,
  tolerancePx = LONG_PRESS_TOLERANCE_PX,
  timers: Timers = realTimers
): LongPress {
  let timer: unknown;
  let origin = { x: 0, y: 0 };
  let fired = false;

  const stop = () => {
    if (timer !== undefined) timers.clearTimer(timer);
    timer = undefined;
  };

  return {
    down(x, y) {
      stop();
      fired = false;
      origin = { x, y };
      timer = timers.setTimer(() => {
        timer = undefined;
        fired = true;
        onLongPress();
      }, delayMs);
    },
    move(x, y) {
      if (timer !== undefined && Math.hypot(x - origin.x, y - origin.y) > tolerancePx) stop();
    },
    up() {
      stop();
      const wasFired = fired;
      fired = false;
      return wasFired;
    },
    cancel() {
      stop();
      fired = false;
    },
  };
}
