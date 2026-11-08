import { CustomizationManager } from './CustomizationManager';
import { DashboardConfig } from '../config/DashboardConfig';

export class CardManager {
  private customizationManager: CustomizationManager;

  constructor(customizationManager: CustomizationManager) {
    this.customizationManager = customizationManager;
  }

  shouldCardBeTall(entityId: string, areaId: string, context: string = 'home'): boolean {
    let tallCards: string[] = [];
    
    if (context === 'home') {
      const homeData = this.customizationManager.getCustomization('home');
      tallCards = homeData.tall_cards || [];
    } else {
      const pagesData = this.customizationManager.getCustomization('pages');
      tallCards = pagesData[areaId]?.tall_cards || [];
    }
    
    const isTall = tallCards.includes(entityId);
    const isNotTall = tallCards.includes(`!${entityId}`);
    
    if (isTall) {
      return true;
    } else if (isNotTall) {
      return false;
    } else {
      // Default behavior
      const domain = entityId.split('.')[0];
      return DashboardConfig.isDefaultTallDomain(domain);
    }
  }

  async toggleTallCard(entityId: string, areaId: string, context: string = 'home'): Promise<boolean> {
    let tallCards: string[] = [];
    
    if (context === 'home') {
      const homeData = this.customizationManager.getCustomization('home');
      tallCards = homeData.tall_cards || [];
    } else {
      const pagesData = this.customizationManager.getCustomization('pages');
      if (!pagesData[areaId]) {
        pagesData[areaId] = {};
      }
      tallCards = pagesData[areaId].tall_cards || [];
    }
    
    const index = tallCards.indexOf(entityId);
    const inverseIndex = tallCards.indexOf(`!${entityId}`);
    
    let newTallState = false;
    
    if (index !== -1) {
      // Currently set as tall, remove it
      tallCards.splice(index, 1);
      tallCards.push(`!${entityId}`); // Mark as explicitly not tall
      newTallState = false;
    } else if (inverseIndex !== -1) {
      // Currently set as not tall, make it tall
      tallCards.splice(inverseIndex, 1);
      tallCards.push(entityId);
      newTallState = true;
    } else {
      // Not set, toggle based on default behavior
      const domain = entityId.split('.')[0];
      const defaultTall = DashboardConfig.isDefaultTallDomain(domain);
      
      if (defaultTall) {
        tallCards.push(`!${entityId}`); // Make it not tall
        newTallState = false;
      } else {
        tallCards.push(entityId); // Make it tall
        newTallState = true;
      }
    }
    
    // Save back to the correct location
    if (context === 'home') {
      const homeData = this.customizationManager.getCustomization('home');
      homeData.tall_cards = tallCards;
      await this.customizationManager.setCustomization('home', homeData);
    } else {
      const pagesData = this.customizationManager.getCustomization('pages');
      pagesData[areaId].tall_cards = tallCards;
      await this.customizationManager.setCustomization('pages', pagesData);
    }
    
    return newTallState;
  }
}
