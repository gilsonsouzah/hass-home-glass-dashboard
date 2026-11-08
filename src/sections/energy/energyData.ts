import type { CustomizationManager } from '../../utils/CustomizationManager';
import {
  averageSoc, buildBars, gasTotal, getStartDateForPeriod, powerCandidates, previousRange, selfSufficiency, socCandidates, statIds, sumPower, sumStats,
  type Period,
} from '../energyCalc';
import {
  computeGasCost, computeGridCostTotal, getGridCostEntities, getGridFromEntities, getGridToEntities, splitSources,
} from './energySources';
import type { DeviceConsumption, EnergyData, EnergyPrefs, FullEnergyData } from './types';

const CACHE_TTL = 5 * 60 * 1000;
let prefsCache: { data: EnergyPrefs; timestamp: number } | null = null;
let prefsInflight: Promise<EnergyPrefs | null> | null = null;
let cachedGridEntityIds: string[] | null = null;
const periodStatsCache = new Map<string, { data: any; timestamp: number }>();

/** Grid import statistic ids from the last successful `energy/get_prefs`, or null until loaded. */
export function getCachedGridEntityIds(): string[] | null {
  return cachedGridEntityIds;
}

export async function fetchEnergyData(hass: any, customizationManager: CustomizationManager): Promise<EnergyData | null> {
  try {
    const prefs = await getEnergyPrefs(hass);
    if (!prefs?.energy_sources?.length) return null;

    const { grid, solar, battery, gas } = splitSources(prefs, await customizationManager.getShowGas());
    if (grid.length === 0) return null;

    const gridFromEntities = getGridFromEntities(grid);
    const solarEntities = statIds(solar, 'stat_energy_from');
    const gasEntities = statIds(gas, 'stat_energy_from');
    const gridGroups = powerCandidates(hass, gridFromEntities);
    const solarGroups = powerCandidates(hass, solarEntities);
    const batteryGroups = statIds(battery, 'stat_energy_from').map((id) => socCandidates(hass, id)).filter((g) => g.length);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lang = hass.locale?.language || hass.language || 'en';
    const [stats, gasUnits] = await Promise.all([
      fetchPeriodStatistics(hass, [...gridFromEntities, ...gasEntities], startOfDay, now, 'hour'),
      fetchStatisticUnits(hass, gasEntities)
    ]);

    const todayTotal = sumStats(stats, gridFromEntities) ?? 0;
    const hourlyData = stats ? buildBars(gridFromEntities.map((id) => stats[id] ?? []), 'day', startOfDay, lang) : [];
    const gasToday = gasTotal(stats, gasEntities, gasUnits, 'm³');

    return {
      currentPower: sumPower(hass, gridGroups),
      todayTotal: todayTotal > 0 ? todayTotal : null,
      hourlyData,
      solarPower: sumPower(hass, solarGroups),
      batteryPercent: averageSoc(hass, batteryGroups),
      gasToday: gasToday.total,
      gasUnit: gasToday.unit,
      hasSolar: solar.length > 0,
      hasBattery: battery.length > 0,
      hasGas: gas.length > 0,
      gridGroups,
      solarGroups,
      batteryGroups
    };
  } catch (err) {
    console.error('EnergySection: Error fetching energy data:', err);
    return null;
  }
}

