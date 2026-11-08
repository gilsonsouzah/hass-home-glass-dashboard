import { DashboardConfig, DeviceGroup } from '../config/DashboardConfig';
import { EntityState } from '../types/types';
import { localize } from '../utils/LocalizationService';
import { RTLHelper } from '../utils/RTLHelper';
import { escapeHtml } from '../utils/html';
import { EnergySection } from './EnergySection';
import { getCachedGridEntityIds, getEnergyPrefs } from './energy/energyData';
import { countLightsOn, formatPower, isWaterEntity, summarizeSecurity } from './chipStatus';
import { navigateToDashboardPath } from './navigation';
import { chipsStyles } from './chips/chipsStyles';

export interface ChipConfig {
  group: DeviceGroup;
  enabled: boolean;
  show_when_zero?: boolean;
  navigation_path?: string;
}

export interface ChipsConfig {
  climate?: ChipConfig;
  lights?: ChipConfig;
  security?: ChipConfig;
  media?: ChipConfig;
  water?: ChipConfig;
  energy?: ChipConfig;
}

export interface ChipData {
  group: DeviceGroup;
  icon: string;
  groupName: string;
  statusText: string;
  iconColor: string;
  backgroundColor: string;
  textColor: string;
  enabled: boolean;
  navigationPath?: string;
}

export class HomeChips {
  private config?: ChipsConfig;
  private _hass?: any;
  private chips: ChipData[] = [];
  private activeGroup?: DeviceGroup;
  private container?: HTMLElement;
  private renderedStructure?: string;
  private editMode: boolean = false;
  private customizationManager?: any;
  private onRenderCallback?: () => void;

  constructor(container: HTMLElement, customizationManager?: any) {
    this.container = container;
    this.customizationManager = customizationManager;
  }

  /**
   * Get hidden sections synchronously from customization manager
   * This ensures we always have the current value without async delay
   */
  private getHiddenSections(): string[] {
    if (!this.customizationManager) return [];
    return this.customizationManager.getHiddenSections() || [];
  }

  /**
   * Get the area ID for an entity, checking both entity registry and device registry
   */
  private getEntityAreaId(entityId: string): string | null {
    if (!this._hass) return null;

    // Check entity registry first
    const entityRegistry = this._hass.entities?.[entityId];
    if (entityRegistry?.area_id) {
      return entityRegistry.area_id;
    }

    // If entity doesn't have an area but has a device, check device's area
    if (entityRegistry?.device_id) {
      const device = this._hass.devices?.[entityRegistry.device_id];
      if (device?.area_id) {
        return device.area_id;
      }
    }

    // No area found - return null (entity will not be rendered)
    return null;
  }

  /**
   * Check if an entity belongs to a hidden area/section
   */
  private isEntityInHiddenArea(entityId: string): boolean {
    const areaId = this.getEntityAreaId(entityId);
    // If entity has no area, it should be hidden
    if (areaId === null) return true;

    const hiddenSections = this.getHiddenSections();
    if (hiddenSections.length === 0) return false;

    return hiddenSections.includes(areaId);
  }

  static getDefaultConfig(): ChipsConfig {
    return {
      climate: {
        group: DeviceGroup.CLIMATE,
        enabled: true,
        show_when_zero: true,
      },
      lights: {
        group: DeviceGroup.LIGHTING,
        enabled: true,
        show_when_zero: true,
      },
      security: {
        group: DeviceGroup.SECURITY,
        enabled: true,
        show_when_zero: true,
      },
      media: {
        group: DeviceGroup.MEDIA,
        enabled: true,
        show_when_zero: true,
      },
      water: {
        group: DeviceGroup.WATER,
        enabled: false,
        show_when_zero: false
      },
      energy: {
        group: DeviceGroup.ENERGY,
        enabled: true,
        show_when_zero: false
      }
    };
  }

  setConfig(config: ChipsConfig) {
    // Merge with default config
    this.config = {
      ...HomeChips.getDefaultConfig(),
      ...config,
    };

    // Trigger render if we have hass
    if (this._hass) {
      this.render();
    }
  }

  set hass(hass: any) {
    // Prevent unnecessary re-renders by comparing relevant entity states
    if (hass && this._hass && this.hasRelevantEntityChanges(hass)) {
      this._hass = hass;

      // Render when hass is set and there are relevant changes
      if (this.config) {
        this.render();
      }
    } else if (!this._hass) {
      // First time setting hass
      this._hass = hass;
      if (this.config) {
        this.render();
      }
    } else {
      // Update hass reference but don't re-render
      this._hass = hass;
    }
  }

