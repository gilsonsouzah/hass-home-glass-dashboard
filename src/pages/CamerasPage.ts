import { CustomizationManager } from '../utils/CustomizationManager';
import { DataService } from '../utils/DataService';
import { DashboardConfig } from '../config/DashboardConfig';
import { Entity } from '../types/types';
import { DragAndDropManager } from '../utils/DragAndDropManager';
import { localize } from '../utils/LocalizationService';
import { resetPage } from './pageChrome';
import { createCardWrapper, readGridOrder, setGridEditMode } from './cardGrid';
import { sortBySavedOrder } from './homeOrdering';

export class CamerasPage {
  private customizationManager?: CustomizationManager;
  private dragAndDropManager?: DragAndDropManager;
  private _hass?: any;

  set hass(hass: any) {
    this._hass = hass;
  }

  async setConfig(config: any) {
    if (config.customizations && this._hass) {
      this.customizationManager = CustomizationManager.getInstance(this._hass);
      await this.customizationManager.setCustomizations(config.customizations);
      
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
      const entities = await DataService.getEntities(hass);
      
      // Filter entities for cameras and exclude those marked for exclusion
      const allCamerasEntities = entities.filter(entity => {
        const domain = entity.entity_id.split('.')[0];
        return DashboardConfig.isCamerasDomain(domain);
      });

      const camerasEntities = [];
      for (const entity of allCamerasEntities) {
        const isExcluded = await this.customizationManager?.isEntityExcludedFromDashboard(entity.entity_id) || false;
        if (!isExcluded) {
          camerasEntities.push(entity);
        }
      }

      if (!this.customizationManager) {
        throw new Error(localize('errors.customization_manager_not_initialized'));
      }
      
      const savedOrder = this.customizationManager.getSavedCardOrderWithContext('cameras_section', 'cameras');
      const sorted = sortBySavedOrder(camerasEntities, savedOrder, (entity) => entity.entity_id);

      // Apply tall card settings - cameras are handled by CardManager
      sorted.forEach(entity => {
        (entity as any).is_tall = true; // Default for cameras
      });

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

    const gridContainer = document.createElement('div');
    gridContainer.className = 'cameras-grid';
    gridContainer.dataset.areaId = 'cameras_section';
    gridContainer.dataset.sectionType = 'cameras';

    for (const entity of camerasEntities) {
      const cardConfig = this.createEntityCard(entity.entity_id, hass, entity);
      if (cardConfig) {
        cardConfig.section_type = 'cameras';
        this.createAndAppendCard(cardConfig, gridContainer, hass);
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

  private createAndAppendCard(cardConfig: any, gridContainer: HTMLElement, hass: any): void {
    const { wrapper } = createCardWrapper(cardConfig, 'cameras_section', hass);
    gridContainer.appendChild(wrapper);
  }

  public updateDragAndDrop(editMode: boolean, container: HTMLElement) {
    setGridEditMode(this.dragAndDropManager, editMode, container);
  }

  private handleSaveCurrentOrder(areaId: string, grid: HTMLElement) {
    this.customizationManager?.saveCardOrderWithContext(areaId, readGridOrder(grid), 'cameras');
  }
}
