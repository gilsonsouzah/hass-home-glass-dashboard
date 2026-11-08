import { formatPower } from '../chipStatus';

export { formatPower };

export function powerText(watts: number | null): string {
  return watts !== null ? formatPower(watts) : '--';
}

export function formatEnergy(kwh: number): string {
  return `${kwh.toFixed(1)} kWh`;
}

export function formatCost(hass: any, cost: number): string {
  const currency = hass?.config?.currency;
  const lang = hass?.locale?.language || hass?.language || 'en';
  if (currency) {
    try {
      return new Intl.NumberFormat(lang, { style: 'currency', currency }).format(cost);
    } catch {
      // invalid currency code: use the plain format below
    }
  }
  return `$${cost.toFixed(2)}`;
}

export function formatGas(value: number, unit: string): string {
  return `${value.toFixed(1)} ${unit}`;
}
