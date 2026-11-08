import { localize } from '../../utils/LocalizationService';
import { escapeHtml } from '../../utils/html';
import type { BarData, Period } from '../energyCalc';
import { renderBarChart, renderMiniBarChart } from './energyCharts';
import { formatCost, formatEnergy, formatGas, formatPower } from './energyFormat';
import type { DeviceConsumption, FullEnergyData } from './types';

export function renderSummaryStats(parent: HTMLElement, data: FullEnergyData, hass: any): void {
  const stats = document.createElement('div');
  stats.className = 'energy-summary-stats';

  const totalStat = document.createElement('div');
  totalStat.className = 'energy-stat hg-glass';
  totalStat.innerHTML = `
    <div class="energy-stat-label">${localize('energy.total_consumption')}</div>
    <div class="energy-stat-value">${data.periodTotal !== null ? formatEnergy(data.periodTotal) : '--'}</div>
  `;
  stats.appendChild(totalStat);

  if (data.costTotal !== null) {
    const costStat = document.createElement('div');
    costStat.className = 'energy-stat hg-glass';
    costStat.innerHTML = `
      <div class="energy-stat-label">${localize('energy.cost')}</div>
      <div class="energy-stat-value">${formatCost(hass, data.costTotal)}</div>
    `;
    stats.appendChild(costStat);
  }

  if (data.previousPeriodTotal !== null && data.periodTotal !== null && data.previousPeriodTotal > 0) {
    const diff = ((data.periodTotal - data.previousPeriodTotal) / data.previousPeriodTotal) * 100;
    const sign = diff >= 0 ? '+' : '';
    const color = diff <= 0 ? 'var(--hg-color-green)' : 'var(--hg-color-red)';
    const compStat = document.createElement('div');
    compStat.className = 'energy-stat hg-glass';
    compStat.innerHTML = `
      <div class="energy-stat-label">${localize('energy.vs_previous')}</div>
      <div class="energy-stat-value" style="color: ${color}">${sign}${diff.toFixed(0)}%</div>
    `;
    stats.appendChild(compStat);
  }

  parent.appendChild(stats);
}

export function renderConsumptionChart(parent: HTMLElement, barData: BarData[], period: Period): void {
  const section = document.createElement('div');
  section.className = 'energy-chart-section hg-glass';

  const chart = renderBarChart(barData, period);
  section.appendChild(chart);

  parent.appendChild(section);
}

export function renderSolarCard(parent: HTMLElement, data: FullEnergyData): void {
  const card = document.createElement('div');
  card.className = 'energy-flow-card hg-glass';

  const solarPowerText = data.solarPower !== null ? formatPower(data.solarPower) : '--';
  const solarTotalText = data.solarPeriodTotal !== null ? formatEnergy(data.solarPeriodTotal) : '--';

  card.innerHTML = `
    <div class="flow-card-header">
      <ha-icon icon="mdi:solar-power" class="flow-card-icon solar"></ha-icon>
      <span class="flow-card-title">${localize('energy.solar_production')}</span>
    </div>
    <div class="flow-card-values">
      <div class="flow-card-primary">${solarPowerText}</div>
      <div class="flow-card-secondary">${solarTotalText}</div>
    </div>
  `;

  if (data.solarBarData.length > 0) {
    const miniChart = renderMiniBarChart(data.solarBarData, 'var(--hg-color-yellow)');
    card.appendChild(miniChart);
  }

  parent.appendChild(card);
}

export function renderBatteryCard(parent: HTMLElement, data: FullEnergyData): void {
  const card = document.createElement('div');
  card.className = 'energy-flow-card hg-glass';

  const pct = data.batteryPercent !== null ? Math.round(data.batteryPercent) : null;
  const chargedText = data.batteryCharged !== null ? formatEnergy(data.batteryCharged) : '--';
  const dischargedText = data.batteryDischarged !== null ? formatEnergy(data.batteryDischarged) : '--';

  card.innerHTML = `
    <div class="flow-card-header">
      <ha-icon icon="mdi:battery" class="flow-card-icon battery"></ha-icon>
      <span class="flow-card-title">${localize('energy.battery_status')}</span>
    </div>
    <div class="flow-card-values">
      <div class="flow-card-primary">${pct !== null ? `${pct}%` : '--'}</div>
    </div>
    <div class="battery-bar-container">
      <div class="battery-bar-fill" style="width: ${pct ?? 0}%"></div>
    </div>
    <div class="battery-charge-stats">
      <span>${localize('energy.charged')}: ${chargedText}</span>
      <span>${localize('energy.discharged')}: ${dischargedText}</span>
    </div>
  `;

  parent.appendChild(card);
}

