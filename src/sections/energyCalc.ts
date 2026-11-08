export type Period = 'day' | 'week' | 'month';

export interface BarData {
  label: string;
  value: number;
}

export interface Stat {
  start: number | string;
  change?: number | null;
}

export type StatsById = Record<string, Stat[] | undefined>;

export const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 30 };

const clamp100 = (n: number) => Math.min(100, Math.max(0, n));

/** Sum of `change` over all given ids; null when none of them has data. */
export function sumStats(stats: StatsById | null | undefined, ids: string[]): number | null {
  let total = 0;
  let found = false;
  for (const id of ids) {
    const list = stats?.[id];
    if (!list) continue;
    found = true;
    for (const s of list) total += s.change ?? 0;
  }
  return found ? total : null;
}

/** Share of home consumption not drawn from the grid, in 0..100. */
export function selfSufficiency(parts: {
  gridImport: number;
  solar: number;
  gridReturn: number;
  batteryDischarge: number;
  batteryCharge: number;
}): number | null {
  const consumption = parts.gridImport + parts.solar - parts.gridReturn + parts.batteryDischarge - parts.batteryCharge;
  if (!(consumption > 0)) return null;
  return clamp100((1 - parts.gridImport / consumption) * 100);
}

const shiftDays = (d: Date, days: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() - days, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());

/** The same elapsed window one period earlier, so partial current periods compare like for like. */
export function previousRange(start: Date, end: Date, period: Period): { start: Date; end: Date } {
  const days = PERIOD_DAYS[period];
  return { start: shiftDays(start, days), end: shiftDays(end, days) };
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function bucketKey(d: Date, period: Period): string {
  return period === 'day' ? pad2(d.getHours()) : dateKey(d);
}

/** One bar per hour (day) or per local calendar day (week/month), summing every stats list. */
export function buildBars(statsLists: Stat[][], period: Period, start: Date, lang: string): BarData[] {
  const sums = new Map<string, number>();
  for (const stats of statsLists) {
    for (const s of stats) {
      const key = bucketKey(new Date(s.start), period);
      sums.set(key, (sums.get(key) ?? 0) + (s.change ?? 0));
    }
  }

  if (period === 'day') {
    return Array.from({ length: 24 }, (_, h) => {
      const label = pad2(h);
      return { label, value: sums.get(label) ?? 0 };
    });
  }

  return Array.from({ length: PERIOD_DAYS[period] }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const label = period === 'week' ? d.toLocaleDateString(lang, { weekday: 'short' }) : String(d.getDate());
    return { label, value: sums.get(dateKey(d)) ?? 0 };
  });
}

/** Stat ids of one field across sources, skipping sources without it. */
export function statIds(sources: any[], field: string): string[] {
  return sources.map((s) => s[field]).filter(Boolean);
}

/** Sums the gas ids sharing the first id's unit; sources in other units cannot be added to it. */
export function gasTotal(
  stats: StatsById | null | undefined,
  ids: string[],
  units: Record<string, string>,
  fallbackUnit: string,
): { total: number | null; unit: string; ids: string[] } {
  const unit = (ids[0] && units[ids[0]]) || fallbackUnit;
  const sameUnit = ids.filter((id) => (units[id] || fallbackUnit) === unit);
  return { total: sumStats(stats, sameUnit), unit, ids: sameUnit };
}

function isPowerSensor(state: any): boolean {
  return state?.attributes?.device_class === 'power' && state.attributes.state_class !== undefined;
}

/** Per physical device behind the energy entities: its power sensors in registry order. */
export function powerCandidates(hass: any, energyIds: string[]): string[][] {
  const seenDevices = new Set<string>();
  const groups: string[][] = [];
  for (const energyId of energyIds) {
    const deviceId = hass.entities?.[energyId]?.device_id;
    if (!deviceId || seenDevices.has(deviceId)) continue;
    seenDevices.add(deviceId);
    const sensors = Object.entries<any>(hass.entities)
      .filter(([eid, reg]) => reg.device_id === deviceId && eid !== energyId && isPowerSensor(hass.states?.[eid]))
      .map(([eid]) => eid);
    if (sensors.length) groups.push(sensors);
  }
  return groups;
}

/** First numeric reading per device group, summed. */
export function sumPower(hass: any, groups: string[][]): number | null {
  let total = 0;
  let found = false;
  for (const group of groups) {
    for (const id of group) {
      const value = parseFloat(hass.states?.[id]?.state);
      if (Number.isNaN(value)) continue;
      total += value;
      found = true;
      break;
    }
  }
  return found ? total : null;
}

/** Battery-class sensors on the same device as the battery energy entity. */
export function socCandidates(hass: any, energyId: string): string[] {
  const deviceId = hass.entities?.[energyId]?.device_id;
  if (!deviceId) return [];
  return Object.entries<any>(hass.entities)
    .filter(([eid, reg]) => reg.device_id === deviceId && hass.states?.[eid]?.attributes?.device_class === 'battery')
    .map(([eid]) => eid);
}

/** Mean of the first numeric reading of each battery. */
export function averageSoc(hass: any, groups: string[][]): number | null {
  const values: number[] = [];
  for (const group of groups) {
    for (const id of group) {
      const value = parseFloat(hass.states?.[id]?.state);
      if (Number.isNaN(value)) continue;
      values.push(value);
      break;
    }
  }
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/** Local-midnight based window ending now: today, the last 7 days, or the last 30 days. */
export function getStartDateForPeriod(period: Period, now: Date = new Date()): { start: Date; end: Date; statPeriod: string } {
  const daysBack = period === 'day' ? 0 : period === 'week' ? 6 : 29;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack);
  return { start, end: now, statPeriod: period === 'day' ? 'hour' : 'day' };
}