  private static readonly RELEVANT_DOMAINS = new Set(['light', 'climate', 'alarm_control_panel', 'lock', 'media_player', 'water_heater']);

  private hasRelevantEntityChanges(newHass: any): boolean {
    if (!this._hass || !this.config) return true;

    // Only check entities whose domain is relevant, skipping the rest
    for (const entityId of Object.keys(newHass.states)) {
      const dotIdx = entityId.indexOf('.');
      const domain = entityId.substring(0, dotIdx);
      const isRelevantDomain = HomeChips.RELEVANT_DOMAINS.has(domain);

      if (!isRelevantDomain) {
        if (domain !== 'binary_sensor' && domain !== 'sensor') continue;
        const attributes = newHass.states[entityId]?.attributes;
        const isPowerEntity = domain === 'sensor' && attributes?.device_class === 'power';
        if (!isWaterEntity(entityId, attributes) && !isPowerEntity) continue;
      }

      const oldEntity = this._hass.states[entityId];
      const newEntity = newHass.states[entityId];

      if (!oldEntity || !newEntity) return true;
      if (oldEntity.state !== newEntity.state) return true;
      if ((domain === 'climate' || domain === 'water_heater') &&
          oldEntity.attributes?.current_temperature !== newEntity.attributes?.current_temperature) {
        return true;
      }
    }

    return false;
  }

  get hass() {
    return this._hass;
  }

  isConfigured(): boolean {
    return !!this.config;
  }

  getConfig(): ChipsConfig | undefined {
    return this.config;
  }

  getActiveGroup(): DeviceGroup | undefined {
    return this.activeGroup;
  }

  setActiveGroup(group: DeviceGroup | undefined) {
    this.activeGroup = group;
    if (this._hass && this.config) {
      this.render();
    }
  }

  setEditMode(editMode: boolean) {
    this.editMode = editMode;
    if (this._hass && this.config) {
      this.render();
    }
  }

  setOnRenderCallback(callback: () => void) {
    this.onRenderCallback = callback;
  }

  applySavedChipsOrder(chips: ChipData[]): ChipData[] {
    if (!this.customizationManager) return chips;

    const savedOrder = this.customizationManager.getSavedChipsOrder();
    if (savedOrder.length === 0) return chips;

    // Create a map for quick lookup
    const chipMap = new Map();
    chips.forEach((chip) => {
      chipMap.set(chip.group, chip);
    });

    // Build ordered array based on saved order
    const orderedChips: ChipData[] = [];
    const usedGroups = new Set();

    // First, add chips in the saved order
    savedOrder.forEach((group: string) => {
      if (chipMap.has(group)) {
        orderedChips.push(chipMap.get(group));
        usedGroups.add(group);
      }
    });

    // Then, add any chips that weren't in the saved order (new groups)
    chips.forEach((chip) => {
      if (!usedGroups.has(chip.group)) {
        orderedChips.push(chip);
      }
    });

    return orderedChips;
  }

  private render() {
    if (!this._hass || !this.config || !this.container) {
      return;
    }

    this.updateChipData();

    // Only render if we have chips to show
    if (this.chips.length === 0) {
      this.container.innerHTML = '';
      this.renderedStructure = '';
      return;
    }

    // Only a change in which chips exist (or how they look) rebuilds the DOM; text and active
    // state are patched in place so the carousel keeps its scroll position.
    const structure = JSON.stringify({
      chips: this.chips.map((c) => [c.group, c.groupName, c.icon, c.navigationPath]),
      editMode: this.editMode,
      rtl: RTLHelper.isRTL(),
    });

    if (this.renderedStructure === structure) {
      this.patchChips();
      return;
    }

    const html = this.generateHTML();

    this.container.innerHTML = html;
    this.attachEventListeners();
    this.renderedStructure = structure;

    // Call the render callback if it exists
    if (this.onRenderCallback) {
      this.onRenderCallback();
    }
  }

  private patchChips() {
    for (const chip of this.chips) {
      const chipElement = this.container?.querySelector(`.chip[data-group="${chip.group}"]`);
      if (!chipElement) continue;
      const status = chipElement.querySelector('.chip-status');
      if (status && status.textContent !== chip.statusText) status.textContent = chip.statusText;
      chipElement.classList.toggle('active', chip.group === this.activeGroup);
    }
  }

  private energyPrefsRequested = false;

