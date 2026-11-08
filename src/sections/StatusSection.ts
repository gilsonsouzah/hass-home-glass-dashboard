import { CustomizationManager } from '../utils/CustomizationManager';
import { CardManager } from '../utils/CardManager';
import { Entity, CardConfig } from '../types/types';
import { DashboardConfig } from '../config/DashboardConfig';
import { localize } from '../utils/LocalizationService';
import { liquidGlassCSS, LiquidGlassClasses } from '../utils/LiquidGlassStyles';
import { escapeHtml } from '../utils/html';
import { summarizeSecurity } from './chipStatus';

export interface StatusData {
  domain: string;
  icon: string;
  label: string;
  value: string;
  entityIds: string[];
  isVisible: boolean;
}

export class StatusSection {
  private cardManager?: CardManager;
  private _hass?: any;
  private statusItems: StatusData[] = [];
  private _entities?: Entity[];
  private _container?: HTMLElement;
  private statusSection?: HTMLElement;
  private modalCards: HTMLElement[] = [];

  constructor(customizationManager: CustomizationManager, cardManager?: CardManager) {
    this.cardManager = cardManager || new CardManager(customizationManager);
  }

  set hass(hass: any) {
    this._hass = hass;
    if (this._container && this._entities) {
      this.updateStatus(this._entities, hass);
    }
    this.modalCards.forEach((card) => ((card as any).hass = hass));
  }

  /**
   * Render status section for a specific area or group.
   * ponytail: `_areaId` is unused; RoomPage/GroupPage still pass it, drop it there first.
   */
  async render(container: HTMLElement, entities: Entity[], hass: any, _areaId?: string): Promise<void> {
    this._hass = hass;
    this._entities = entities;
    this._container = container;

    // The wrapper exists even with no visible chip so a chip that appears later has a place to go.
    this.statusSection = document.createElement('div');
    this.statusSection.className = 'apple-status-section';
    container.appendChild(this.statusSection);

    this.statusItems = this.generateStatusData(entities, hass);
    this.fillStatusSection();
  }

  private fillStatusSection(): void {
    const section = this.statusSection;
    if (!section) return;

    const visibleItems = this.statusItems.filter((item) => item.isVisible);
    section.hidden = visibleItems.length === 0;
    section.innerHTML = visibleItems.length > 0 ? this.generateHTML(visibleItems) : '';
    this.attachEventListeners(section);
  }

  /**
   * Patch chip values in place; rebuild only when the set of visible chips changes.
   */
  private updateStatus(entities: Entity[], hass: any): void {
    const section = this.statusSection;
    if (!section?.isConnected) return;

    const visibleDomains = (items: StatusData[]) =>
      items
        .filter((item) => item.isVisible)
        .map((item) => item.domain)
        .join();
    const newStatusItems = this.generateStatusData(entities, hass);
    const setChanged = visibleDomains(newStatusItems) !== visibleDomains(this.statusItems);
    this.statusItems = newStatusItems;

    if (setChanged) {
      this.fillStatusSection();
      return;
    }

    newStatusItems
      .filter((item) => item.isVisible)
      .forEach((item) => {
        const chipElement = section.querySelector(`[data-domain="${item.domain}"]`);
        const valueElement = chipElement?.querySelector('.status-chip-value');
        if (valueElement && valueElement.textContent !== item.value) valueElement.textContent = item.value;
        chipElement?.setAttribute('data-entity-ids', item.entityIds.join(','));
      });
  }

