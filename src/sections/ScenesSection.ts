import { CustomizationManager } from '../utils/CustomizationManager';
import { CardManager } from '../utils/CardManager';
import { Entity, CardConfig } from '../types/types';
import { DashboardConfig } from '../config/DashboardConfig';
import { localize } from '../utils/LocalizationService';
import { RTLHelper } from '../utils/RTLHelper';
import { escapeHtml } from '../utils/html';
import { orderScenes } from './sceneOrder';
import { setupDragScroll } from './dragScroll';

export class ScenesSection {
  private customizationManager: CustomizationManager;
  private cardManager: CardManager;

  constructor(customizationManager: CustomizationManager, cardManager?: CardManager) {
    this.customizationManager = customizationManager;
    this.cardManager = cardManager || new CardManager(customizationManager);
  }

  async render(
    container: HTMLElement,
    scenesEntities: Entity[],
    hass: any,
    onTallToggle?: (entityId: string, areaId: string) => void | Promise<void | boolean>,
    context: string = 'home',
    enableNavigation: boolean = true
  ): Promise<void> {
    const sortedScenes = this.sortScenes(scenesEntities, hass, 'scenes_section', context);
    
    // Add scenes section title with navigation
    const titleDiv = document.createElement('div');
    titleDiv.className = 'hg-section-title';
    
    if (enableNavigation) {
      // Create clickable wrapper for just the title text and chevron
      const clickableWrapper = document.createElement('div');
      clickableWrapper.className = 'clickable-section-title';
      clickableWrapper.innerHTML = `<span>${localize('section_titles.scenes')}</span><ha-icon icon="${RTLHelper.isRTL() ? 'mdi:chevron-left' : 'mdi:chevron-right'}" class="section-arrow"></ha-icon>`;
      
      // Add click handler to the wrapper
      clickableWrapper.addEventListener('click', () => {
        this.navigateToPath('scenes');
      });
      
      titleDiv.appendChild(clickableWrapper);
    } else {
      titleDiv.innerHTML = `<span>${localize('section_titles.scenes')}</span>`;
    }
    
    container.appendChild(titleDiv);
    
    // Create carousel container
    const carouselContainer = document.createElement('div');
    carouselContainer.className = 'carousel-container';
    
    const carouselGrid = document.createElement('div');
    carouselGrid.className = 'carousel-grid scenes';
    carouselGrid.dataset.areaId = 'scenes_section';
    carouselGrid.dataset.sectionType = 'scenes';
    
    // Create scene cards
    for (const entity of sortedScenes) {
      const cardConfig = this.createEntityCard(entity.entity_id, hass, entity);
      if (cardConfig) {
        cardConfig.section_type = 'scenes';
        await this.createAndAppendCard(cardConfig, carouselGrid, hass, onTallToggle, context);
      }
    }
    
    carouselContainer.appendChild(carouselGrid);
    
    // Add click-and-drag scrolling for desktop users
    setupDragScroll(carouselContainer);
    
    container.appendChild(carouselContainer);
  }

  private sortScenes(scenesEntities: Entity[], hass: any, areaId: string, context: string): Entity[] {
    const savedOrder = this.customizationManager.getSavedCarouselOrderWithContext(areaId, 'scenes', context) || [];
    return orderScenes(scenesEntities, savedOrder, hass.states);
  }