  // Fills the grid-sensor cache getTotalPower reads; one request per instance, re-render when it lands.
  private loadEnergyPrefsOnce() {
    if (this.energyPrefsRequested || getCachedGridEntityIds()) return;
    this.energyPrefsRequested = true;
    void getEnergyPrefs(this._hass).then(() => {
      if (getCachedGridEntityIds()) this.render();
    });
  }

  private updateChipData() {
    if (!this._hass || !this.config) return;

    this.chips = [];
    // Filter out hidden, disabled, config/diagnostic entities, and entities from hidden areas
    const allEntities = Object.values(this._hass.states).filter((entity: any) => {
      const entityRegistry = this._hass.entities?.[entity.entity_id];
      if (entityRegistry) {
        // hass.entities is the display registry: it exposes `hidden`, not `hidden_by`/`disabled_by`
        if (entityRegistry.hidden) return false;
        // Exclude configuration and diagnostic entities from chip calculations
        if (entityRegistry.entity_category === 'config' || entityRegistry.entity_category === 'diagnostic') return false;
      }
      // Filter out entities from hidden areas/rooms
      if (this.isEntityInHiddenArea(entity.entity_id)) {
        return false;
      }
      return true;
    }) as EntityState[];

    // For each device group, check if there are entities and create chips accordingly
    const deviceGroups = [
      { group: DeviceGroup.CLIMATE, config: this.config.climate },
      { group: DeviceGroup.LIGHTING, config: this.config.lights },
      { group: DeviceGroup.SECURITY, config: this.config.security },
      { group: DeviceGroup.MEDIA, config: this.config.media },
      { group: DeviceGroup.WATER, config: this.config.water },
      { group: DeviceGroup.ENERGY, config: this.config.energy }
    ];

    for (const { group, config } of deviceGroups) {
      if (!config?.enabled) continue;

      const groupEntities =
        group === DeviceGroup.WATER
          ? allEntities.filter((entity) => isWaterEntity(entity.entity_id, entity.attributes))
          : allEntities.filter(
              (entity) =>
                DashboardConfig.getDeviceGroup(entity.entity_id.split('.')[0], entity.entity_id, entity.attributes) === group
            );

      // Special handling for energy group - detect energy/power sensors
      let shouldShow = groupEntities.length > 0;
      if (group === DeviceGroup.ENERGY) {
        shouldShow = EnergySection.hasEnergySensors(this._hass);
        if (shouldShow) this.loadEnergyPrefsOnce();
      }

      if (shouldShow) {
        const groupStyle = DashboardConfig.getGroupStyle(group);
        const statusText = this.getGroupStatusText(group, groupEntities);

        // Get inactive background color from DashboardConfig
        const inactiveStyle = DashboardConfig.getEntityData(
          { entity_id: 'light.dummy', state: 'off', attributes: {} } as EntityState,
          'light', // Use light domain to get inactive styling
          false
        );

        this.chips.push({
          group: group,
          icon: groupStyle.icon,
          groupName: typeof groupStyle.name === 'function' ? groupStyle.name() : groupStyle.name,
          statusText: statusText,
          iconColor: groupStyle.iconColor, // Always use base iconColor for chips, active state handled in HTML/CSS
          backgroundColor: inactiveStyle.backgroundColor,
          textColor: '#ffffff',
          enabled: config.enabled,
          navigationPath: config.navigation_path || group, // Store just the group name, not absolute path
        });
      }
    }

    // Apply saved chip order
    this.chips = this.applySavedChipsOrder(this.chips);
  }