  private generateStatusData(entities: Entity[], hass: any): StatusData[] {
    const statusMap = new Map<string, StatusData>();

    // Initialize all possible status types
    const statusTypes = [
      { domain: 'lights', icon: 'mdi:lightbulb', label: localize('status_section.lights') },
      { domain: 'switches', icon: 'mdi:toggle-switch', label: localize('status_section.switches') },
      { domain: 'outlets', icon: 'mdi:power-socket', label: localize('status_section.outlets') },
      { domain: 'temperature', icon: 'mdi:thermometer', label: localize('status_section.temperature') },
      { domain: 'humidity', icon: 'mdi:water-percent', label: localize('status_section.humidity') },
      { domain: 'covers', icon: 'mdi:blinds-horizontal', label: localize('status_section.blinds') },
      { domain: 'gates', icon: 'mdi:garage-variant', label: localize('status_section.garage_doors') },
      { domain: 'security', icon: 'mdi:shield-check', label: localize('status_section.security') },
      { domain: 'locks', icon: 'mdi:lock', label: localize('status_section.locks') },
      { domain: 'motion', icon: 'mdi:motion-sensor', label: localize('status_section.motion') },
      { domain: 'occupancy', icon: 'mdi:account-check', label: localize('status_section.occupancy') },
      { domain: 'light_sensor', icon: 'mdi:brightness-6', label: localize('status_section.light') },
      { domain: 'smoke', icon: 'mdi:smoke-detector', label: localize('status_section.smoke') },
      { domain: 'gas', icon: 'mdi:gas-cylinder', label: localize('status_section.gas') },
      { domain: 'flood', icon: 'mdi:water-alert', label: localize('status_section.flood') },
      { domain: 'battery', icon: 'mdi:battery-low', label: localize('status_section.battery') },
      { domain: 'doors', icon: 'mdi:door', label: localize('status_section.doors') },
      { domain: 'windows', icon: 'mdi:window-open', label: localize('status_section.windows') },
      { domain: 'contact', icon: 'mdi:door-open', label: localize('contact.contact_sensors') },
      { domain: 'tvs', icon: 'mdi:television', label: localize('status_section.tvs') },
      { domain: 'speakers', icon: 'mdi:speaker', label: localize('status_section.speakers') },
    ];

    // Initialize status map
    statusTypes.forEach((type) => {
      statusMap.set(type.domain, {
        domain: type.domain,
        icon: type.icon,
        label: type.label,
        value: '',
        entityIds: [],
        isVisible: false,
      });
    });

    // Process entities and categorize them (including unavailable/unknown entities)
    entities.forEach((entity) => {
      const state = hass.states[entity.entity_id];
      if (!state) return; // Only skip entities with no state object at all

      const entityDomain = entity.entity_id.split('.')[0];
      const deviceClass = state.attributes?.device_class;

      this.categorizeEntity(entity.entity_id, entityDomain, deviceClass, state, statusMap);
    });

    // Calculate status values for each category
    statusTypes.forEach((type) => {
      const status = statusMap.get(type.domain);
      if (status && status.entityIds.length > 0) {
        // Check if there's at least one available entity (not unavailable/unknown)
        const hasAvailableEntities = status.entityIds.some((entityId) => {
          const state = hass.states[entityId];
          return state && state.state !== 'unavailable' && state.state !== 'unknown';
        });

        // Only show status if there are available entities
        if (hasAvailableEntities) {
          status.value = this.calculateStatusValue(type.domain, status.entityIds, hass);
          status.isVisible = true;
        }
      }
    });

    return Array.from(statusMap.values());
  }

  private categorizeEntity(
    entityId: string,
    domain: string,
    deviceClass: string | undefined,
    state: any,
    statusMap: Map<string, StatusData>
  ): void {
    // Lights
    if (domain === 'light') {
      statusMap.get('lights')?.entityIds.push(entityId);
    }

    // Switches and Outlets
    else if (domain === 'switch') {
      // Check if this switch is an outlet
      if (DashboardConfig.isOutlet(entityId, state.attributes)) {
        statusMap.get('outlets')?.entityIds.push(entityId);
      } else {
        statusMap.get('switches')?.entityIds.push(entityId);
      }
    }

    // Temperature sensors
    else if (
      domain === 'sensor' &&
      (deviceClass === 'temperature' ||
        state.attributes?.unit_of_measurement === '°C' ||
        state.attributes?.unit_of_measurement === '°F')
    ) {
      statusMap.get('temperature')?.entityIds.push(entityId);
    }
    else if (domain === 'climate' || domain === 'water_heater') {
      statusMap.get('temperature')?.entityIds.push(entityId);
    }

    // Humidity sensors
    else if (domain === 'sensor' && deviceClass === 'humidity') {
      statusMap.get('humidity')?.entityIds.push(entityId);
    }

    // Covers - separate gates/garage doors from regular covers
    else if (domain === 'cover') {
      if (DashboardConfig.isGarageDoorOrGate(entityId, state.attributes)) {
        statusMap.get('gates')?.entityIds.push(entityId);
      } else {
        statusMap.get('covers')?.entityIds.push(entityId);
      }
    }

    // Security systems
    else if (domain === 'alarm_control_panel') {
      statusMap.get('security')?.entityIds.push(entityId);
    }

    // Locks
    else if (domain === 'lock') {
      statusMap.get('locks')?.entityIds.push(entityId);
    }

    // Motion sensors
    else if (domain === 'binary_sensor' && deviceClass === 'motion') {
      statusMap.get('motion')?.entityIds.push(entityId);
    }

    // Occupancy sensors
    else if (domain === 'binary_sensor' && deviceClass === 'occupancy') {
      statusMap.get('occupancy')?.entityIds.push(entityId);
    }

    // Light sensors (illuminance)
    else if (domain === 'sensor' && (deviceClass === 'illuminance' || state.attributes?.unit_of_measurement === 'lx')) {
      statusMap.get('light_sensor')?.entityIds.push(entityId);
    }

    // Smoke detectors
    else if (domain === 'binary_sensor' && deviceClass === 'smoke') {
      statusMap.get('smoke')?.entityIds.push(entityId);
    }

    // Gas sensors
    else if (domain === 'binary_sensor' && deviceClass === 'gas') {
      statusMap.get('gas')?.entityIds.push(entityId);
    }

    // Flood/moisture sensors
    else if (domain === 'binary_sensor' && (deviceClass === 'moisture' || deviceClass === 'water_leak')) {
      statusMap.get('flood')?.entityIds.push(entityId);
    }

    // Battery sensors (only low battery ones)
    else if (domain === 'sensor' && deviceClass === 'battery' && parseFloat(state.state) < 20) {
      statusMap.get('battery')?.entityIds.push(entityId);
    }

    // Door sensors
    else if (domain === 'binary_sensor' && deviceClass === 'door') {
      statusMap.get('doors')?.entityIds.push(entityId);
    }

    // Window sensors
    else if (domain === 'binary_sensor' && deviceClass === 'window') {
      statusMap.get('windows')?.entityIds.push(entityId);
    }

    // General contact sensors (not doors or windows)
    else if (domain === 'binary_sensor' && deviceClass === 'opening') {
      statusMap.get('contact')?.entityIds.push(entityId);
    }

    // TVs (media players with TV device class)
    else if (domain === 'media_player' && (deviceClass === 'tv' || entityId.includes('tv'))) {
      statusMap.get('tvs')?.entityIds.push(entityId);
    }

    // Speakers (other media players)
    else if (domain === 'media_player') {
      statusMap.get('speakers')?.entityIds.push(entityId);
    }
  }

