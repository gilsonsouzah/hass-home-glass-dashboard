import { CustomizationManager } from '../utils/CustomizationManager';
import { DataService } from '../utils/DataService';
import { DashboardConfig, DeviceGroup } from '../config/DashboardConfig';
import { ScenesSection } from '../sections/ScenesSection';
import { CamerasSection } from '../sections/CamerasSection';
import { AreaSection } from '../sections/AreaSection';
import { StatusSection } from '../sections/StatusSection';
import { WeatherSection } from '../sections/WeatherSection';
import { EnergySection } from '../sections/EnergySection';
import { Entity, Device, Area, HassUpdatable } from '../types/types';
import { resetPage } from './pageChrome';
import { applyHomeOrdering } from './homeOrdering';
import { orderSections } from '../utils/sectionOrder';

export class GroupPage {
  private customizationManager?: CustomizationManager;
  private scenesSection?: ScenesSection;
  private camerasSection?: CamerasSection;
  private areaSection?: AreaSection;
  private statusSection?: StatusSection;
  private weatherSection?: WeatherSection;
  private energySection?: EnergySection;
  private _hass?: any;
  private _group?: DeviceGroup;

  constructor() {
    // Regular class constructor
  }

  set hass(hass: any) {
    this._hass = hass;

    // Update status section if it exists
    if (this.statusSection) {
      this.statusSection.hass = hass;
    }
    (this.weatherSection as HassUpdatable | undefined)?.update?.(hass);
    (this.energySection as HassUpdatable | undefined)?.update?.(hass);
  }

  get hass() {
    return this._hass;
  }

