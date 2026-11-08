export function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Mode used to turn a climate on: the last active mode, else the first non-off entry of hvac_modes. */
export function pickHvacOnMode(lastMode: string | undefined, hvacModes: unknown): string | null {
  const modes = Array.isArray(hvacModes) ? hvacModes.filter((m): m is string => typeof m === 'string') : [];
  if (lastMode && lastMode !== 'off' && (modes.length === 0 || modes.includes(lastMode))) return lastMode;
  return modes.find((m) => m !== 'off') ?? null;
}

/** Next target temperature, clamped and rounded to the precision of `step` (avoids 22.200000000000003). */
export function stepTemperature(current: number, delta: number, step: unknown, min: unknown, max: unknown): number {
  const stepValue = asNumber(step) || 1;
  const decimals = (String(stepValue).split('.')[1] ?? '').length;
  const next = current + delta * stepValue;
  const clamped = Math.min(asNumber(max) ?? 35, Math.max(asNumber(min) ?? 7, next));
  return Number(clamped.toFixed(decimals));
}

export interface CodeFormat {
  numeric: boolean;
  /** Fixed code length, or null when any length is accepted. */
  length: number | null;
  pattern: RegExp | null;
}

const DIGIT = String.raw`(?:\\d|\[0-9\])`;
const NUMERIC_PATTERN = new RegExp(`^\\^?${DIGIT}(?:[+*]|\\{(\\d+)\\})?\\$?$`);

/** Interprets a lock `code_format` (a regex string; HA integrations also send "number"/"text"). */
export function parseCodeFormat(codeFormat: unknown): CodeFormat {
  const raw = typeof codeFormat === 'string' ? codeFormat : '';
  let pattern: RegExp | null = null;
  try {
    pattern = raw && raw !== 'number' && raw !== 'text' ? new RegExp(`^(?:${raw})`) : null;
  } catch {
    pattern = null;
  }
  if (raw === 'number') return { numeric: true, length: null, pattern };
  const match = NUMERIC_PATTERN.exec(raw);
  if (!match) return { numeric: false, length: null, pattern };
  return { numeric: true, length: match[1] ? Number(match[1]) : null, pattern };
}