  private calculateStatusValue(domain: string, entityIds: string[], hass: any): string {
    switch (domain) {
      case 'lights':
      case 'switches':
      case 'outlets':
        return this.calculateOnOffStatus(entityIds, hass);

      case 'temperature':
        return this.calculateTemperatureRange(entityIds, hass);

      case 'humidity':
        return this.calculateHumidityRange(entityIds, hass);

      case 'covers':
      case 'gates':
        return this.calculateCoverStatus(entityIds, hass);

      case 'security':
        return this.calculateSecurityStatus(entityIds, hass);

      case 'locks':
        return this.calculateLockStatus(entityIds, hass);

      case 'motion':
        return this.calculateMotionStatus(entityIds, hass);

      case 'occupancy':
        return this.calculateOccupancyStatus(entityIds, hass);

      case 'light_sensor':
        return this.calculateLightSensorRange(entityIds, hass);

      case 'smoke':
        return this.calculateSmokeStatus(entityIds, hass);

      case 'gas':
        return this.calculateGasStatus(entityIds, hass);

      case 'flood':
        return this.calculateFloodStatus(entityIds, hass);

      case 'battery':
        return entityIds.length === 1
          ? localize('battery.low_battery')
          : localize('battery.low_battery_count').replace('{count}', entityIds.length.toString());

      case 'doors':
      case 'windows':
      case 'contact':
        return this.calculateContactStatus(entityIds, hass);

      case 'tvs':
      case 'speakers':
        return this.calculateMediaStatus(entityIds, hass);

      default:
        return '';
    }
  }

  private calculateOnOffStatus(entityIds: string[], hass: any): string {
    const onCount = entityIds.filter((id) => {
      const state = hass.states[id];
      return state && (state.state === 'on' || state.state === 'playing');
    }).length;

    if (onCount === 0) {
      return localize('lights.all_off');
    } else if (onCount === entityIds.length) {
      return onCount === 1 ? localize('lights.on') : localize('lights.all_on');
    } else {
      return `${onCount} ${localize('lights.on')}`;
    }
  }

  private calculateTemperatureRange(entityIds: string[], hass: any): string {
    const temperatures: number[] = [];

    entityIds.forEach((id) => {
      const state = hass.states[id];
      if (!state) return;

      let temp: number | undefined;

      const domain = id.split('.')[0];
      if (domain === 'climate') {
        temp = state.attributes?.current_temperature;
      } else {
        temp = parseFloat(state.state);
      }

      if (typeof temp === 'number' && !isNaN(temp) && temp > -100 && temp < 200) { // Reasonable temperature range
        temperatures.push(temp);
      }
    });

    if (temperatures.length === 0) return '';
    if (temperatures.length === 1) return `${temperatures[0].toFixed(1)}°`;

    const min = Math.min(...temperatures);
    const max = Math.max(...temperatures);

    if (Math.abs(min - max) < 0.1) {
      // If temperatures are essentially the same
      return `${min.toFixed(1)}°`;
    }

    return `${min.toFixed(1)}°-${max.toFixed(1)}°`;
  }

