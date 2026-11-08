import type { EnergyPrefs } from './energy/types';

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

export function splitSources(prefs: EnergyPrefs, showGas: boolean) {
  const sources = prefs.energy_sources ?? [];
  const ofType = (type: string) => sources.filter((s) => s.type === type);
  return { grid: ofType('grid'), solar: ofType('solar'), battery: ofType('battery'), gas: showGas ? ofType('gas') : [] };
}

// Grid consumption/return/cost can be represented either as a `flow_from`/`flow_to`
// array on a single source (older/manually-authored configs), or as separate
// `stat_energy_from`/`stat_energy_to`/`stat_cost` fields on each of several
// independent grid-type sources (what the current HA UI produces for multi-tariff
// meters, e.g. day/night). Support both, across all grid sources, not just the first.
export function getGridFromEntities(gridSources: any[]): string[] {
  const result: string[] = [];
  for (const source of gridSources) {
    if (source.flow_from?.length) {
      result.push(...source.flow_from.map((f: any) => f.stat_energy_from));
    } else if (source.stat_energy_from) {
      result.push(source.stat_energy_from);
    }
  }
  return result;
}

export function getGridToEntities(gridSources: any[]): string[] {
  const result: string[] = [];
  for (const source of gridSources) {
    if (source.flow_to?.length) {
      result.push(...source.flow_to.map((f: any) => f.stat_energy_to));
    } else if (source.stat_energy_to) {
      result.push(source.stat_energy_to);
    }
  }
  return result;
}

export function getGridCostEntities(gridSources: any[]): string[] {
  const result: string[] = [];
  for (const source of gridSources) {
    if (source.flow_from?.length) {
      result.push(...source.flow_from.map((f: any) => f.stat_cost).filter(Boolean));
    } else if (source.stat_cost) {
      result.push(source.stat_cost);
    }
  }
  return result;
}

export function getSourceFromEntities(source: any): string[] {
  if (source.flow_from?.length) return source.flow_from.map((f: any) => f.stat_energy_from);
  if (source.stat_energy_from) return [source.stat_energy_from];
  return [];
}

// Grid sources without an explicit cost stat (common for UI-configured multi-tariff
// meters) fall back to consumption * number_energy_price, computed per-source since
// each tariff can have a different price.
export function computeGridCostTotal(gridSources: any[], currentStats: any): number | null {
  let total = 0;
  let found = false;

  for (const source of gridSources) {
    const costIds: string[] = source.flow_from?.length
      ? source.flow_from.map((f: any) => f.stat_cost).filter(Boolean)
      : source.stat_cost
        ? [source.stat_cost]
        : [];

    if (costIds.length) {
      const cost = sumStats(currentStats, costIds);
      if (cost !== null) {
        total += cost;
        found = true;
      }
      continue;
    }

    if (source.number_energy_price) {
      const consumption = sumStats(currentStats, getSourceFromEntities(source));
      if (consumption !== null) {
        total += consumption * source.number_energy_price;
        found = true;
      }
    }
  }

  return found ? total : null;
}

export function computeGasCost(gasSources: any[], includedIds: string[], stats: any): number | null {
  let total = 0;
  let found = false;
  for (const source of gasSources) {
    if (!includedIds.includes(source.stat_energy_from)) continue;
    let cost = source.stat_cost ? sumStats(stats, [source.stat_cost]) : null;
    if (cost === null && source.number_energy_price) {
      const used = sumStats(stats, [source.stat_energy_from]);
      if (used !== null) cost = used * source.number_energy_price;
    }
    if (cost !== null) {
      total += cost;
      found = true;
    }
  }
  return found ? total : null;
}
