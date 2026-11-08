import { CustomizationManager } from '../utils/CustomizationManager';
import { DashboardConfig } from '../config/DashboardConfig';
import { Entity, CardConfig } from '../types/types';
import { localize } from '../utils/LocalizationService';
import { escapeHtml } from '../utils/html';

export class FavoritesSection {
  private customizationManager: CustomizationManager;

  constructor(customizationManager: CustomizationManager) {
    this.customizationManager = customizationManager;
  }

  async render(
    container: HTMLElement,
    allEntities: Entity[],
    hass: any,
    onTallToggle?: (entityId: string, areaId: string) => void | Promise<void | boolean>
  ): Promise<void> {
    // Get favorite accessories from settings
    const favoriteAccessories = await this.customizationManager.getFavoriteAccessories();
    
    if (favoriteAccessories.length === 0) {
      return; // Don't render if no favorites
    }

    // Get extra accessories to also allow them as favorites
    const extraAccessories = await this.customizationManager.getExtraAccessories();

    // Filter entities to only show favorites that exist and are supported (or manually included)
    const favoriteEntities = favoriteAccessories
      .map((entityId: string) => {
        const state = hass.states[entityId];
        if (!state) {
          return null;
        }
        
        // hass.entities is the display registry: it exposes `hidden`, not `hidden_by`
        if (hass.entities?.[entityId]?.hidden) {
          return null;
        }
        
        const domain = entityId.split('.')[0];
        
        // Allow entity if it's a supported domain OR if it's in the extraAccessories list
        const isManuallyIncluded = extraAccessories.includes(entityId);
        if (!DashboardConfig.isSupportedDomain(domain) && !isManuallyIncluded) {
          return null;
        }
        
        return {
          entity_id: entityId,
          name: state.attributes.friendly_name || entityId,
          area_id: state.attributes.area_id || 'favorites_section', // Use special area for favorites
          domain: domain
        };
      })
      .filter(Boolean) as Entity[];

    if (favoriteEntities.length === 0) {
      return; // Don't render if no valid favorites
    }

    // Add favorites section title
    const titleDiv = document.createElement('div');
    titleDiv.className = 'hg-section-title';
    titleDiv.innerHTML = `<span>${localize('section_titles.favorites')}</span>`;
    container.appendChild(titleDiv);

    // Create cards container using the same class as AreaSection
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'area-entities'; // Use same class as other sections
    cardsContainer.dataset.areaId = 'favorites'; // Set area ID for customizations
    container.appendChild(cardsContainer);

    // Apply saved card order if available
    const savedOrder = this.customizationManager.getSavedCardOrderWithContext('favorites', 'home');
    let orderedEntities = [...favoriteEntities];
    
    if (savedOrder && savedOrder.length > 0) {
      orderedEntities = this.customizationManager.applySavedCardOrder(favoriteEntities, savedOrder);
    }

    // Create cards for each favorite entity in the correct order
    for (const entity of orderedEntities) {
      await this.createAndAppendCard(entity, cardsContainer, hass);
    }
  }

  private async createAndAppendCard(
    entity: Entity,
    container: HTMLElement,
    hass: any
  ): Promise<void> {
    try {
      // Create card config using the same pattern as AreaSection
      const cardConfig = this.createEntityCard(entity.entity_id, hass);
      if (!cardConfig) {
        console.warn(`Failed to create card config for entity: ${entity.entity_id}`);
        return;
      }

      // Use the same card creation logic as AreaSection
      let cardElement: HTMLElement;
      
      if (cardConfig.type === 'custom:home-glass-card') {
        cardElement = document.createElement('home-glass-card') as HTMLElement;
        
        // For favorites, always use regular size (not tall)
        const configWithTall = { ...cardConfig, is_tall: false };
        
        (cardElement as any).setConfig(configWithTall);
        (cardElement as any).hass = hass;
      } else {
        // Handle other card types (same as AreaSection)
        const customCardType = cardConfig.type.replace('custom:', '');
        if (customElements.get(customCardType)) {
          cardElement = document.createElement(customCardType);
          if (cardElement && typeof (cardElement as any).setConfig === 'function') {
            (cardElement as any).setConfig(cardConfig);
            (cardElement as any).hass = hass;
          }
        } else {
          cardElement = document.createElement('div');
          cardElement.innerHTML = `<div style="color: red;">Unknown card type: ${escapeHtml(cardConfig.type)}</div>`;
        }
      }
      
      const wrapper = document.createElement('div');
      wrapper.className = 'entity-card-wrapper';
      wrapper.dataset.entityId = cardConfig.entity;
      
      // Favorites are always regular size, never tall
      // Don't add tall class
      
      wrapper.appendChild(cardElement);
      container.appendChild(wrapper);
    } catch (error) {
      console.error(`Error creating card for entity ${entity.entity_id}:`, error);
    }
  }

  private createEntityCard(entityId: string, hass: any): CardConfig | null {
    const state = hass.states[entityId];
    if (!state) {
      console.warn(`Entity ${entityId} not found in hass.states`);
      return null;
    }

    const domain = entityId.split('.')[0];
    let friendlyName = state.attributes?.friendly_name || entityId;
    
    // Determine card type and properties
    let cardType = 'custom:home-glass-card';
    let isTallCard = false; // Favorites are always regular size
    
    const card: CardConfig = {
      type: cardType,
      entity: entityId,
      name: friendlyName,
      domain: domain,
      is_tall: isTallCard
    };
    
    // Add default icon for scenes/scripts without icons
    if (DashboardConfig.isScenesDomain(domain) && !state.attributes?.icon) {
      (card as any).default_icon = 'mdi:home';
    }
    
    return card;
  }
}
