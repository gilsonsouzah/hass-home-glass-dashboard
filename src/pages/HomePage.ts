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

  constructor() {
    // Regular class constructor
  }

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

        // Additional filtering for switches based on showSwitches setting and includedSwitches
        if (domain === 'switch') {
          const entityState = hass.states[entity.entity_id];

          // If showSwitches is true, use the standard device group logic
          if (showSwitches) {
            const entityGroup = DashboardConfig.getDeviceGroup(
              domain,
              entity.entity_id,
              entityState?.attributes,
              showSwitches
            );
            return entityGroup !== undefined;
          } else {
            // If showSwitches is false, only show switches that are in includedSwitches or are outlets
            const isOutlet = DashboardConfig.isOutlet(entity.entity_id, entityState?.attributes);
            const isIncluded = includedSwitches.includes(entity.entity_id);
            return isOutlet || isIncluded;
          }
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
        filteredEntities, // Pass all filtered entities for favorites
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
    allEntities: Entity[],
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
    const availableSections = new Map<string, (target?: HTMLElement) => Promise<void>>();

    // Add weather section if a weather entity is configured and exists
    const weatherEntity = await this.customizationManager?.getWeatherEntity();
    const hasWeather = !!(weatherEntity && hass.states[weatherEntity]);
    if (hasWeather) {
      availableSections.set('weather_section', async (target?: HTMLElement) => {
        await this.weatherSection!.render(target || container, hass);
      });
    }

    // Add energy section if enabled in settings and energy sensors exist
    const showEnergy = await this.customizationManager?.getShowEnergy();
    const hasEnergy = !!(showEnergy && EnergySection.hasEnergySensors(hass));
    if (hasEnergy) {
      availableSections.set('energy_section', async (target?: HTMLElement) => {
        await this.energySection!.render(target || container, hass);
      });
    }

    // Add favorites section if there are favorites defined
    const hasFavorites = await this.customizationManager?.hasFavoriteAccessories();
    if (hasFavorites) {
      availableSections.set('favorites_section', async (target?: HTMLElement) => {
        await this.favoritesSection!.render(target || container, allEntities, hass, onTallToggle);
      });
    }

    // Add scenes section if there are any scenes or scripts
    if (scenesEntities.length > 0) {
      availableSections.set('scenes_section', async (target?: HTMLElement) => {
        await this.scenesSection!.render(target || container, scenesEntities, hass, onTallToggle);
      });
    }

    // Add cameras section if there are any cameras
    if (camerasEntities.length > 0) {
      availableSections.set('cameras_section', async (target?: HTMLElement) => {
        await this.camerasSection!.render(target || container, camerasEntities, hass, onTallToggle);
      });
    }

    // Add area sections
    for (const areaId of Object.keys(entitiesByArea)) {
      if (entitiesByArea[areaId].length > 0) {
        availableSections.set(areaId, async (target?: HTMLElement) => {
          await this.areaSection!.renderSingleArea(target || container, areaId, entitiesByArea[areaId], hass, onTallToggle, 'home');
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

    // Render sections in order, pairing adjacent weather+energy in a side-by-side row
    const rendered = new Set<string>();
    for (let i = 0; i < orderedSectionIds.length; i++) {
      const sectionId = orderedSectionIds[i];
      if (rendered.has(sectionId) || hiddenSections.includes(sectionId) || !availableSections.has(sectionId)) continue;

      // Check if weather and energy are adjacent — pair them side-by-side
      if ((sectionId === 'weather_section' || sectionId === 'energy_section') && hasWeather && hasEnergy) {
        const otherSection = sectionId === 'weather_section' ? 'energy_section' : 'weather_section';
        if (!rendered.has(otherSection) && !hiddenSections.includes(otherSection) && availableSections.has(otherSection)) {
          // Find the next visible section after current
          let nextVisible: string | null = null;
          for (let j = i + 1; j < orderedSectionIds.length; j++) {
            const nextId = orderedSectionIds[j];
            if (!rendered.has(nextId) && !hiddenSections.includes(nextId) && availableSections.has(nextId)) {
              nextVisible = nextId;
              break;
      }
    }

          if (nextVisible === otherSection) {
            // Adjacent! Wrap in a side-by-side row
            const wrapper = document.createElement('div');
            wrapper.className = 'weather-energy-row';
            container.appendChild(wrapper);
            await availableSections.get(sectionId)!(wrapper);
            await availableSections.get(otherSection)!(wrapper);
            rendered.add(sectionId);
            rendered.add(otherSection);
            continue;
          }
        }
      }

      await availableSections.get(sectionId)!();
      rendered.add(sectionId);
    }
  }
}