  async setConfig(config: any) {
    this._group = config.group;

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
      this.statusSection = new StatusSection(this.customizationManager);
      this.weatherSection = new WeatherSection(this.customizationManager);
      this.energySection = new EnergySection(this.customizationManager);
    }
  }

  /**
   * Entities without an area, or inside a hidden area section, are not rendered.
   */
  private isEntityInHiddenArea(entity: Entity, devicesById: Map<string, Device>, hiddenSections: string[]): boolean {
    const areaId = DataService.resolveAreaId(entity, devicesById);
    if (!areaId) return true;
    return hiddenSections.includes(areaId);
  }

  private groupTitle(group: DeviceGroup): string {
    const groupStyle = DashboardConfig.getGroupStyle(group);
    return typeof groupStyle.name === 'function' ? groupStyle.name() : groupStyle.name;
  }

  async render(
    container: HTMLElement,
    group: DeviceGroup,
    hass: any,
    onTallToggle?: (entityId: string, areaId: string) => void | Promise<void | boolean>
  ): Promise<void> {
    resetPage(container, this.groupTitle(group));

    try {
      // Fetch all data in parallel
      const [areas, entities, devices, extraAccessories] = await Promise.all([
        DataService.getAreas(hass),
        DataService.getEntities(hass),
        DataService.getDevices(hass),
        this.customizationManager?.getExtraAccessories().then(v => v || []) ?? Promise.resolve([] as string[])
      ]);
      const devicesById = DataService.indexDevices(devices);
      const entitiesById = new Map(entities.map((e) => [e.entity_id, e]));

      // Get hidden sections (areas) for filtering
      const hiddenSections = this.customizationManager?.getHiddenSections() || [];

      const supportedEntities = entities.filter((entity) =>
        DataService.isDiscoverable(entity, extraAccessories, (d) => DashboardConfig.isSupportedDomain(d))
      );

      // Separate list for the status section, which also includes sensor domains
      const statusEntities = entities.filter((entity) =>
        DataService.isDiscoverable(entity, extraAccessories, (d) => DashboardConfig.isStatusDomain(d))
      );

      const excludedFromDashboard = new Set(await this.customizationManager?.getExcludedFromDashboard() || []);

      const filteredEntities = supportedEntities.filter((entity) => !excludedFromDashboard.has(entity.entity_id));
      const filteredStatusEntities = statusEntities.filter(
        (entity) => !excludedFromDashboard.has(entity.entity_id) && !this.isEntityInHiddenArea(entity, devicesById, hiddenSections)
      );

      // Scenes and cameras are often unassigned, so they skip the area check
      const scenesEntities = filteredEntities.filter((entity) =>
        DashboardConfig.isScenesDomain(entity.entity_id.split('.')[0])
      );

      const camerasEntities = filteredEntities.filter((entity) =>
        DashboardConfig.isCamerasDomain(entity.entity_id.split('.')[0])
      );

      const regularEntities = filteredEntities.filter(
        (entity) =>
          !DashboardConfig.isSpecialSectionDomain(entity.entity_id.split('.')[0]) &&
          !this.isEntityInHiddenArea(entity, devicesById, hiddenSections)
      );

      // Group regular entities by area
      const entitiesByArea = DataService.groupEntitiesByArea(regularEntities, areas, devices);

      // Get showSwitches and includedSwitches settings
      const showSwitches = (await this.customizationManager?.getShowSwitches()) || false;
      const includedSwitches = (await this.customizationManager?.getIncludedSwitches()) || [];

      // Filter entities for this group across all areas
      const groupEntitiesByArea: { [areaId: string]: Entity[] } = {};

      for (const [areaId, entities] of Object.entries(entitiesByArea)) {
        const groupEntities = entities.filter((entity) => {
          const domain = entity.entity_id.split('.')[0];
          const entityState = this.hass?.states[entity.entity_id];

          // Special handling for switches
          if (domain === 'switch') {
            if (showSwitches) {
              const entityGroup = DashboardConfig.getDeviceGroup(
                domain,
                entity.entity_id,
                entityState?.attributes,
                showSwitches
              );
              return entityGroup === group;
            } else {
              // If showSwitches is false, only include outlets or included switches
              const isOutlet = DashboardConfig.isOutlet(entity.entity_id, entityState?.attributes);
              const isIncluded = includedSwitches.includes(entity.entity_id);
              if (isOutlet || isIncluded) {
                const entityGroup = DashboardConfig.getDeviceGroup(
                  domain,
                  entity.entity_id,
                  entityState?.attributes,
                  true
                ); // Force true to get proper group
                return entityGroup === group;
              }
              return false;
            }
          } else {
            const entityGroup = DashboardConfig.getDeviceGroup(
              domain,
              entity.entity_id,
              entityState?.attributes,
              showSwitches
            );
            return entityGroup === group;
          }
        });

        if (groupEntities.length > 0) {
          groupEntitiesByArea[areaId] = groupEntities;
        }
      }

      // For ENERGY group, also include energy/power sensor entities (sensor domain isn't in SUPPORTED_DOMAINS)
      if (group === DeviceGroup.ENERGY) {
        const energySensors = entities.filter(entity => {
          if (!DataService.isDiscoverable(entity, extraAccessories, () => true)) return false;
          if (excludedFromDashboard.has(entity.entity_id)) return false;
          if (this.isEntityInHiddenArea(entity, devicesById, hiddenSections)) return false;
          const domain = entity.entity_id.split('.')[0];
          if (domain !== 'sensor') return false;
          const state = hass.states[entity.entity_id];
          if (!state) return false;
          const dc = state.attributes?.device_class;
          if (!DataService.isVisibleInRegistry(hass, entity.entity_id)) return false;
          return (dc === 'energy' || dc === 'power') && !!state.attributes?.state_class;
        });

        for (const entity of energySensors) {
          const areaId = DataService.resolveAreaId(entity, devicesById);
          if (!areaId) continue;
          if (!groupEntitiesByArea[areaId]) {
            groupEntitiesByArea[areaId] = [];
          }
          if (!groupEntitiesByArea[areaId].some(e => e.entity_id === entity.entity_id)) {
            groupEntitiesByArea[areaId].push(entity);
          }
        }
      }

      // Collect all entity IDs that belong to this group (for battery device matching)
      const groupEntityIds = new Set<string>();
      Object.values(groupEntitiesByArea).forEach((entities) => {
        entities.forEach((e) => groupEntityIds.add(e.entity_id));
      });

      // Flatten all group entities for status section (including sensors)
      const statusGroupEntities = filteredStatusEntities.filter((entity) => {
        const domain = entity.entity_id.split('.')[0];
        const entityState = this.hass?.states[entity.entity_id];
        const deviceClass = entityState?.attributes?.device_class;

        // Battery sensors should be included only if their device has other entities in this group
        // This ties battery status to the device it belongs to, not just the area
        if (domain === 'sensor' && deviceClass === 'battery') {
          // Find the device this battery entity belongs to
          const batteryEntityRegistry = entitiesById.get(entity.entity_id);
          if (!batteryEntityRegistry?.device_id) {
            return false; // No device, don't show
          }

          // Check if any other entity from the same device is in this group
          const deviceId = batteryEntityRegistry.device_id;
          const deviceHasGroupEntities = entities.some(
            (e) => e.device_id === deviceId && e.entity_id !== entity.entity_id && groupEntityIds.has(e.entity_id)
          );

          return deviceHasGroupEntities;
        }

        // Special handling for switches
        if (domain === 'switch') {
          if (showSwitches) {
            const entityGroup = DashboardConfig.getDeviceGroup(
              domain,
              entity.entity_id,
              entityState?.attributes,
              showSwitches
            );
            return entityGroup === group;
          } else {
            // If showSwitches is false, only include outlets or included switches
            const isOutlet = DashboardConfig.isOutlet(entity.entity_id, entityState?.attributes);
            const isIncluded = includedSwitches.includes(entity.entity_id);
            if (isOutlet || isIncluded) {
              const entityGroup = DashboardConfig.getDeviceGroup(
                domain,
                entity.entity_id,
                entityState?.attributes,
                true
              ); // Force true to get proper group
              return entityGroup === group;
            }
            return false;
          }
        } else {
          const entityGroup = DashboardConfig.getDeviceGroup(
            domain,
            entity.entity_id,
            entityState?.attributes,
            showSwitches
          );
          return entityGroup === group;
        }
      });

      // Add status section after chips
      if (this.statusSection && statusGroupEntities.length > 0) {
        await this.statusSection.render(container, statusGroupEntities, hass, this._group || 'group');
      }

      // Apply user customizations
      if (!this.customizationManager) {
        throw new Error('CustomizationManager not initialized');
      }

      const customizations = this.customizationManager.getCustomizations();
      const customizedAreas = applyHomeOrdering(groupEntitiesByArea, customizations.home);

      // Determine which special entities belong to this group
      let groupScenesEntities: Entity[] = [];
      let groupCamerasEntities: Entity[] = [];

      // For security group, include cameras
      if (group === DeviceGroup.SECURITY) {
        groupCamerasEntities = camerasEntities;
      }

      // For lighting group, include scenes (since they typically control lights)
      if (group === DeviceGroup.LIGHTING) {
        groupScenesEntities = scenesEntities;
      }

      // Render sections in order based on customizations
      await this.renderSectionsInOrder(
        container,
        customizedAreas,
        areas,
        groupScenesEntities,
        groupCamerasEntities,
        hass,
        onTallToggle
      );
    } catch (error) {
      console.error('Error rendering group page:', error);
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
    if (!this.customizationManager || !this.scenesSection || !this.camerasSection || !this.areaSection) {
      throw new Error('Required sections not initialized');
    }

    // Get section order and hidden sections
    const sectionOrder = this.customizationManager.getSavedSectionOrder();
    const hiddenSections = this.customizationManager.getHiddenSections();

    // Create a map of all available sections
    const availableSections = new Map<string, () => Promise<void>>();

    // Add weather section for climate group if configured
    if (this._group === DeviceGroup.CLIMATE && this.weatherSection) {
      const weatherEntity = await this.customizationManager?.getWeatherEntity();
      if (weatherEntity && hass.states[weatherEntity]) {
        availableSections.set('weather_section', async () => {
          await this.weatherSection!.render(container, hass);
        });
      }
    }

    // Add energy section for energy group
    if (this._group === DeviceGroup.ENERGY && this.energySection) {
      availableSections.set('energy_section', async () => {
        await this.energySection!.render(container, hass, 'group');
      });
    }

    // Add scenes section if there are any scenes or scripts
    if (scenesEntities.length > 0) {
      availableSections.set('scenes_section', async () => {
        await this.scenesSection!.render(container, scenesEntities, hass, onTallToggle, 'room', false);
      });
    }

    // Add cameras section if there are any cameras
    if (camerasEntities.length > 0) {
      availableSections.set('cameras_section', async () => {
        await this.camerasSection!.render(container, camerasEntities, hass, onTallToggle, 'room', false);
      });
    }

    // Add area sections
    for (const areaId of Object.keys(entitiesByArea)) {
      if (entitiesByArea[areaId].length > 0) {
        availableSections.set(areaId, async () => {
          await this.areaSection!.renderSingleArea(
            container,
            areaId,
            entitiesByArea[areaId],
            hass,
            onTallToggle,
            'room',
            false
          );
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

    // Render sections in order, respecting visibility settings
    for (const sectionId of orderedSectionIds) {
      if (!hiddenSections.includes(sectionId) && availableSections.has(sectionId)) {
        await availableSections.get(sectionId)!();
      }
    }
  }
}
