import type { BarData } from '../energyCalc';

export interface EnergyPrefs {
  energy_sources?: Array<{
    type: string;
    stat_energy_from?: string;
    stat_energy_to?: string;
    stat_compensation?: string;
    stat_cost?: string;
    entity_energy_from?: string;
    entity_energy_to?: string;
    entity_energy_price?: string;
    number_energy_price?: number;
    flow_from?: Array<{ stat_energy_from: string; stat_cost?: string }>;
    flow_to?: Array<{ stat_energy_to: string; stat_compensation?: string }>;
    stat_energy_price?: string;
    config_entry_solar_forecast?: string[];
  }>;
  device_consumption?: Array<{ stat_consumption: string }>;
}

export interface EnergyData {
  currentPower: number | null;
  todayTotal: number | null;
  hourlyData: BarData[];
  solarPower: number | null;
  batteryPercent: number | null;
  gasToday: number | null;
  gasUnit: string;
  hasSolar: boolean;
  hasBattery: boolean;
  hasGas: boolean;
  gridGroups: string[][];
  solarGroups: string[][];
  batteryGroups: string[][];
}

export interface FullEnergyData {
  currentPower: number | null;
  periodTotal: number | null;
  previousPeriodTotal: number | null;
  barData: BarData[];
  solarPower: number | null;
  solarPeriodTotal: number | null;
  solarBarData: BarData[];
  batteryPercent: number | null;
  batteryCharged: number | null;
  batteryDischarged: number | null;
  gridReturn: number | null;
  selfSufficiency: number | null;
  gasPeriodTotal: number | null;
  gasCostTotal: number | null;
  gasPreviousPeriodTotal: number | null;
  gasUnit: string;
  hasSolar: boolean;
  hasBattery: boolean;
  hasGridReturn: boolean;
  hasGas: boolean;
  devices: DeviceConsumption[];
  costTotal: number | null;
}

export interface DeviceConsumption {
  entityId: string;
  name: string;
  consumption: number;
  percentage: number;
}