  private createEntityCard(entityId: string, hass: any, entity?: Entity): CardConfig | null {
    const state = hass.states[entityId];
    if (!state) {
      return null;
    }
    
    const friendlyName = state?.attributes?.friendly_name || entityId.split('.')[1].replace(/_/g, ' ');
    const domain = entityId.split('.')[0];
    
    // Determine card type and properties
    let cardType = 'custom:home-glass-card';
    let isTallCard = false;
    
    // Check if domain should be tall by default
    if (DashboardConfig.isDefaultTallDomain(domain)) {
      isTallCard = true;
    }
    
    // Check if there's a custom tall card setting from customizations
    if (entity && typeof (entity as any).is_tall !== 'undefined') {
      isTallCard = (entity as any).is_tall;
    }
    
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

  private async createAndAppendCard(
    cardConfig: any,
    container: HTMLElement,
    hass: any,
    onTallToggle?: (entityId: string, areaId: string) => void | Promise<void | boolean>,
    context: string = 'home'
  ): Promise<void> {
    try {
      let cardElement: HTMLElement;
      
      if (cardConfig.type === 'custom:home-glass-card') {
        cardElement = document.createElement('home-glass-card') as HTMLElement;
        
        // Determine if card should be tall based on customizations
        const shouldBeTall = this.cardManager.shouldCardBeTall(cardConfig.entity, container.dataset.areaId || 'unknown', context);
        const configWithTall = { ...cardConfig, is_tall: shouldBeTall };
        
        // Add default icon if specified
        if ((cardConfig as any).default_icon) {
          configWithTall.default_icon = (cardConfig as any).default_icon;
        }
        
        (cardElement as any).setConfig(configWithTall);
        (cardElement as any).hass = hass;
      } else {
        // Handle other card types
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
      
      // Check if this is a carousel container to adjust wrapper sizing
      const isCarousel = container.classList.contains('carousel-grid');
      
      // Determine if card should be tall based on customizations
      let shouldBeTall = this.cardManager.shouldCardBeTall(cardConfig.entity, container.dataset.areaId || 'unknown', context);
      
      
      if (shouldBeTall) {
        wrapper.classList.add('tall');
      }
      
      // Always add edit mode controls
      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'entity-controls';
      
      let controlsHTML = '';
      
      // Get entity domain to check if it's a camera or scene
      const entityDomain = cardConfig.entity ? cardConfig.entity.split('.')[0] : '';
      const isFixedSizeEntity = ['camera', 'scene', 'script'].includes(entityDomain);
      
      // Only show tall toggle for regular entities (not carousels, cameras, or scenes)
      if (!isCarousel && !isFixedSizeEntity) {
        controlsHTML = `
          <button class="entity-control-btn tall-toggle ${shouldBeTall ? 'active' : ''}" 
                  data-action="toggle-tall" 
                  title="Toggle card design">
            <ha-icon icon="mdi:${shouldBeTall ? 'arrow-collapse' : 'arrow-expand'}"></ha-icon>
          </button>
        `;
      }
      
      controlsDiv.innerHTML = controlsHTML;
      
      // Add event listeners for controls
      const tallToggle = controlsDiv.querySelector('.tall-toggle') as HTMLButtonElement;
      if (tallToggle && onTallToggle) {
        tallToggle.addEventListener('click', (e) => {
          e.stopPropagation();
          onTallToggle(cardConfig.entity, container.dataset.areaId || 'unknown');
        });
      }
      
      wrapper.appendChild(controlsDiv);
      wrapper.appendChild(cardElement);
      container.appendChild(wrapper);
      
    } catch (error) {
      console.error('Error creating card:', error);
    }
  }

  private navigateToPath(path: string) {
    const currentPath = window.location.pathname;
    let basePath = '';
    
    // Handle different dashboard URL patterns
    if (currentPath.startsWith('/lovelace/')) {
      basePath = '/lovelace/';
    } else if (currentPath === '/lovelace') {
      basePath = '/lovelace/';
    } else {
      // Custom dashboard: extract the dashboard name
      const pathParts = currentPath.split('/').filter(part => part.length > 0);
      if (pathParts.length > 0) {
        basePath = `/${pathParts[0]}/`;
      } else {
        basePath = '/lovelace/';
      }
    }
    
    // Clean path and construct full URL
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const newUrl = `${basePath}${cleanPath}`;
    
    // Navigate using Home Assistant's system
    window.history.pushState(null, '', newUrl);
    const event = new Event('location-changed', { bubbles: true, composed: true });
    window.dispatchEvent(event);
  }
}