  private generateHTML(): string {
    // Get the media group's active icon color from DashboardConfig
    const mediaGroupStyle = DashboardConfig.getGroupStyle(DeviceGroup.MEDIA);
    const mediaActiveIconColor = mediaGroupStyle.activeIconColor || mediaGroupStyle.iconColor;

    return `
      <style>${chipsStyles(mediaActiveIconColor)}</style>
      <div class="apple-chips-section">
        <div class="chips-carousel-container ${RTLHelper.isRTL() ? 'rtl' : 'ltr'}">
          <div class="chips-grid" data-area-id="chips" data-section-type="chips">
            ${this.chips
              .map(
                (chip) => `
              <div class="chip-wrapper ${this.editMode ? 'edit-mode' : ''}"
                   data-entity-id="${escapeHtml(chip.group)}"
                   data-chip-id="${escapeHtml(chip.group)}">
                <div class="chip ${chip.group === this.activeGroup ? 'active' : ''}" role="button" tabindex="0"
                     data-group="${escapeHtml(chip.group)}"
                     style="--chip-background-color: ${escapeHtml(chip.backgroundColor)}; --chip-icon-color: ${escapeHtml(chip.iconColor)};"
                     ${chip.navigationPath ? `data-navigation="${escapeHtml(chip.navigationPath)}"` : ''}>
                  <div class="chip-icon">
                    <ha-icon icon="${escapeHtml(chip.icon)}"></ha-icon>
                  </div>
                  <div class="chip-content">
                    <span class="chip-group-name">${escapeHtml(chip.groupName)}</span>
                    <span class="chip-status">${escapeHtml(chip.statusText)}</span>
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners() {
    if (!this.container) return;

    // Add click handlers to chips (not chip wrappers)
    this.container.querySelectorAll('.chip').forEach((chip: any) => {
      chip.addEventListener('click', this.handleChipClick.bind(this));
      chip.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        chip.click();
      });
    });
  }

  clearContainer() {
    if (this.container) {
      this.container.innerHTML = '';
      this.renderedStructure = '';
    }
  }

  private handleChipClick(event: Event) {
    // Don't handle clicks in edit mode (for dragging)
    if (this.editMode) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const chip = event.currentTarget as HTMLElement;
    const group = chip.dataset.group as DeviceGroup;
    const navigationPath = chip.dataset.navigation;

    // Additional safety check - ensure we have valid navigation data
    if (!group && !navigationPath) {
      return;
    }

    // Check if this is the currently active chip - if so, return to home
    if (group === this.activeGroup) {
      this.navigateToHomePage();
      return;
    }

    // Determine the path to navigate to
    const targetPath = navigationPath || group;

    // Additional check to prevent navigation to invalid paths during load
    if (!targetPath || targetPath.trim() === '') {
      return;
    }

    // Navigate to the target path
    navigateToDashboardPath(targetPath);
  }

  private navigateToHomePage() {
    // Navigate to the home page
    navigateToDashboardPath('home');
  }

  private getGroupStatusText(group: DeviceGroup, entities: EntityState[]): string {
    switch (group) {
      case DeviceGroup.LIGHTING: {
        const onCount = countLightsOn(entities);
        return onCount > 0 ? `${onCount} ${localize('status.on')}` : localize('status.off');
      }

      case DeviceGroup.CLIMATE: {
        const temperatures = entities
          .filter((entity) => entity.entity_id.startsWith('climate.') || entity.entity_id.startsWith('water_heater.'))
          .map((entity) => entity.attributes.current_temperature)
          .filter((temp) => temp !== undefined && temp !== null)
          .sort((a, b) => a - b);

        if (temperatures.length === 0) return '--°';
        const min = Math.round(temperatures[0]);
        const max = Math.round(temperatures[temperatures.length - 1]);
        return temperatures.length === 1 ? `${min}°` : `${min}-${max}°`;
      }

      case DeviceGroup.SECURITY: {
        const { triggered, armed, unlocked, jammed } = summarizeSecurity(entities);
        const parts = [
          triggered > 0 && localize('status.triggered'),
          armed > 0 && localize('status.armed'),
          unlocked > 0 && `${unlocked} ${localize('status.unlocked')}`,
          jammed > 0 && `${jammed} ${localize('status.jammed')}`,
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : localize('chip_status.secure');
      }

      case DeviceGroup.MEDIA: {
        const playingMedia = entities.filter((entity) => entity.state === 'playing');
        const onTVs = entities.filter(
          (entity) =>
            (entity.attributes.device_class === 'tv' || entity.entity_id.includes('tv') || entity.attributes.source_list) &&
            entity.state === 'on'
        );

        if (playingMedia.length > 0) return `${playingMedia.length} ${localize('status.playing')}`;
        if (onTVs.length > 0) {
          return `${onTVs.length} ${onTVs.length > 1 ? localize('chip_status.tvs') : localize('chip_status.tv')} ${localize('status.on')}`;
        }
        return localize('status.off');
      }

      case DeviceGroup.WATER: {
        const activeWater = entities.filter((entity) => entity.state === 'on' || entity.state === 'detected');
        return activeWater.length > 0 ? `${activeWater.length} ${localize('chip_status.active')}` : localize('status.off');
      }

      case DeviceGroup.ENERGY: {
        const totalPower = EnergySection.getTotalPower(this._hass);
        return totalPower !== null ? formatPower(totalPower) : localize('energy.active');
      }

      default:
        return localize('status.off');
    }
  }
}