export function renderGridReturnCard(parent: HTMLElement, data: FullEnergyData): void {
  const card = document.createElement('div');
  card.className = 'energy-flow-card hg-glass';

  card.innerHTML = `
    <div class="flow-card-header">
      <ha-icon icon="mdi:transmission-tower-export" class="flow-card-icon grid-return"></ha-icon>
      <span class="flow-card-title">${localize('energy.returned_to_grid')}</span>
    </div>
    <div class="flow-card-values">
      <div class="flow-card-primary">${data.gridReturn !== null ? formatEnergy(data.gridReturn) : '--'}</div>
    </div>
  `;

  parent.appendChild(card);
}

export function renderGasCard(parent: HTMLElement, data: FullEnergyData, hass: any): void {
  const card = document.createElement('div');
  card.className = 'energy-flow-card hg-glass';

  const gasTotalText = data.gasPeriodTotal !== null ? formatGas(data.gasPeriodTotal, data.gasUnit) : '--';

  let vsPreviousHtml = '';
  if (data.gasPreviousPeriodTotal !== null && data.gasPeriodTotal !== null && data.gasPreviousPeriodTotal > 0) {
    const diff = ((data.gasPeriodTotal - data.gasPreviousPeriodTotal) / data.gasPreviousPeriodTotal) * 100;
    const sign = diff >= 0 ? '+' : '';
    const color = diff <= 0 ? 'var(--hg-color-green)' : 'var(--hg-color-red)';
    vsPreviousHtml = `<div class="flow-card-vs-previous" style="color: ${color}">${sign}${diff.toFixed(0)}% ${localize('energy.vs_previous')}</div>`;
  }

  card.innerHTML = `
    <div class="flow-card-header">
      <ha-icon icon="mdi:fire" class="flow-card-icon gas"></ha-icon>
      <span class="flow-card-title">${localize('energy.gas_consumption')}</span>
    </div>
    <div class="flow-card-values">
      <div class="flow-card-primary">${gasTotalText}</div>
      ${data.gasCostTotal !== null ? `<div class="flow-card-secondary">${formatCost(hass, data.gasCostTotal)}</div>` : ''}
    </div>
    ${vsPreviousHtml}
  `;

  parent.appendChild(card);
}

export function renderSelfSufficiencyCard(parent: HTMLElement, pct: number): void {
  const card = document.createElement('div');
  card.className = 'energy-flow-card self-sufficiency hg-glass';

  const roundedPct = Math.round(pct);
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (circumference * roundedPct / 100);

  card.innerHTML = `
    <div class="flow-card-header">
      <ha-icon icon="mdi:circle-half-full" class="flow-card-icon sufficiency"></ha-icon>
      <span class="flow-card-title">${localize('energy.self_sufficiency')}</span>
    </div>
    <div class="self-sufficiency-ring">
      <svg viewBox="0 0 80 80" class="sufficiency-svg">
        <circle class="sufficiency-track" cx="40" cy="40" r="36" fill="none" stroke-width="5"/>
        <circle class="sufficiency-arc" cx="40" cy="40" r="36" fill="none" stroke-width="5"
          stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
          stroke-linecap="round" transform="rotate(-90 40 40)"/>
      </svg>
      <div class="sufficiency-pct">${roundedPct}%</div>
    </div>
  `;

  parent.appendChild(card);
}

export function renderDeviceBreakdown(parent: HTMLElement, devices: DeviceConsumption[]): void {
  const section = document.createElement('div');
  section.className = 'energy-devices-section hg-glass';

  const title = document.createElement('div');
  title.className = 'energy-devices-title';
  title.textContent = localize('energy.devices');
  section.appendChild(title);

  for (const device of devices) {
    const row = document.createElement('div');
    row.className = 'energy-device-row';

    row.innerHTML = `
      <div class="device-row-info">
        <span class="device-row-name">${escapeHtml(device.name)}</span>
        <span class="device-row-value">${formatEnergy(device.consumption)}</span>
      </div>
      <div class="device-row-bar-container">
        <div class="device-row-bar-fill" style="width: ${device.percentage}%"></div>
      </div>
      <div class="device-row-pct">${Math.round(device.percentage)}%</div>
    `;

    section.appendChild(row);
  }

  parent.appendChild(section);
}
