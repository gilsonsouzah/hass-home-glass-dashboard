import { CustomizationManager } from '../utils/CustomizationManager';
import { DataService } from '../utils/DataService';
import { DashboardConfig } from '../config/DashboardConfig';
import { Entity } from '../types/types';
import { DragAndDropManager } from '../utils/DragAndDropManager';
import { localize } from '../utils/LocalizationService';
import { EditModeManager } from '../utils/EditModeManager';
import { resetPage } from './pageChrome';
import { sortBySavedOrder } from './homeOrdering';

export class ScenesPage {
  private customizationManager?: CustomizationManager;
  private dragAndDropManager?: DragAndDropManager;
  private _hass?: any;

  constructor() {
    // Regular class constructor
  }

  set hass(hass: any) {
    this._hass = hass;
  }

  async setConfig(config: any) {
    // Initialize customization manager from config
    if (config.customizations && this._hass) {
      this.customizationManager = CustomizationManager.getInstance(this._hass);
      await this.customizationManager.setCustomizations(config.customizations);
      
      // Initialize drag and drop manager with scenes context  
      this.dragAndDropManager = new DragAndDropManager(
        (areaId, grid) => this.handleSaveCurrentOrder(areaId, grid),
        this.customizationManager,
        'scenes' // Use scenes context for scenes page
      );
    }
  }

  async render(
    container: HTMLElement,
    hass: any,
    onTallToggle?: (entityId: string, areaId: string) => void | Promise<void | boolean>
  ): Promise<void> {
    resetPage(container, localize('pages.scenes'));

    try {
      // Get data from Home Assistant
      const entities = await DataService.getEntities(hass);
      
      // Filter entities for scenes and scripts and exclude those marked for exclusion
      const allScenesEntities = entities.filter(entity => {
        const domain = entity.entity_id.split('.')[0];
        return DashboardConfig.isScenesDomain(domain);
      });

      // Now apply exclusions asynchronously
      const scenesEntities = [];
      for (const entity of allScenesEntities) {
        const isExcluded = await this.customizationManager?.isEntityExcludedFromDashboard(entity.entity_id) || false;
        if (!isExcluded) {
          scenesEntities.push(entity);
        }
      }

      // Apply user customizations
      if (!this.customizationManager) {
        throw new Error(localize('errors.customization_manager_not_initialized'));
      }
      
      const savedOrder = this.customizationManager.getSavedCardOrderWithContext('scenes_section', 'scenes');
      const sorted = sortBySavedOrder(scenesEntities, savedOrder, (entity) => entity.entity_id);

      // Apply tall card settings - handled by CardManager in the new structure
      sorted.forEach(entity => {
        (entity as any).is_tall = false; // Default for scenes
      });

      // Render all scenes in a grid layout (non-carousel)
      await this.renderScenesGrid(
        container,
        sorted,
        hass
      );
      
    } catch (error) {
      console.error('Error rendering scenes page:', error);
    }
  }

  private async renderScenesGrid(
    container: HTMLElement,
    scenesEntities: Entity[],
    hass: any
  ): Promise<void> {
    if (!this.customizationManager) {
      throw new Error(localize('errors.customization_manager_not_initialized'));
    }

    // Create a grid container for all scenes
    const gridContainer = document.createElement('div');
    gridContainer.className = 'scenes-grid';
    gridContainer.dataset.areaId = 'scenes_section';
    gridContainer.dataset.sectionType = 'scenes';

    // Create scene cards
    for (const entity of scenesEntities) {
      const cardConfig = this.createEntityCard(entity.entity_id, hass, entity);
      if (cardConfig) {
        cardConfig.section_type = 'scenes';
        await this.createAndAppendCard(cardConfig, gridContainer, hass);
      }
    }

    container.appendChild(gridContainer);
  }

  private createEntityCard(entityId: string, hass: any, entity: Entity): any {
    if (!this.customizationManager) return null;

    const stateObj = hass.states[entityId];
    
    if (!stateObj) return null;

    const cardConfig: any = {
      type: 'custom:home-glass-card',
      entity: entityId,
      name: stateObj.attributes.friendly_name || entityId,
      area_id: 'scenes_section',
      is_tall: (entity as any).is_tall !== undefined ? (entity as any).is_tall : false // Scenes are typically not tall by default
    };

    return cardConfig;
  }

  private async createAndAppendCard(
    cardConfig: any,
    gridContainer: HTMLElement,
    hass: any
  ): Promise<void> {
    // Create wrapper div for the card
    const wrapper = document.createElement('div');
    wrapper.className = 'entity-card-wrapper';
    wrapper.dataset.entityId = cardConfig.entity;
    wrapper.dataset.areaId = 'scenes_section';
    
    // Apply tall class if needed
    if (cardConfig.is_tall) {
      wrapper.classList.add('tall');
    }

    // Create the card element
    const cardElement = document.createElement('home-glass-card') as any;
    cardElement.setConfig(cardConfig);
    cardElement.hass = hass;

    // Add edit mode controls - but no tall toggle for scenes
    const controls = document.createElement('div');
    controls.className = 'entity-controls';
    // Scenes don't have resize controls
    
    wrapper.appendChild(controls);
    wrapper.appendChild(cardElement);
    gridContainer.appendChild(wrapper);
  }

  public updateDragAndDrop(editMode: boolean, container: HTMLElement) {
    if (!this.dragAndDropManager) return;

    if (editMode) {
      // Wait for the cards to finish rendering
      setTimeout(() => {
        this.dragAndDropManager!.enableDragAndDrop(container);
        EditModeManager.updateEntityWrapperStyles(container, true);
      }, 100);
    } else {
      this.dragAndDropManager.disableDragAndDrop(container);
      EditModeManager.updateEntityWrapperStyles(container, false);
    }
  }

  private handleSaveCurrentOrder(areaId: string, grid: HTMLElement) {
    const entityOrder = Array.from(grid.querySelectorAll<HTMLElement>('.entity-card-wrapper:not(.drag-placeholder)'))
      .map((wrapper) => wrapper.dataset.entityId)
      .filter((id): id is string => !!id);

    this.customizationManager?.saveCardOrderWithContext(areaId, entityOrder, 'scenes');
  }
}
