import { CustomizationManager } from '../utils/CustomizationManager';
import { DataService } from '../utils/DataService';
import { DashboardConfig } from '../config/DashboardConfig';
import { Entity } from '../types/types';
import { DragAndDropManager } from '../utils/DragAndDropManager';
import { localize } from '../utils/LocalizationService';
import { EditModeManager } from '../utils/EditModeManager';
import { resetPage } from './pageChrome';
import { sortBySavedOrder } from './homeOrdering';

export class CamerasPage {
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
      
      // Initialize drag and drop manager with cameras context
      this.dragAndDropManager = new DragAndDropManager(
        (areaId, grid) => this.handleSaveCurrentOrder(areaId, grid),
        this.customizationManager,
        'cameras' // Use cameras context for cameras page
      );
    }
  }

  async render(
    container: HTMLElement,
    hass: any,
    onTallToggle?: (entityId: string, areaId: string) => void | Promise<void | boolean>
  ): Promise<void> {
    resetPage(container, localize('pages.cameras'));

    try {
      // Get data from Home Assistant
      const entities = await DataService.getEntities(hass);
      
      // Filter entities for cameras and exclude those marked for exclusion
      const allCamerasEntities = entities.filter(entity => {
        const domain = entity.entity_id.split('.')[0];
        return DashboardConfig.isCamerasDomain(domain);
      });

      // Now apply exclusions asynchronously
      const camerasEntities = [];
      for (const entity of allCamerasEntities) {
        const isExcluded = await this.customizationManager?.isEntityExcludedFromDashboard(entity.entity_id) || false;
        if (!isExcluded) {
          camerasEntities.push(entity);
        }
      }

      // Apply user customizations
      if (!this.customizationManager) {
        throw new Error(localize('errors.customization_manager_not_initialized'));
      }
      
      const savedOrder = this.customizationManager.getSavedCardOrderWithContext('cameras_section', 'cameras');
      const sorted = sortBySavedOrder(camerasEntities, savedOrder, (entity) => entity.entity_id);

      // Apply tall card settings - cameras are handled by CardManager
      sorted.forEach(entity => {
        (entity as any).is_tall = true; // Default for cameras
      });

      // Render all cameras in a grid layout (non-carousel)
      await this.renderCamerasGrid(
        container,
        sorted,
        hass
      );
      
    } catch (error) {
      console.error('Error rendering cameras page:', error);
    }
  }

  private async renderCamerasGrid(
    container: HTMLElement,
    camerasEntities: Entity[],
    hass: any
  ): Promise<void> {
    if (!this.customizationManager) {
      throw new Error(localize('errors.customization_manager_not_initialized'));
    }

    // Create a grid container for all cameras
    const gridContainer = document.createElement('div');
    gridContainer.className = 'cameras-grid';
    gridContainer.dataset.areaId = 'cameras_section';
    gridContainer.dataset.sectionType = 'cameras';

    // Create camera cards
    for (const entity of camerasEntities) {
      const cardConfig = this.createEntityCard(entity.entity_id, hass, entity);
      if (cardConfig) {
        cardConfig.section_type = 'cameras';
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
      area_id: 'cameras_section',
      is_tall: (entity as any).is_tall !== undefined ? (entity as any).is_tall : true, // Cameras are tall by default
      camera_view: 'snapshot',
      refresh_interval: 10000 // 10 seconds
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
    wrapper.dataset.areaId = 'cameras_section';
    
    // Apply tall class if needed
    if (cardConfig.is_tall) {
      wrapper.classList.add('tall');
    }

    // Create the card element
    const cardElement = document.createElement('home-glass-card') as any;
    cardElement.setConfig(cardConfig);
    cardElement.hass = hass;

    // Add edit mode controls - but no tall toggle for cameras
    const controls = document.createElement('div');
    controls.className = 'entity-controls';
    // Cameras don't have resize controls
    
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

    this.customizationManager?.saveCardOrderWithContext(areaId, entityOrder, 'cameras');
  }
}
