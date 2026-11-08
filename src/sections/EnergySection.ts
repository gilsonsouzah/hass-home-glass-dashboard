import { CustomizationManager } from '../utils/CustomizationManager';
import { localize } from '../utils/LocalizationService';
import { averageSoc, powerCandidates, sumPower, type Period } from './energyCalc';
import {
  renderBatteryCard, renderConsumptionChart, renderDeviceBreakdown, renderGasCard, renderGridReturnCard,
  renderSelfSufficiencyCard, renderSolarCard, renderSummaryStats,
} from './energy/energyCards';
import { renderBarChart } from './energy/energyCharts';
import { fetchEnergyData, fetchFullEnergyData, getEnergyPrefs } from './energy/energyData';
import { formatEnergy, formatGas, powerText } from './energy/energyFormat';
import { getTotalPower, hasEnergySensors } from './energy/energyPower';
import { getGridFromEntities } from './energy/energySources';
import { energyHomeStyles } from './energy/energyHomeStyles';
import { energyPageStyles } from './energy/energyPageStyles';
import type { EnergyData } from './energy/types';

interface HomeCardLive {
  data: EnergyData;
  power: HTMLElement;
  solar: HTMLElement | null;
  battery: HTMLElement | null;
}

export class EnergySection {
  private customizationManager: CustomizationManager;
  private selectedPeriod: Period = 'day';
  private currentContainer: HTMLElement | null = null;
  private currentHass: any = null;
  private periodRun = 0;
  private homeLive: HomeCardLive | null = null;
  private pageLive: { groups: string[][]; value: HTMLElement } | null = null;

  static hasEnergySensors = hasEnergySensors;
  static getTotalPower = getTotalPower;

  constructor(customizationManager: CustomizationManager) {
    this.customizationManager = customizationManager;
  }

  async render(container: HTMLElement, hass: any, context: 'home' | 'group' = 'home'): Promise<void> {
    this.currentContainer = container;
    this.currentHass = hass;
    this.homeLive = null;
    this.pageLive = null;

    if (context === 'group') {
      await this.renderFullPage(container, hass);
    } else {
      await this.renderHomeCard(container, hass);
    }
  }

  /** Refreshes live power/battery readings from hass without refetching statistics. */
  update(hass: any): void {
    this.currentHass = hass;
    const home = this.homeLive;
    if (home) {
      const { data } = home;
      setText(home.power, powerText(sumPower(hass, data.gridGroups)));
      if (home.solar) setText(home.solar, `${localize('energy.solar')} ${powerText(sumPower(hass, data.solarGroups))}`);
      if (home.battery) {
        const pct = averageSoc(hass, data.batteryGroups);
        setText(home.battery, `${localize('energy.battery')} ${pct !== null ? `${Math.round(pct)}%` : '--'}`);
      }
    }
    if (this.pageLive) setText(this.pageLive.value, powerText(sumPower(hass, this.pageLive.groups)));
  }


  private async renderHomeCard(container: HTMLElement, hass: any): Promise<void> {
    const energyData = await fetchEnergyData(hass, this.customizationManager);
    if (!energyData || (energyData.currentPower === null && energyData.todayTotal === null && energyData.hourlyData.length === 0)) {
      return;
    }

    this.injectStyles(container);

    const card = document.createElement('div');
    card.className = 'apple-energy-card';
    card.addEventListener('click', () => {
      window.history.pushState(null, '', '/energy');
      window.dispatchEvent(new Event('location-changed', { bubbles: true, composed: true }));
    });

    const header = document.createElement('div');
    header.className = 'energy-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'energy-header-left';
    headerLeft.innerHTML = `<ha-icon icon="mdi:flash" class="energy-icon"></ha-icon><span class="energy-label">${localize('energy.current_usage')}</span>`;

    const headerRight = document.createElement('div');
    headerRight.className = 'energy-header-right';
    headerRight.textContent = localize('energy.today');

    header.appendChild(headerLeft);
    header.appendChild(headerRight);
    card.appendChild(header);

    const values = document.createElement('div');
    values.className = 'energy-values';

    const currentPowerEl = document.createElement('div');
    currentPowerEl.className = 'energy-current-power';
    currentPowerEl.textContent = powerText(energyData.currentPower);

    const todayEl = document.createElement('div');
    todayEl.className = 'energy-today-total';
    todayEl.textContent = energyData.todayTotal !== null ? formatEnergy(energyData.todayTotal) : '--';

    values.appendChild(currentPowerEl);
    values.appendChild(todayEl);
    card.appendChild(values);

    if (energyData.hourlyData.length > 0) {
      const chartContainer = renderBarChart(energyData.hourlyData, 'day');
      card.appendChild(chartContainer);
    }

    let solarSpan: HTMLElement | null = null;
    let batterySpan: HTMLElement | null = null;
    if (energyData.hasSolar || energyData.hasBattery || energyData.hasGas) {
      const extraRow = document.createElement('div');
      extraRow.className = 'energy-extra-row';

      if (energyData.hasSolar) {
        const solarEl = document.createElement('div');
        solarEl.className = 'energy-extra-item';
        solarEl.innerHTML = `
          <div class="energy-extra-main"><ha-icon icon="mdi:solar-power" class="energy-extra-icon solar"></ha-icon><span>${localize('energy.solar')} ${powerText(energyData.solarPower)}</span></div>
        `;
        solarSpan = solarEl.querySelector('span');
        extraRow.appendChild(solarEl);
      }

      if (energyData.hasBattery) {
        const batteryEl = document.createElement('div');
        batteryEl.className = 'energy-extra-item';
        const batteryText = energyData.batteryPercent !== null ? `${Math.round(energyData.batteryPercent)}%` : '--';
        batteryEl.innerHTML = `
          <div class="energy-extra-main"><ha-icon icon="mdi:battery" class="energy-extra-icon battery"></ha-icon><span>${localize('energy.battery')} ${batteryText}</span></div>
        `;
        batterySpan = batteryEl.querySelector('span');
        extraRow.appendChild(batteryEl);
      }

      if (energyData.hasGas) {
        const gasEl = document.createElement('div');
        gasEl.className = 'energy-extra-item';
        const gasText = energyData.gasToday !== null ? formatGas(energyData.gasToday, energyData.gasUnit) : '--';
        gasEl.innerHTML = `
          <div class="energy-extra-main"><ha-icon icon="mdi:fire" class="energy-extra-icon gas"></ha-icon><span>${localize('energy.gas')} ${gasText}</span></div>
        `;
        extraRow.appendChild(gasEl);
      }

      card.appendChild(extraRow);
    }

    container.appendChild(card);
    this.homeLive = { data: energyData, power: currentPowerEl, solar: solarSpan, battery: batterySpan };
  }


