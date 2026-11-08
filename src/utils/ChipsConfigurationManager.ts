import { DeviceGroup } from '../config/DashboardConfig';
import { ChipsConfig } from '../sections/HomeChips';
import { CustomizationManager } from './CustomizationManager';

export interface ChipsSettings {
  enabled: boolean;
  chips_config: ChipsConfig;
}

export class ChipsConfigurationManager {
  private static readonly DEFAULT_CHIPS_SETTINGS: ChipsSettings = {
    enabled: true,
    chips_config: {
      climate: {
        group: DeviceGroup.CLIMATE,
        enabled: true,
        show_when_zero: true
      },
      lights: {
        group: DeviceGroup.LIGHTING,
        enabled: true,
        show_when_zero: false
      },
      security: {
        group: DeviceGroup.SECURITY,
        enabled: true,
        show_when_zero: true
      },
      media: {
        group: DeviceGroup.MEDIA,
        enabled: true,
        show_when_zero: false,
      },
      water: {
        group: DeviceGroup.WATER,
        enabled: false, // Disabled by default since water sensors are less common
        show_when_zero: false
      }
    }
  };

  /**
   * Get the default chips settings
   */
  static getDefaultSettings(): ChipsSettings {
    return JSON.parse(JSON.stringify(this.DEFAULT_CHIPS_SETTINGS));
  }

  /**
   * Get chips settings from dashboard configuration
   */
  static getSettingsFromConfig(_dashboardConfig?: unknown): ChipsSettings {
    // For now, always use default settings - chips are enabled by default
    // In the future, users can configure this through the dashboard config
    return this.getDefaultSettings();
  }

  /**
   * Save chips order
   */
  static async saveChipsOrder(customizationManager: CustomizationManager, chipsOrder: string[]): Promise<void> {
    // Use the CustomizationManager's method which now handles the new structure
    await customizationManager.saveChipsOrder(chipsOrder);
  }
}
