import { CustomizationManager } from '../utils/CustomizationManager';
import { CardManager } from '../utils/CardManager';
import { DataService } from '../utils/DataService';
import { DashboardConfig, DeviceGroup } from '../config/DashboardConfig';
import { CamerasSection } from '../sections/CamerasSection';
import { AreaSection } from '../sections/AreaSection';
import { StatusSection } from '../sections/StatusSection';
import { Entity } from '../types/types';
import { localize } from '../utils/LocalizationService';
import { escapeHtml } from '../utils/html';
import { resetPage } from './pageChrome';
import { createCardWrapper } from './cardGrid';
import { sortBySavedOrder } from './homeOrdering';
import { isSwitchShown } from './entityFilter';

const ROOM_GROUPS = [
  DeviceGroup.LIGHTING,
  DeviceGroup.CLIMATE,
  DeviceGroup.SECURITY,
  DeviceGroup.MEDIA,
  DeviceGroup.WATER,
  DeviceGroup.VACUUM,
  DeviceGroup.ENERGY,
  DeviceGroup.OTHER
];

export class RoomPage {
  private customizationManager?: CustomizationManager;
  private cardManager?: CardManager;
  private camerasSection?: CamerasSection;
  private areaSection?: AreaSection;
  private statusSection?: StatusSection;
  private _hass?: any;
  private _areaId?: string;

  set hass(hass: any) {
    this._hass = hass;
    
    // Update status section if it exists
    if (this.statusSection) {
      this.statusSection.hass = hass;
    }
  }

  get hass() {
    return this._hass;
  }

  async setConfig(config: any) {
    this._areaId = config.areaId;
    
    // Initialize customization manager from config
    if (config.customizations && this._hass) {
      this.customizationManager = CustomizationManager.getInstance(this._hass);
      this.cardManager = new CardManager(this.customizationManager);
      await this.customizationManager.setCustomizations(config.customizations);
      this.initializeSections();
    }
  }

  private initializeSections() {
    if (this.customizationManager) {
      this.camerasSection = new CamerasSection(this.customizationManager, this.cardManager);
      this.areaSection = new AreaSection(this.customizationManager, this.cardManager);
      this.statusSection = new StatusSection(this.customizationManager, this.cardManager);
      
      // Note: No DragAndDropManager needed - HomeView handles drag and drop like for HomePage
    }
  }

