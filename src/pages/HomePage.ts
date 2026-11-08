import { CustomizationManager } from '../utils/CustomizationManager';
import { DataService } from '../utils/DataService';
import { DashboardConfig } from '../config/DashboardConfig';
import { ScenesSection } from '../sections/ScenesSection';
import { CamerasSection } from '../sections/CamerasSection';
import { AreaSection } from '../sections/AreaSection';
import { FavoritesSection } from '../sections/FavoritesSection';
import { WeatherSection } from '../sections/WeatherSection';
import { EnergySection } from '../sections/EnergySection';
import { Entity, Area, HassUpdatable } from '../types/types';
import { resetPage } from './pageChrome';
import { isSwitchShown } from './entityFilter';
import { applyHomeOrdering } from './homeOrdering';
import { orderSections } from '../utils/sectionOrder';

export class HomePage {
  private customizationManager?: CustomizationManager;
  private scenesSection?: ScenesSection;
  private camerasSection?: CamerasSection;
  private areaSection?: AreaSection;
  private favoritesSection?: FavoritesSection;
  private weatherSection?: WeatherSection;
  private energySection?: EnergySection;
  private _hass?: any;

  set hass(hass: any) {
    this._hass = hass;
    (this.weatherSection as HassUpdatable | undefined)?.update?.(hass);
    (this.energySection as HassUpdatable | undefined)?.update?.(hass);
  }

  async setConfig(config: any) {
    // Initialize customization manager from config
    if (config.customizations && this._hass) {
      this.customizationManager = CustomizationManager.getInstance(this._hass);
      await this.customizationManager.setCustomizations(config.customizations);
      this.initializeSections();
    }
  }

  private initializeSections() {
    if (this.customizationManager) {
      this.weatherSection?.destroy?.();
      this.scenesSection = new ScenesSection(this.customizationManager);
      this.camerasSection = new CamerasSection(this.customizationManager);
      this.areaSection = new AreaSection(this.customizationManager);
      this.favoritesSection = new FavoritesSection(this.customizationManager);
      this.weatherSection = new WeatherSection(this.customizationManager);
      this.energySection = new EnergySection(this.customizationManager);
    }
  }

  async render(
    container: HTMLElement,
    hass: any,
    title: string,
    onTallToggle?: (entityId: string, areaId: string) => void | Promise<void | boolean>
  ): Promise<void> {
    resetPage(container, title);

    try {
      // Fetch all data in parallel
      const [areas, entities, devices, showSwitches, includedSwitches, extraAccessories] = await Promise.all([
        DataService.getAreas(hass),
        DataService.getEntities(hass),
        DataService.getDevices(hass),
        this.customizationManager?.getShowSwitches().then(v => v || false) ?? Promise.resolve(false),
        this.customizationManager?.getIncludedSwitches().then(v => v || []) ?? Promise.resolve([] as string[]),
        this.customizationManager?.getExtraAccessories().then(v => v || []) ?? Promise.resolve([] as string[])
      ]);

      // Filter entities for supported domains and exclude those marked for exclusion
      const supportedEntities = entities.filter((entity) => {
        if (!DataService.isDiscoverable(entity, extraAccessories, (d) => DashboardConfig.isSupportedDomain(d))) {
          return false;
        }
        if (extraAccessories.includes(entity.entity_id)) {
          return true;
        }

        const domain = entity.entity_id.split('.')[0];

        if (domain === 'switch') {
          return isSwitchShown(DashboardConfig, entity.entity_id, hass.states[entity.entity_id]?.attributes, showSwitches, includedSwitches);
        }

        return true;
      });

      // Batch-fetch exclusion lists once, then filter synchronously
      const excludedFromDashboard = new Set(await this.customizationManager?.getExcludedFromDashboard() || []);
      const excludedFromHome = new Set(await this.customizationManager?.getExcludedFromHome() || []);

      const filteredEntities = supportedEntities.filter(entity => !excludedFromDashboard.has(entity.entity_id));

      // Separate special section entities from regular area entities
      const scenesEntities: typeof filteredEntities = [];
      const camerasEntities: typeof filteredEntities = [];
      const regularEntities: typeof filteredEntities = [];

      for (const entity of filteredEntities) {
        if (excludedFromHome.has(entity.entity_id)) continue;
        const domain = entity.entity_id.split('.')[0];
          if (DashboardConfig.isScenesDomain(domain)) {
            scenesEntities.push(entity);
          } else if (DashboardConfig.isCamerasDomain(domain)) {
            camerasEntities.push(entity);
          } else if (!DashboardConfig.isSpecialSectionDomain(domain)) {
            regularEntities.push(entity);
          }
        }

      // Group regular entities by area
      const entitiesByArea = DataService.groupEntitiesByArea(regularEntities, areas, devices);

      // Apply user customizations
      if (!this.customizationManager) {
        throw new Error('CustomizationManager not initialized');
      }

      const customizations = this.customizationManager.getCustomizations();
      const customizedAreas = applyHomeOrdering(entitiesByArea, customizations.home);

      // Render sections in order based on customizations
      await this.renderSectionsInOrder(
        container,
        customizedAreas,
        areas,
        scenesEntities,
        camerasEntities,
        hass,
        onTallToggle
      );
    } catch (error) {
      console.error('Error rendering home page:', error);
    }
  }

