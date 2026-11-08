import { CustomizationManager } from '../utils/CustomizationManager';
import { DataService } from '../utils/DataService';
import { DashboardConfig } from '../config/DashboardConfig';
import { Entity } from '../types/types';
import { DragAndDropManager } from '../utils/DragAndDropManager';
import { localize } from '../utils/LocalizationService';
import { resetPage } from './pageChrome';
import { createCardWrapper, readGridOrder, setGridEditMode } from './cardGrid';
import { sortBySavedOrder } from './homeOrdering';

export class ScenesPage {
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
      const entities = await DataService.getEntities(hass);
      
      // Filter entities for scenes and scripts and exclude those marked for exclusion
      const allScenesEntities = entities.filter(entity => {
        const domain = entity.entity_id.split('.')[0];
        return DashboardConfig.isScenesDomain(domain);
      });

      const scenesEntities = [];
      for (const entity of allScenesEntities) {
        const isExcluded = await this.customizationManager?.isEntityExcludedFromDashboard(entity.entity_id) || false;
        if (!isExcluded) {
          scenesEntities.push(entity);
        }
      }

      if (!this.customizationManager) {
        throw new Error(localize('errors.customization_manager_not_initialized'));
      }
      
      const savedOrder = this.customizationManager.getSavedCardOrderWithContext('scenes_section', 'scenes');
      const sorted = sortBySavedOrder(scenesEntities, savedOrder, (entity) => entity.entity_id);

      // Apply tall card settings - handled by CardManager in the new structure
      sorted.forEach(entity => {
        (entity as any).is_tall = false; // Default for scenes
      });

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

    const gridContainer = document.createElement('div');
    gridContainer.className = 'scenes-grid';
    gridContainer.dataset.areaId = 'scenes_section';
    gridContainer.dataset.sectionType = 'scenes';

    for (const entity of scenesEntities) {
      const cardConfig = this.createEntityCard(entity.entity_id, hass, entity);
      if (cardConfig) {
        cardConfig.section_type = 'scenes';
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
      area_id: 'scenes_section',
      is_tall: (entity as any).is_tall !== undefined ? (entity as any).is_tall : false // Scenes are typically not tall by default
    };

    return cardConfig;
  }

  private createAndAppendCard(cardConfig: any, gridContainer: HTMLElement, hass: any): void {
    const { wrapper } = createCardWrapper(cardConfig, 'scenes_section', hass);
    gridContainer.appendChild(wrapper);
  }

  public updateDragAndDrop(editMode: boolean, container: HTMLElement) {
    setGridEditMode(this.dragAndDropManager, editMode, container);
  }

  private handleSaveCurrentOrder(areaId: string, grid: HTMLElement) {
    this.customizationManager?.saveCardOrderWithContext(areaId, readGridOrder(grid), 'scenes');
  }
}