  async render(
    container: HTMLElement,
    areaId: string,
    areaName: string,
    hass: any,
    onTallToggle?: (entityId: string, areaId: string) => void | Promise<void | boolean>
  ): Promise<void> {
    resetPage(container, areaName);

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
      const supportedEntities = entities.filter(entity => {
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

      // Create a separate list for status section that includes sensor domains
      const statusEntities = entities.filter(entity => {
        if (!DataService.isDiscoverable(entity, extraAccessories, (d) => DashboardConfig.isStatusDomain(d))) {
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

      // Batch-fetch exclusion list once, then filter synchronously
      const excludedFromDashboard = new Set(await this.customizationManager?.getExcludedFromDashboard() || []);

      const filteredEntities = supportedEntities.filter(entity => !excludedFromDashboard.has(entity.entity_id));
      const filteredStatusEntities = statusEntities.filter(entity => !excludedFromDashboard.has(entity.entity_id));
      
      // Group regular entities by area (excluding sensors)
      const entitiesByArea = DataService.groupEntitiesByArea(filteredEntities, areas, devices);
      
      // Group status entities by area (including sensors)
      const statusEntitiesByArea = DataService.groupEntitiesByArea(filteredStatusEntities, areas, devices);
      
      // Get entities for this specific area
      const areaEntities = entitiesByArea[areaId] || [];
      const statusAreaEntities = statusEntitiesByArea[areaId] || [];
      
      // Add status section after title but before main content
      if (this.statusSection && statusAreaEntities.length > 0) {
        await this.statusSection.render(container, statusAreaEntities, hass, areaId);
      }
      
      // Separate entities by device groups for organized display
      const entitiesByGroup: { [group: string]: Entity[] } = {};
      const deviceGroups = ROOM_GROUPS;

      // Initialize groups
      deviceGroups.forEach(group => {
        entitiesByGroup[group] = [];
      });

      // Categorize entities by device group, but separate cameras from security
      areaEntities.forEach(entity => {
        const domain = entity.entity_id.split('.')[0];
        const entityState = this.hass?.states[entity.entity_id];
        
        let entityGroup: DeviceGroup | undefined;
        
        // Special handling for switches when showSwitches is false
        if (domain === 'switch' && !showSwitches) {
          const isOutlet = DashboardConfig.isOutlet(entity.entity_id, entityState?.attributes);
          const isIncluded = includedSwitches.includes(entity.entity_id);
          
          if (isOutlet || isIncluded) {
            entityGroup = DeviceGroup.OTHER; // Force included switches and outlets to OTHER group
          } else {
            entityGroup = undefined; // Hide other switches
          }
        } else {
          entityGroup = DashboardConfig.getDeviceGroup(domain, entity.entity_id, entityState?.attributes, showSwitches);
        }
        
        if (entityGroup && deviceGroups.includes(entityGroup)) {
          entitiesByGroup[entityGroup].push(entity);
        }
      });

      // Separate cameras from security group
      const cameraEntities = entitiesByGroup[DeviceGroup.SECURITY].filter(entity => 
        entity.entity_id.split('.')[0] === 'camera'
      );
      
      // Remove cameras from security group
      entitiesByGroup[DeviceGroup.SECURITY] = entitiesByGroup[DeviceGroup.SECURITY].filter(entity => 
        entity.entity_id.split('.')[0] !== 'camera'
      );

      // Apply user customizations
      if (!this.customizationManager) {
        throw new Error('CustomizationManager not initialized');
      }
      
      const customizations = this.customizationManager.getCustomizations();
      
      // Apply area-specific customizations from pages structure
      const pageCustomizations = customizations.pages?.[areaId];
      if (pageCustomizations) {
        // Apply entity order customizations for each group
        deviceGroups.forEach(group => {
          const groupEntities = entitiesByGroup[group];
          const groupOrderKey = `${group.toLowerCase()}_order`;
          const groupOrder = pageCustomizations[groupOrderKey];
          
          if (groupEntities.length > 0 && groupOrder && Array.isArray(groupOrder)) {
            const sortedEntities = sortBySavedOrder(groupEntities, groupOrder, (entity) => entity.entity_id);
            entitiesByGroup[group] = sortedEntities;
          }
          
          // Apply tall card settings from room page tall_cards
          if (pageCustomizations.tall_cards) {
            entitiesByGroup[group].forEach(entity => {
              if (pageCustomizations.tall_cards.includes(entity.entity_id)) {
                (entity as any).is_tall = true;
              } else if (pageCustomizations.tall_cards.includes(`!${entity.entity_id}`)) {
                (entity as any).is_tall = false;
              }
            });
          }
        });
      }

      // Render cameras section first (like home page carousel)
      if (cameraEntities.length > 0) {
        await this.renderCamerasSection(container, cameraEntities, hass, onTallToggle);
      }

      // Then render other sections in the specified order: Lights, Climate, Security, Speakers & TVs
      await this.renderGroupedSections(
        container,
        entitiesByGroup,
        hass,
        onTallToggle
      );
      
    } catch (error) {
      console.error('Error rendering room page:', error);
    }
  }

  private async renderGroupedSections(
    container: HTMLElement,
    entitiesByGroup: { [group: string]: Entity[] },
    hass: any,
    onTallToggle?: (entityId: string, areaId: string) => void | Promise<void | boolean>
  ): Promise<void> {
    if (!this.customizationManager || !this.areaSection) {
      throw new Error('Required sections not initialized');
    }

    for (const group of ROOM_GROUPS) {
      const groupEntities = entitiesByGroup[group];
      
      if (!groupEntities || groupEntities.length === 0) {
        continue; // Skip empty groups
      }

      // Get group style for section title
      const groupStyle = DashboardConfig.getGroupStyle(group);
      
      // Add section title
      const titleDiv = document.createElement('div');
      titleDiv.className = 'hg-section-title';
      titleDiv.innerHTML = `<span>${escapeHtml(typeof groupStyle.name === 'function' ? groupStyle.name() : groupStyle.name)}</span>`;
      container.appendChild(titleDiv);

      // Create a grid container for this group (non-carousel)
      const gridContainer = document.createElement('div');
      gridContainer.className = 'room-group-grid';
      // Use main area ID for data attribute, not composite
      gridContainer.dataset.areaId = this._areaId;
      gridContainer.dataset.sectionType = 'room-group';
      gridContainer.dataset.deviceGroup = group;

      // Apply saved card order using domain-specific ordering and main area ID
      const savedOrder = this.customizationManager?.getSavedCardOrderWithContext(this._areaId!, 'room', group);
      let orderedEntities = [...groupEntities];
      
      if (savedOrder && savedOrder.length > 0 && this.customizationManager) {
        orderedEntities = this.customizationManager.applySavedCardOrder(groupEntities, savedOrder);
      }

      // Create entity cards for this group
      for (const entity of orderedEntities) {
        const cardConfig = this.createEntityCard(entity.entity_id, hass, entity);
        if (cardConfig) {
          cardConfig.section_type = 'room-group';
          await this.createAndAppendCard(cardConfig, gridContainer, hass, onTallToggle);
        }
      }

      container.appendChild(gridContainer);
    }
  }

  private async renderCamerasSection(
    container: HTMLElement,
    cameraEntities: Entity[],
    hass: any,
    onTallToggle?: (entityId: string, areaId: string) => void | Promise<void | boolean>
  ): Promise<void> {
    if (!this.camerasSection || !this.customizationManager) {
      return;
    }

    // Use the CamerasSection to render cameras just like on the home page
    const cameraSectionId = `${this._areaId}_cameras`; // Room-specific camera section ID
    await this.camerasSection.render(
      container,
      cameraEntities,
      hass,
      onTallToggle,
      'room',
      false,  // Disable navigation in room pages
      cameraSectionId  // Use room-specific section ID
    );
  }

  private createEntityCard(entityId: string, hass: any, entity: Entity): any {
    if (!this.customizationManager) return null;

    const stateObj = hass.states[entityId];
    
    if (!stateObj) return null;

    const cardConfig: any = {
      type: 'custom:home-glass-card',
      entity: entityId,
      name: stateObj.attributes.friendly_name || entityId,
      area_id: entity.area_id,
      is_tall: this.cardManager?.shouldCardBeTall(entityId, this._areaId || 'unknown', 'room') || false
    };

    return cardConfig;
  }

  private async createAndAppendCard(
    cardConfig: any,
    gridContainer: HTMLElement,
    hass: any,
    onTallToggle?: (entityId: string, areaId: string) => void | Promise<void | boolean>
  ): Promise<void> {
    const areaId = this._areaId || 'unknown';
    const { wrapper, controls } = createCardWrapper(cardConfig, areaId, hass);

    const tallButton = document.createElement('button');
    tallButton.className = 'entity-control-btn tall-toggle';
    tallButton.innerHTML = `<ha-icon icon="mdi:${cardConfig.is_tall ? 'arrow-collapse' : 'arrow-expand'}"></ha-icon>`;
    tallButton.title = cardConfig.is_tall ? localize('edit.make_normal_size') : localize('edit.make_tall');
    tallButton.classList.toggle('active', cardConfig.is_tall);

    tallButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (onTallToggle) {
        await onTallToggle(cardConfig.entity, areaId);
        // Re-read the saved state so the UI matches what was persisted.
        const actualTallState = this.cardManager?.shouldCardBeTall(cardConfig.entity, areaId, 'room') || false;
        this.updateTallCardVisual(wrapper, tallButton, cardConfig, actualTallState);
      }
    });

    controls.appendChild(tallButton);
    gridContainer.appendChild(wrapper);
  }

  private updateTallCardVisual(
    wrapper: HTMLElement,
    tallButton: HTMLElement,
    cardConfig: any,
    shouldBeTall: boolean
  ): void {
    // Update wrapper class
    wrapper.classList.toggle('tall', shouldBeTall);
    
    // Update button state
    tallButton.classList.toggle('active', shouldBeTall);
    tallButton.title = shouldBeTall ? localize('edit.make_normal_size') : localize('edit.make_tall');
    
    // Update icon
    const iconElement = tallButton.querySelector('ha-icon');
    if (iconElement) {
      iconElement.setAttribute('icon', shouldBeTall ? 'mdi:arrow-collapse' : 'mdi:arrow-expand');
    }
    
    // Update card config
    cardConfig.is_tall = shouldBeTall;
  }
}