export async function fetchFullEnergyData(hass: any, period: Period, customizationManager: CustomizationManager): Promise<FullEnergyData | null> {
  try {
    const prefs = await getEnergyPrefs(hass);
    if (!prefs?.energy_sources?.length) return null;

    const showCost = await customizationManager.getShowCost();
    const { grid, solar, battery, gas } = splitSources(prefs, await customizationManager.getShowGas());
    if (grid.length === 0) return null;

    const gridFromEntities = getGridFromEntities(grid);
    const gridToEntities = getGridToEntities(grid);
    const solarEntities = statIds(solar, 'stat_energy_from');
    const batteryFromEntities = statIds(battery, 'stat_energy_from');
    const batteryToEntities = statIds(battery, 'stat_energy_to');
    const gasEntities = statIds(gas, 'stat_energy_from');

    const { start, end, statPeriod } = getStartDateForPeriod(period);
    const { start: prevStart, end: prevEnd } = previousRange(start, end, period);
    const lang = hass.locale?.language || hass.language || 'en';

    const allEntities = [...new Set([
      ...gridFromEntities, ...gridToEntities, ...getGridCostEntities(grid),
      ...solarEntities, ...batteryFromEntities, ...batteryToEntities,
      ...gasEntities, ...statIds(gas, 'stat_cost')
    ])];

    const [currentStats, prevStats, deviceData, gasUnits] = await Promise.all([
      fetchPeriodStatistics(hass, allEntities, start, end, statPeriod),
      fetchPeriodStatistics(hass, [...gridFromEntities, ...gasEntities], prevStart, prevEnd, statPeriod),
      fetchDeviceConsumption(hass, prefs, start, end, statPeriod),
      fetchStatisticUnits(hass, gasEntities)
    ]);

    const barsFor = (ids: string[]) => buildBars(ids.map((id) => currentStats?.[id] ?? []), period, start, lang);

    const periodTotal = sumStats(currentStats, gridFromEntities) ?? 0;
    const previousPeriodTotal = prevStats ? (sumStats(prevStats, gridFromEntities) ?? 0) : null;
    const costTotal = showCost && currentStats ? computeGridCostTotal(grid, currentStats) : null;

    const solarPeriodTotal = sumStats(currentStats, solarEntities);
    const solarPower = solarPeriodTotal !== null ? sumPower(hass, powerCandidates(hass, solarEntities)) : null;

    const batteryGroups = batteryFromEntities.map((id) => socCandidates(hass, id)).filter((g) => g.length);
    const batteryCharged = sumStats(currentStats, batteryToEntities);
    const batteryDischarged = sumStats(currentStats, batteryFromEntities);
    const gridReturn = gridToEntities.length > 0 && currentStats ? (sumStats(currentStats, gridToEntities) ?? 0) : null;

    const selfSufficiencyPct = solarPeriodTotal !== null && solarPeriodTotal > 0
      ? selfSufficiency({
          gridImport: periodTotal,
          solar: solarPeriodTotal,
          gridReturn: gridReturn ?? 0,
          batteryDischarge: batteryDischarged ?? 0,
          batteryCharge: batteryCharged ?? 0
        })
      : null;

    const gasNow = gasTotal(currentStats, gasEntities, gasUnits, 'm³');
    const gasPrevious = gasTotal(prevStats, gasEntities, gasUnits, 'm³');

    return {
      currentPower: sumPower(hass, powerCandidates(hass, gridFromEntities)),
      periodTotal: periodTotal > 0 ? periodTotal : null,
      previousPeriodTotal,
      barData: barsFor(gridFromEntities),
      solarPower,
      solarPeriodTotal,
      solarBarData: solarPeriodTotal !== null ? barsFor(solarEntities) : [],
      batteryPercent: averageSoc(hass, batteryGroups),
      batteryCharged,
      batteryDischarged,
      gridReturn,
      selfSufficiency: selfSufficiencyPct,
      gasPeriodTotal: gasNow.total,
      gasCostTotal: showCost ? computeGasCost(gas, gasNow.ids, currentStats) : null,
      gasPreviousPeriodTotal: gasPrevious.total,
      gasUnit: gasNow.unit,
      hasSolar: solar.length > 0,
      hasBattery: battery.length > 0,
      hasGridReturn: gridToEntities.length > 0,
      hasGas: gas.length > 0,
      devices: deviceData,
      costTotal
    };
  } catch (err) {
    console.error('EnergySection: Error fetching full energy data:', err);
    return null;
  }
}

export async function fetchDeviceConsumption(hass: any, prefs: EnergyPrefs, start: Date, end: Date, period: string): Promise<DeviceConsumption[]> {
  if (!prefs.device_consumption?.length) return [];

  const deviceEntityIds = prefs.device_consumption.map(d => d.stat_consumption);
  const stats = await fetchPeriodStatistics(hass, deviceEntityIds, start, end, period);
  if (!stats) return [];

  let totalConsumption = 0;
  const devices: DeviceConsumption[] = [];

  for (const devicePref of prefs.device_consumption) {
    const entityId = devicePref.stat_consumption;
    const consumption = sumStats(stats, [entityId]);
    if (consumption === null || consumption <= 0) continue;

    totalConsumption += consumption;

    const stateObj = hass.states[entityId];
    const name = stateObj?.attributes?.friendly_name || entityId.split('.').pop() || entityId;

    devices.push({ entityId, name, consumption, percentage: 0 });
  }

  if (totalConsumption > 0) {
    for (const device of devices) {
      device.percentage = (device.consumption / totalConsumption) * 100;
    }
  }

  return devices.sort((a, b) => b.consumption - a.consumption);
}

export async function getEnergyPrefs(hass: any): Promise<EnergyPrefs | null> {
  if (prefsCache && Date.now() - prefsCache.timestamp < CACHE_TTL) return prefsCache.data;
  prefsInflight ??= hass.callWS({ type: 'energy/get_prefs' })
    .then((prefs: EnergyPrefs) => {
      prefsCache = { data: prefs, timestamp: Date.now() };
      const gridEntityIds = getGridFromEntities(prefs?.energy_sources?.filter((s) => s.type === 'grid') || []);
      cachedGridEntityIds = gridEntityIds.length > 0 ? gridEntityIds : null;
      return prefs;
    })
    .catch(() => null)
    .finally(() => { prefsInflight = null; });
  return prefsInflight;
}

export async function fetchPeriodStatistics(hass: any, entityIds: string[], start: Date, end: Date, period: string): Promise<any> {
  if (!entityIds.length) return null;

  const cacheKey = `${period}:${start.getTime()}:${[...entityIds].sort().join(',')}`;
  const cached = periodStatsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const result = await hass.callWS({
      type: 'recorder/statistics_during_period',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      statistic_ids: entityIds,
      period: period,
      types: ['change'],
      units: { energy: 'kWh' }
    });
    periodStatsCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch {
    return null;
  }
}

// Energy-class statistics are requested in kWh above; other classes (gas volume) come back in the entity's unit.
export async function fetchStatisticUnits(hass: any, ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  try {
    const metadata: any[] = await hass.callWS({ type: 'recorder/get_statistics_metadata', statistic_ids: ids });
    const units: Record<string, string> = {};
    for (const m of metadata) {
      const unit = m.unit_class === 'energy'
        ? 'kWh'
        : hass.states[m.statistic_id]?.attributes?.unit_of_measurement || m.statistics_unit_of_measurement;
      if (unit) units[m.statistic_id] = unit;
    }
    return units;
  } catch {
    return {};
  }
}
