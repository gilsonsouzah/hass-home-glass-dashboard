import { sumStats } from '../energyCalc';
import type { EnergyPrefs } from './types';

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