  private async renderFullPage(container: HTMLElement, hass: any): Promise<void> {
    this.injectStyles(container);

    const wrapper = document.createElement('div');
    wrapper.className = 'energy-full-page';

    const currentHeader = document.createElement('div');
    currentHeader.className = 'energy-page-current';
    const prefs = await getEnergyPrefs(hass);
    const gridSources = prefs?.energy_sources?.filter((s: any) => s.type === 'grid') || [];
    const gridGroups = powerCandidates(hass, getGridFromEntities(gridSources));

    currentHeader.innerHTML = `
      <div class="energy-page-current-left">
        <ha-icon icon="mdi:flash" class="energy-page-icon"></ha-icon>
        <span class="energy-page-current-label">${localize('energy.current_usage')}</span>
      </div>
      <div class="energy-page-current-value">${powerText(sumPower(hass, gridGroups))}</div>
    `;
    this.pageLive = { groups: gridGroups, value: currentHeader.querySelector('.energy-page-current-value') as HTMLElement };
    wrapper.appendChild(currentHeader);

    this.renderPeriodSelector(wrapper);

    const dynamicArea = document.createElement('div');
    dynamicArea.className = 'energy-dynamic-area';
    wrapper.appendChild(dynamicArea);

    container.appendChild(wrapper);

    await this.updateDynamicContent(dynamicArea, hass);
  }

  private renderPeriodSelector(parent: HTMLElement): void {
    const selector = document.createElement('div');
    selector.className = 'energy-period-selector';

    const periods: Period[] = ['day', 'week', 'month'];
    for (const period of periods) {
      const btn = document.createElement('button');
      btn.className = `energy-period-btn${period === this.selectedPeriod ? ' active' : ''}`;
      btn.textContent = localize(`energy.${period}`);
      btn.addEventListener('click', () => {
        if (period === this.selectedPeriod) return;
        this.selectedPeriod = period;
        selector.querySelectorAll('.energy-period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.handlePeriodChange();
      });
      selector.appendChild(btn);
    }

    parent.appendChild(selector);
  }

  private async handlePeriodChange(): Promise<void> {
    if (!this.currentContainer || !this.currentHass) return;
    const dynamicArea = this.currentContainer.querySelector('.energy-dynamic-area') as HTMLElement;
    if (!dynamicArea) return;

    const run = ++this.periodRun;
    dynamicArea.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 200));
    if (run !== this.periodRun) return;

    await this.updateDynamicContent(dynamicArea, this.currentHass, run);
    if (run !== this.periodRun) return;

    requestAnimationFrame(() => {
      dynamicArea.style.opacity = '1';
    });
  }

  private async updateDynamicContent(dynamicArea: HTMLElement, hass: any, run = this.periodRun): Promise<void> {
    const data = await fetchFullEnergyData(hass, this.selectedPeriod, this.customizationManager);
    if (run !== this.periodRun) return;
    dynamicArea.innerHTML = '';
    if (!data) {
      dynamicArea.innerHTML = `<div class="energy-no-data">${localize('energy.no_data')}</div>`;
      return;
    }

    renderSummaryStats(dynamicArea, data, hass);

    if (data.barData.length > 0) {
      renderConsumptionChart(dynamicArea, data.barData, this.selectedPeriod);
    }

    const hasFlowCards = data.hasSolar || data.hasBattery || data.hasGridReturn || data.hasGas;
    if (hasFlowCards) {
      const flowGrid = document.createElement('div');
      flowGrid.className = 'energy-flow-grid';

      if (data.hasSolar) {
        renderSolarCard(flowGrid, data);
      }
      if (data.hasBattery) {
        renderBatteryCard(flowGrid, data);
      }
      if (data.hasGridReturn) {
        renderGridReturnCard(flowGrid, data);
      }
      if (data.hasGas) {
        renderGasCard(flowGrid, data, hass);
      }
      if (data.hasSolar && data.selfSufficiency !== null) {
        renderSelfSufficiencyCard(flowGrid, data.selfSufficiency);
      }

      dynamicArea.appendChild(flowGrid);
    }

    if (data.devices.length > 0) {
      renderDeviceBreakdown(dynamicArea, data.devices);
    }
  }

  private injectStyles(container: HTMLElement): void {
    const shadowRoot = container.getRootNode() as ShadowRoot;
    if (!shadowRoot || !(shadowRoot instanceof ShadowRoot)) return;
    if (shadowRoot.querySelector('#apple-energy-section-styles')) return;

    const style = document.createElement('style');
    style.id = 'apple-energy-section-styles';
    style.textContent = energyHomeStyles + energyPageStyles;
    shadowRoot.appendChild(style);
  }
}

function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}