  private calculateHumidityRange(entityIds: string[], hass: any): string {
    const humidities: number[] = [];

    entityIds.forEach((id) => {
      const state = hass.states[id];
      if (state) {
        const humidity = parseFloat(state.state);
        if (!isNaN(humidity) && humidity >= 0 && humidity <= 100) {
          // Valid humidity range
          humidities.push(Math.round(humidity)); // Round to whole numbers for better display
        }
      }
    });

    if (humidities.length === 0) return '';
    if (humidities.length === 1) return `${humidities[0]}%`;

    const min = Math.min(...humidities);
    const max = Math.max(...humidities);

    if (min === max) {
      // If all humidity values are the same
      return `${min}%`;
    }

    return `${min}%-${max}%`;
  }

  private generateHTML(statusItems: StatusData[]): string {
    return `
      <style>
        .apple-status-section {
          display: block;
          margin-top: 10px;
          width: 100%;
        }

        /* Use same structure as scenes carousel */
        .status-carousel-container {
          overflow-x: auto;
          overflow-y: hidden;
          margin-inline-start: calc(-1 * var(--apple-page-padding, 22px));
          margin-inline-end: calc(-1 * var(--apple-page-padding, 22px));
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .status-carousel-container::-webkit-scrollbar {
          display: none;
        }

        .status-chips-grid {
          display: inline-flex;
          gap: 28px;
          align-items: center;
          padding-inline-start: var(--apple-page-padding, 22px);
          padding-inline-end: var(--apple-page-padding, 22px);
          min-width: 100%;
          box-sizing: border-box;
          height: 48px;
        }

        .status-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
          min-height: 32px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .status-chip-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .status-chip-icon ha-icon {
          width: 20px;
          height: 20px;
          color: white;
        }

        .status-chip-content {
          display: flex;
          flex-direction: column;
          gap: 0px;
        }

        .status-chip-label {
          font-size: var(--apple-chip-name-size, 13px);
          font-weight: 600;
          color: white;
          line-height: 1.2;
          letter-spacing: -0.2px;
        }

        .status-chip-value {
          font-size: var(--apple-chip-status-size, 11px);
          font-weight: 500;
          color: white;
          line-height: 1.2;
          opacity: 0.9;
        }
      </style>
        <div class="status-carousel-container">
          <div class="status-chips-grid">
            ${statusItems
              .map(
                (item) => `
              <div class="status-chip" role="button" tabindex="0" data-domain="${escapeHtml(item.domain)}" data-entity-ids="${escapeHtml(item.entityIds.join(','))}">
                <div class="status-chip-icon">
                  <ha-icon icon="${escapeHtml(item.icon)}"></ha-icon>
                </div>
                <div class="status-chip-content">
                  <span class="status-chip-label">${escapeHtml(item.label)}</span>
                  <span class="status-chip-value">${escapeHtml(item.value)}</span>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
    `;
  }

  private attachEventListeners(statusSection: HTMLElement): void {
    statusSection.querySelectorAll<HTMLElement>('.status-chip').forEach((chip) => {
      const open = () => {
        const item = this.statusItems.find((i) => i.domain === chip.getAttribute('data-domain'));
        if (item) this.handleStatusChipClick(item);
      };
      chip.addEventListener('click', open);
      chip.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        open();
      });
    });
  }

  private calculateCoverStatus(entityIds: string[], hass: any): string {
    const openCount = entityIds.filter((id) => {
      const state = hass.states[id];
      return state && state.state === 'open';
    }).length;

    if (openCount === 0) {
      return localize('covers.all_closed');
    } else if (openCount === entityIds.length) {
      return openCount === 1 ? localize('covers.open') : localize('covers.all_open');
    } else {
      return `${openCount} ${localize('covers.open')}`;
    }
  }

  private calculateSecurityStatus(entityIds: string[], hass: any): string {
    if (entityIds.length === 1) {
      const state = hass.states[entityIds[0]];
      return state?.state?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown';
    }

    const { armed, triggered } = summarizeSecurity(
      entityIds.map((id) => ({ entity_id: id, state: hass.states[id]?.state ?? '' }))
    );
    if (triggered > 0) return `${triggered} ${localize('status.triggered')}`;
    return armed === 0 ? localize('status.disarmed') : `${armed} ${localize('status.armed')}`;
  }

  private calculateLockStatus(entityIds: string[], hass: any): string {
    const unlockedCount = entityIds.filter((id) => {
      const state = hass.states[id];
      return state && state.state === 'unlocked';
    }).length;

    if (unlockedCount === 0) {
      return localize('status_section.all_locked');
    } else if (unlockedCount === entityIds.length) {
      return unlockedCount === 1 ? localize('status.unlocked') : localize('status_section.all_unlocked');
    } else {
      return `${unlockedCount} ${localize('status.unlocked')}`;
    }
  }

  private countOn(entityIds: string[], hass: any): number {
    return entityIds.filter((id) => hass.states[id]?.state === 'on').length;
  }

  private calculateMotionStatus(entityIds: string[], hass: any): string {
    const activeCount = this.countOn(entityIds, hass);

    if (activeCount === 0) {
      return localize('motion.not_detected');
    } else if (activeCount === 1) {
      return localize('motion.detected');
    } else {
      return `${activeCount} ${localize('motion.detected')}`;
    }
  }

  private calculateOccupancyStatus(entityIds: string[], hass: any): string {
    const activeCount = this.countOn(entityIds, hass);

    if (activeCount === 0) {
      return localize('occupancy.not_detected');
    } else if (activeCount === 1) {
      return localize('occupancy.detected');
    } else {
      return `${activeCount} ${localize('occupancy.detected')}`;
    }
  }

  private calculateLightSensorRange(entityIds: string[], hass: any): string {
    const luxValues: number[] = [];

    entityIds.forEach((id) => {
      const state = hass.states[id];
      if (state) {
        const lux = parseFloat(state.state);
        if (!isNaN(lux) && lux >= 0) {
          luxValues.push(Math.round(lux));
        }
      }
    });

    if (luxValues.length === 0) return '';
    if (luxValues.length === 1) return `${luxValues[0]} lx`;

    const min = Math.min(...luxValues);
    const max = Math.max(...luxValues);

    if (min === max) {
      return `${min} lx`;
    }

    return `${min}-${max} lx`;
  }

  private calculateSmokeStatus(entityIds: string[], hass: any): string {
    const detectedCount = this.countOn(entityIds, hass);

    return detectedCount === 0 ? localize('smoke.not_detected') : localize('smoke.detected');
  }

  private calculateGasStatus(entityIds: string[], hass: any): string {
    const detectedCount = this.countOn(entityIds, hass);

    return detectedCount === 0 ? localize('gas.not_detected') : localize('gas.detected');
  }

  private calculateFloodStatus(entityIds: string[], hass: any): string {
    const detectedCount = this.countOn(entityIds, hass);

    return detectedCount === 0 ? localize('flood.not_detected') : localize('flood.detected');
  }

  private calculateContactStatus(entityIds: string[], hass: any): string {
    const openCount = this.countOn(entityIds, hass);

    if (openCount === 0) {
      return localize('contact.all_closed');
    } else if (openCount === 1) {
      return `1 ${localize('covers.open')}`;
    } else {
      return `${openCount} ${localize('covers.open')}`;
    }
  }

  private calculateMediaStatus(entityIds: string[], hass: any): string {
    const playingCount = entityIds.filter((id) => {
      const state = hass.states[id];
      return state && state.state === 'playing';
    }).length;

    if (playingCount > 0) {
      return playingCount === 1 ? localize('media.playing') : `${playingCount} ${localize('media.multiple_playing')}`;
    }

    const onCount = entityIds.filter((id) => {
      const state = hass.states[id];
      return state && !['off', 'unavailable', 'unknown', 'standby'].includes(state.state);
    }).length;

    if (onCount === 0) {
      return localize('lights.all_off');
    } else if (onCount === entityIds.length) {
      return onCount === 1 ? localize('lights.on') : localize('lights.all_on');
    } else {
      return `${onCount} ${localize('lights.on')}`;
    }
  }

  private handleStatusChipClick(statusData: StatusData): void {
    if (statusData.entityIds.length === 1) {
      // Single entity - open native Home Assistant more info
      this.openMoreInfoDialog(statusData.entityIds[0]);
    } else {
      // Multiple entities - open modal with cards
      this.openStatusModal(statusData);
    }
  }

  private openMoreInfoDialog(entityId: string): void {
    if (this._hass) {
      // Create the more-info event
      const event = new CustomEvent('hass-more-info', {
        detail: { entityId },
        bubbles: true,
        composed: true,
      });

      // Try to dispatch from the main Home Assistant app elements
      const targets = [
        document.querySelector('ha-app'),
        document.querySelector('home-assistant'),
        document.querySelector('hui-root'),
        document.querySelector('ha-panel-lovelace'),
      ].filter(Boolean);

      let dispatched = false;
      for (const target of targets) {
        if (target) {
          target.dispatchEvent(event);
          dispatched = true;
          break; // Only need to dispatch from one target
        }
      }

      // Fallback to document body if no Home Assistant elements found
      if (!dispatched) {
        document.body.dispatchEvent(event);
      }
    }
  }

  /** Resolves each entity's area from hass.entities (display registry), falling back to its device. */
  private groupEntitiesByArea(entityIds: string[]): { [areaId: string]: string[] } {
    const entitiesByArea: { [areaId: string]: string[] } = {};

    for (const entityId of entityIds) {
      const entry = this._hass.entities?.[entityId];
      const areaId = entry?.area_id || (entry?.device_id && this._hass.devices?.[entry.device_id]?.area_id);
      if (!areaId) continue;
      (entitiesByArea[areaId] ||= []).push(entityId);
    }

    return entitiesByArea;
  }

  private async openStatusModal(statusData: StatusData): Promise<void> {
    // Create modal backdrop
    const modal = document.createElement('div');
    modal.className = 'status-modal-backdrop';

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'status-modal-content';

    // Modal header
    const header = document.createElement('div');
    header.className = 'status-modal-header';
    header.innerHTML = `
      <button class="modal-close ${LiquidGlassClasses.modalCancel}" aria-label="Close">
        <ha-icon icon="mdi:close"></ha-icon>
      </button>
      <h2>${escapeHtml(statusData.label)}</h2>
    `;

    // Modal body
    const body = document.createElement('div');
    body.className = 'status-modal-body';

    // Group entities by room
    const entitiesByArea = this.groupEntitiesByArea(statusData.entityIds);

    // Create sections for each room
    for (const [roomAreaId, roomEntityIds] of Object.entries(entitiesByArea) as [string, string[]][]) {
      if (roomEntityIds.length === 0) continue;

      const areaName = this._hass.areas?.[roomAreaId]?.name || roomAreaId;

      // Create room title
      const roomTitle = document.createElement('div');
      roomTitle.className = 'status-modal-room-title';
      roomTitle.innerHTML = `<span>${escapeHtml(areaName)}</span>`;
      body.appendChild(roomTitle);

      // Create cards grid for this room
      const cardsGrid = document.createElement('div');
      cardsGrid.className = 'status-modal-cards';
      cardsGrid.dataset.areaId = roomAreaId;

      // Create cards for entities in this room
      for (const entityId of roomEntityIds) {
        const cardConfig = this.createEntityCard(entityId, this._hass);
        if (cardConfig) {
          await this.createAndAppendCard(cardConfig, cardsGrid, this._hass, roomAreaId);

        }
      }

      body.appendChild(cardsGrid);
    }

    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', statusData.label);
    modalContent.appendChild(header);
    modalContent.appendChild(body);
    modal.appendChild(modalContent);

    // Add event listeners
    const closeBtn = header.querySelector('.modal-close');

    // Modal cards live in document.body, outside HomeView's hass fan-out, so the hass setter feeds them.
    const cards = Array.from(modal.querySelectorAll<HTMLElement>('.entity-card-wrapper > *'));
    this.modalCards.push(...cards);
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    const closeModal = () => {
      document.removeEventListener('keydown', onKeydown);
      this.modalCards = this.modalCards.filter((card) => !cards.includes(card));
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    };
    document.addEventListener('keydown', onKeydown);

    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Forward hass-more-info events from cards to main app
    modal.addEventListener('hass-more-info', (e: Event) => {
      e.stopPropagation(); // Stop the event from bubbling further
      const event = e as CustomEvent;

      // Close the modal first
      closeModal();

      // Then dispatch the more-info event to the main app
      setTimeout(() => {
        // Try multiple Home Assistant app selectors
        const targets = [
          document.querySelector('ha-app'),
          document.querySelector('home-assistant'),
          document.querySelector('hui-root'),
          document.querySelector('ha-panel-lovelace'),
        ].filter(Boolean);

        targets.forEach((target) => {
          if (target) {
            const forwardedEvent = new CustomEvent('hass-more-info', {
              detail: event.detail,
              bubbles: true,
              composed: true,
            });
            target.dispatchEvent(forwardedEvent);
          }
        });

        // Also try dispatching from document body as fallback
        if (targets.length === 0) {
          const fallbackEvent = new CustomEvent('hass-more-info', {
            detail: event.detail,
            bubbles: true,
            composed: true,
          });
          document.body.dispatchEvent(fallbackEvent);
        }
      }, 100);
    });

    // Add to DOM and show
    document.body.appendChild(modal);

    // Add styles for modal
    this.addModalStyles();

    // Trigger animation
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });
  }

  private createEntityCard(entityId: string, hass: any): CardConfig | null {
    const state = hass.states[entityId];
    if (!state) {
      return null;
    }

    let friendlyName = state?.attributes?.friendly_name || entityId.split('.')[1].replace(/_/g, ' ');
    const domain = entityId.split('.')[0];

    // Determine card type and properties
    let cardType = 'custom:home-glass-card';
    let isTallCard = false;

    // Check if domain should be tall by default
    if (DashboardConfig.isDefaultTallDomain(domain)) {
      isTallCard = true;
    }

    const card: CardConfig = {
      type: cardType,
      entity: entityId,
      name: friendlyName,
      domain: domain,
      is_tall: isTallCard,
    };

    // Add default icons for entities without icons
    if (!state.attributes?.icon) {
      let defaultIcon = '';

      if (DashboardConfig.isScenesDomain(domain)) {
        defaultIcon = 'mdi:home';
      } else if (domain === 'sensor') {
        // Set default icons based on device class for sensors
        switch (state.attributes?.device_class) {
          case 'temperature':
            defaultIcon = 'mdi:thermometer';
            break;
          case 'humidity':
            defaultIcon = 'mdi:water-percent';
            break;
          case 'illuminance':
            defaultIcon = 'mdi:brightness-6';
            break;
          case 'battery':
            defaultIcon = 'mdi:battery';
            break;
          default:
            defaultIcon = 'mdi:gauge';
        }
      } else if (domain === 'binary_sensor') {
        // Set default icons based on device class for binary sensors
        switch (state.attributes?.device_class) {
          case 'motion':
            defaultIcon = 'mdi:motion-sensor';
            break;
          case 'occupancy':
            defaultIcon = 'mdi:account-check';
            break;
          case 'door':
            defaultIcon = 'mdi:door';
            break;
          case 'window':
            defaultIcon = 'mdi:window-open';
            break;
          case 'contact':
            defaultIcon = 'mdi:door-open';
            break;
          case 'smoke':
            defaultIcon = 'mdi:smoke-detector';
            break;
          case 'gas':
            defaultIcon = 'mdi:gas-cylinder';
            break;
          case 'moisture':
          case 'water_leak':
            defaultIcon = 'mdi:water-alert';
            break;
          default:
            defaultIcon = 'mdi:checkbox-marked-circle';
        }
      }

      if (defaultIcon) {
        (card as any).default_icon = defaultIcon;
      }
    }

    return card;
  }

  private async createAndAppendCard(
    cardConfig: any,
    container: HTMLElement,
    hass: any,
    areaId?: string
  ): Promise<void> {
    try {
      let cardElement: HTMLElement;

      if (cardConfig.type === 'custom:home-glass-card') {
        cardElement = document.createElement('home-glass-card') as HTMLElement;

        // Determine if card should be tall based on customizations
        const shouldBeTall =
          this.cardManager?.shouldCardBeTall(cardConfig.entity, areaId || 'unknown', 'modal') || cardConfig.is_tall;

        const configWithTall = { ...cardConfig, is_tall: shouldBeTall };

        // Add default icon if specified
        if ((cardConfig as any).default_icon) {
          configWithTall.default_icon = (cardConfig as any).default_icon;
        }

        (cardElement as any).setConfig(configWithTall);
        (cardElement as any).hass = hass;
      } else {
        // Handle other card types
        const customCardType = cardConfig.type.replace('custom:', '');
        if (customElements.get(customCardType)) {
          cardElement = document.createElement(customCardType);
          if (cardElement && typeof (cardElement as any).setConfig === 'function') {
            (cardElement as any).setConfig(cardConfig);
            (cardElement as any).hass = hass;
          }
        } else {
          cardElement = document.createElement('div');
          cardElement.innerHTML = `<div style="color: red;">Unknown card type: ${cardConfig.type}</div>`;
        }
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'entity-card-wrapper';
      wrapper.dataset.entityId = cardConfig.entity;

      // Apply tall class if needed
      const shouldBeTall =
        this.cardManager?.shouldCardBeTall(cardConfig.entity, areaId || 'unknown', 'modal') || cardConfig.is_tall;

      if (shouldBeTall) {
        wrapper.classList.add('tall');
      }

      wrapper.appendChild(cardElement);
      container.appendChild(wrapper);
    } catch (error) {
      console.error('Error creating status modal card:', error);
    }
  }

  private addModalStyles(): void {
    if (document.querySelector('#status-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'status-modal-styles';
    style.textContent = `
      .status-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .status-modal-backdrop.show {
        opacity: 1;
      }

      .status-modal-content {
        position: relative;
        width: 800px;
        max-width: 90vw;
        max-height: 80vh;
        background: rgba(28, 28, 30, 1);
        border-radius: var(--apple-modal-radius, 20px);
        overflow-y: auto;
        overflow-x: hidden;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        transform: scale(0.9);
        opacity: 0;
        transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }

      .status-modal-backdrop.show .status-modal-content {
        transform: scale(1);
        opacity: 1;
      }

      /* Liquid Glass Button Styles */
      ${liquidGlassCSS}

      .status-modal-header {
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .status-modal-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: -30px;
        background: linear-gradient(
          to bottom,
          rgba(28, 28, 30, 1) 0%,
          rgba(28, 28, 30, 0.95) 30%,
          rgba(28, 28, 30, 0.7) 60%,
          rgba(28, 28, 30, 0) 100%
        );
        z-index: -1;
        pointer-events: none;
      }

      .status-modal-header h2 {
        margin: 0;
        font-size: 17px;
        font-weight: 600;
        color: white;
        text-align: center;
        flex: 1;
      }

      .status-modal-header .modal-close {
        z-index: 2;
      }

      .status-modal-body {
        padding: 0 20px 20px 20px;
      }

      .status-modal-room-title {
        margin: 0 0 8px 0;
        font-size: 13px;
        font-weight: 400;
        letter-spacing: 0.5px;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
      }

      .status-modal-room-title:first-child {
        margin-top: 0;
      }

      .status-modal-cards {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        grid-auto-rows: var(--apple-card-height, 70px);
        gap: var(--apple-card-gap, 10px);
        auto-rows: min-content;
        margin-bottom: var(--apple-section-gap, 20px);
        /* Enable container queries for modal */
        container-type: inline-size;
      }

      .status-modal-cards:last-child {
        margin-bottom: 0;
      }

      .entity-card-wrapper {
        display: flex;
        flex-direction: column;
        position: relative;
        grid-column: span var(--apple-card-span-desktop, 3);
        border-radius: var(--apple-card-radius, 22px);
        overflow: hidden;
      }

      .entity-card-wrapper.tall {
        grid-row: span 2;
      }

      .entity-card-wrapper home-glass-card {
        width: 100%;
        height: 100%;
        border-radius: var(--apple-card-radius, 22px);
      }

      /* Large modal (1100px+) - 4 columns */
      @container (min-width: 900px) {
        .entity-card-wrapper {
          grid-column: span var(--apple-card-span-desktop, 3);
        }
      }

      /* Medium modal (600px - 899px) - 3 columns */
      @container (min-width: 600px) and (max-width: 899px) {
        .entity-card-wrapper {
          grid-column: span var(--apple-card-span-mobile, 4);
        }
      }

      /* Small modal (400px - 599px) - 2 columns */
      @container (min-width: 400px) and (max-width: 599px) {
        .entity-card-wrapper {
          grid-column: span var(--apple-card-span-small, 6);
        }

        .status-modal-cards {
          grid-auto-rows: 68px;
          gap: 10px;
        }
      }

      /* Extra small modal (< 400px) - single column */
      @container (max-width: 399px) {
        .entity-card-wrapper {
          grid-column: span 12 !important;
        }

        .status-modal-cards {
          grid-auto-rows: 64px;
          gap: 8px;
        }
      }

      /* Fallback media queries for older browsers */
      @media (max-width: 767px) {
        .entity-card-wrapper {
          grid-column: span 6;
        }

        .status-modal-cards {
          grid-auto-rows: 68px;
          gap: 10px;
        }
      }

      @media (max-width: 359px) {
        .entity-card-wrapper {
          grid-column: span 12 !important;
        }

        .status-modal-cards {
          grid-auto-rows: 64px;
        }
      }

      @media (max-width: 768px) {
        .status-modal-content {
          width: 100vw;
          max-width: 100vw;
          height: calc(100dvh - env(safe-area-inset-top) - 20px);
          max-height: calc(100dvh - env(safe-area-inset-top) - 20px);
          border-radius: var(--apple-modal-radius, 20px) var(--apple-modal-radius, 20px) 0 0;
          transform: translateY(100%);
        }

        .status-modal-backdrop.show .status-modal-content {
          transform: translateY(0);
        }
      }
    `;

    document.head.appendChild(style);
  }
}