  private async renderSectionsInOrder(
    container: HTMLElement,
    entitiesByArea: { [areaId: string]: Entity[] },
    areas: Area[],
    scenesEntities: Entity[],
    camerasEntities: Entity[],
    hass: any,
    onTallToggle?: (entityId: string, areaId: string) => void | Promise<void | boolean>
  ): Promise<void> {
    if (!this.customizationManager || !this.scenesSection || !this.camerasSection || !this.areaSection || !this.favoritesSection || !this.weatherSection || !this.energySection) {
      throw new Error('Required sections not initialized');
    }

    // Get section order and hidden sections
    const sectionOrder = this.customizationManager.getSavedSectionOrder();
    const hiddenSections = this.customizationManager.getHiddenSections();

    // Create a map of all available sections (closures accept optional target container)
    const availableSections = new Map<string, (target: HTMLElement) => Promise<void>>();

    // Add weather section if a weather entity is configured and exists
    const weatherEntity = await this.customizationManager?.getWeatherEntity();
    const hasWeather = !!(weatherEntity && hass.states[weatherEntity]);
    if (hasWeather) {
      availableSections.set('weather_section', async (target: HTMLElement) => {
        await this.weatherSection!.render(target, hass);
      });
    }

    // Add energy section if enabled in settings and energy sensors exist
    const showEnergy = await this.customizationManager?.getShowEnergy();
    const hasEnergy = !!(showEnergy && EnergySection.hasEnergySensors(hass));
    if (hasEnergy) {
      availableSections.set('energy_section', async (target: HTMLElement) => {
        await this.energySection!.render(target, hass);
      });
    }

    // Add favorites section if there are favorites defined
    const hasFavorites = await this.customizationManager?.hasFavoriteAccessories();
    if (hasFavorites) {
      availableSections.set('favorites_section', async (target: HTMLElement) => {
        await this.favoritesSection!.render(target, hass);
      });
    }

    // Add scenes section if there are any scenes or scripts
    if (scenesEntities.length > 0) {
      availableSections.set('scenes_section', async (target: HTMLElement) => {
        await this.scenesSection!.render(target, scenesEntities, hass, onTallToggle);
      });
    }

    // Add cameras section if there are any cameras
    if (camerasEntities.length > 0) {
      availableSections.set('cameras_section', async (target: HTMLElement) => {
        await this.camerasSection!.render(target, camerasEntities, hass, onTallToggle);
      });
    }

    // Add area sections
    for (const areaId of Object.keys(entitiesByArea)) {
      if (entitiesByArea[areaId].length > 0) {
        availableSections.set(areaId, async (target: HTMLElement) => {
          await this.areaSection!.renderSingleArea(target, areaId, entitiesByArea[areaId], hass, onTallToggle, 'home');
        });
      }
    }

    const areaNames = Object.fromEntries(areas.map((area) => [area.area_id, area.name]));
    const orderedSectionIds = orderSections(
      Array.from(availableSections.keys()),
      sectionOrder,
      areaNames,
      hass.locale?.language || hass.language
    );

    const visibleIds = orderedSectionIds.filter((id) => !hiddenSections.includes(id) && availableSections.has(id));
    const pairWeatherEnergy =
      hasWeather && hasEnergy && visibleIds.some((id, i) => isWeatherEnergyPair(id, visibleIds[i + 1]));

    const slots: { slot: HTMLElement; render: Promise<void> }[] = [];
    const renderIntoSlot = (sectionId: string, parent: HTMLElement) => {
      const slot = createSlot(parent);
      slots.push({ slot, render: availableSections.get(sectionId)!(slot) });
    };

    for (let i = 0; i < visibleIds.length; i++) {
      if (pairWeatherEnergy && isWeatherEnergyPair(visibleIds[i], visibleIds[i + 1])) {
        const row = document.createElement('div');
        row.className = 'weather-energy-row';
        container.appendChild(row);
        renderIntoSlot(visibleIds[i], row);
        renderIntoSlot(visibleIds[i + 1], row);
        i++;
      } else {
        renderIntoSlot(visibleIds[i], container);
      }
    }

    const results = await Promise.allSettled(slots.map(({ render }) => render));
    slots.forEach(({ slot }) => slot.replaceWith(...Array.from(slot.childNodes)));
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failed) throw failed.reason;
  }
}

function isWeatherEnergyPair(id: string, next?: string): boolean {
  return (id === 'weather_section' && next === 'energy_section') || (id === 'energy_section' && next === 'weather_section');
}

/** Reserves a spot in `parent` so sections can render concurrently and still land in order. */
function createSlot(parent: HTMLElement): HTMLElement {
  const slot = document.createElement('div');
  slot.style.display = 'contents';
  parent.appendChild(slot);
  return slot;
}
