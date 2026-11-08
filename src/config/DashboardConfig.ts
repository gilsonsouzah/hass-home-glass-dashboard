import { EntityData, EntityState } from '../types/types';
import { localize } from '../utils/LocalizationService';
import {
  ACTIVE_BASE_STYLE,
  CLIMATE_MODE_COLORS,
  GROUP_STYLES,
  GroupStyle,
  INACTIVE_STYLE,
  WATER_HEATER_MODE_COLORS,
} from './colors';
import { DEFAULT_BACKGROUND } from './defaultBackground';
import { DOMAIN_TO_GROUP, DeviceGroup, getDeviceGroup, isGarageDoorOrGate, isOutlet } from './deviceGroup';
import { getFallbackIcon } from './icons';
import { getStateText, getUnavailableStateText } from './stateText';

export { DeviceGroup } from './deviceGroup';
export type { GroupStyle } from './colors';

/** Static facade over the config/* modules; callers import only this class. */
export class DashboardConfig {
  static readonly GROUP_STYLES = GROUP_STYLES;
  static readonly DOMAIN_TO_GROUP = DOMAIN_TO_GROUP;

  static readonly SUPPORTED_DOMAINS = [
    'light',
    'switch',
    'cover',
    'climate',
    'fan',
    'media_player',
    'lock',
    'alarm_control_panel',
    'scene',
    'script',
    'camera',
    'vacuum',
    'water_heater',
  ] as const;

  static readonly STATUS_SECTION_DOMAINS = ['sensor', 'binary_sensor'] as const;

  static readonly SCENES_DOMAINS = ['scene', 'script'] as const;

  static readonly CAMERAS_DOMAINS = ['camera'] as const;

  static readonly DEFAULT_TALL_DOMAINS = [
    'climate',
    'lock',
    'alarm_control_panel',
    'camera',
    'vacuum',
    'water_heater',
  ] as const;

  static isGarageDoorOrGate = isGarageDoorOrGate;
  static isOutlet = isOutlet;
  static getDeviceGroup = getDeviceGroup;

  static getGroupStyle(group: DeviceGroup): GroupStyle {
    return GROUP_STYLES[group];
  }

  static isSupportedDomain(domain: string): boolean {
    return this.SUPPORTED_DOMAINS.includes(domain as any);
  }

  static isStatusDomain(domain: string): boolean {
    return this.SUPPORTED_DOMAINS.includes(domain as any) || this.STATUS_SECTION_DOMAINS.includes(domain as any);
  }

  static isScenesDomain(domain: string): boolean {
    return this.SCENES_DOMAINS.includes(domain as any);
  }

  static isCamerasDomain(domain: string): boolean {
    return this.CAMERAS_DOMAINS.includes(domain as any);
  }

  static isSpecialSectionDomain(domain: string): boolean {
    return this.isScenesDomain(domain) || this.isCamerasDomain(domain);
  }

  static isDefaultTallDomain(domain: string): boolean {
    return this.DEFAULT_TALL_DOMAINS.includes(domain as any);
  }

  private static applyGroupStyling(group: DeviceGroup): Partial<EntityData> {
    const groupStyle = this.getGroupStyle(group);

    // Use activeIconColor if defined, otherwise default to white
    const iconColor = groupStyle.activeIconColor || '#ffffff';

    return {
      ...ACTIVE_BASE_STYLE,
      iconBackgroundColor: groupStyle.iconColor,
      iconColor,
    };
  }

  private static applyInactiveStyling(group?: DeviceGroup): Partial<EntityData> {
    if (group) {
      const groupStyle = this.getGroupStyle(group);
      return {
        ...INACTIVE_STYLE,
        iconColor: groupStyle.iconColor,
      };
    }
    return INACTIVE_STYLE;
  }

  private static applyClimateStyling(entityState: string, isActive: boolean): Partial<EntityData> {
    // Use known mode color, or fall back to heat orange for active / white for off
    const climateColor =
      (CLIMATE_MODE_COLORS as Record<string, string>)[entityState] ||
      (isActive ? CLIMATE_MODE_COLORS.heat : CLIMATE_MODE_COLORS.off);

    if (isActive) {
      // Active climate: white icon, colored background (but transparent for climate)
      return {
        ...ACTIVE_BASE_STYLE,
        iconBackgroundColor: 'transparent',
        iconColor: climateColor,
      };
    } else {
      // Inactive climate: colored icon, gray background
      return {
        ...INACTIVE_STYLE,
        iconColor: climateColor,
      };
    }
  }

  private static applyWaterHeaterStyling(entityState: string, isActive: boolean): Partial<EntityData> {
    const waterHeaterColor =
      (WATER_HEATER_MODE_COLORS as Record<string, string>)[entityState] ||
      (isActive ? WATER_HEATER_MODE_COLORS.electric : WATER_HEATER_MODE_COLORS.off);

    if (isActive) {
      // Active water heater: white icon, colored background (but transparent for temperature display)
      return {
        ...ACTIVE_BASE_STYLE,
        iconBackgroundColor: 'transparent',
        iconColor: waterHeaterColor,
      };
    } else {
      // Inactive water heater: colored icon, gray background
      return {
        ...INACTIVE_STYLE,
        iconColor: waterHeaterColor,
      };
    }
  }

  static getEntityData(
    state: EntityState,
    domain: string,
    isTall: boolean = false,
    forceWhiteIcons: boolean = false,
    hass?: any
  ): EntityData {
    const entityState = state.state;
    const attributes = state.attributes;

    // Handle unavailable, unknown, or other problematic states
    const isUnavailableState = ['unavailable', 'unknown', 'none', 'null', ''].includes(entityState.toLowerCase());

    // If unavailable, apply off styling and translate the status text
    if (isUnavailableState) {
      return {
        isActive: false,
        backgroundColor: INACTIVE_STYLE.backgroundColor,
        iconColor: '#ffffff', // White icon for unavailable entities
        iconBackgroundColor: INACTIVE_STYLE.iconBackgroundColor,
        textColor: INACTIVE_STYLE.textColor,
        stateText: getUnavailableStateText(entityState),
        icon: attributes.icon || getFallbackIcon(domain, entityState, attributes, state.entity_id),
      };
    }

    // Handle status domains (includes both supported and status-section domains)
    if (!this.isStatusDomain(domain)) {
      return this.handleUnsupportedDomain(entityState, attributes, domain, state.entity_id);
    }

    // Get device group and determine if active
    const deviceGroup = this.getDeviceGroup(domain, state.entity_id, attributes);
    const isActive = this.isEntityActive(domain, entityState);

    const icon = attributes.icon || getFallbackIcon(domain, entityState, attributes, state.entity_id);
    const stateText = getStateText(domain, entityState, attributes, hass);

    // Apply styling based on domain and state
    let styling: Partial<EntityData>;
    if (domain === 'climate') {
      styling = this.applyClimateStyling(entityState, isActive);
    } else if (domain === 'water_heater') {
      // Water heater domain uses special mode-based colors similar to climate
      styling = this.applyWaterHeaterStyling(entityState, isActive);
    } else if (isActive && deviceGroup) {
      // Use group-based styling for active devices
      styling = this.applyGroupStyling(deviceGroup);
    } else {
      // Use inactive styling with group color for icon
      styling = this.applyInactiveStyling(deviceGroup);
    }

    // Override icon color if forceWhiteIcons is true
    if (forceWhiteIcons) {
      styling = {
        ...styling,
        iconColor: '#ffffff',
      };
    }

    return {
      isActive,
      backgroundColor: styling.backgroundColor || INACTIVE_STYLE.backgroundColor,
      iconColor: styling.iconColor || INACTIVE_STYLE.iconColor,
      iconBackgroundColor: styling.iconBackgroundColor || INACTIVE_STYLE.iconBackgroundColor,
      textColor: styling.textColor || INACTIVE_STYLE.textColor,
      stateText,
      icon,
    };
  }

  private static isEntityActive(domain: string, entityState: string): boolean {
    let result;
    switch (domain) {
      case 'light':
      case 'switch':
      case 'fan':
        result = entityState === 'on';
        break;
      case 'cover':
        result = entityState === 'open' || entityState === 'opening';
        break;
      case 'climate':
      case 'water_heater':
        result = entityState !== 'off';
        break;
      case 'media_player':
        result = ['playing', 'paused', 'buffering', 'on'].includes(entityState);
        break;
      case 'lock':
        // Locked state should look like "off" (inactive), unlocked state is active
        result = entityState === 'unlocked';
        break;
      case 'alarm_control_panel':
        // Disarmed state should look like "off" (inactive), all other states are active
        result = entityState !== 'disarmed';
        break;
      case 'binary_sensor':
        // Most binary sensors are active when 'on', which corresponds to detected/open/unsafe states
        result = entityState === 'on';
        break;
      case 'sensor':
        // Sensors are always considered active for status display
        result = true;
        break;
      case 'vacuum':
        // Vacuum is active when cleaning, returning, or any state other than docked/idle/off
        result = ['cleaning', 'returning', 'paused'].includes(entityState);
        break;
      default:
        result = ['on', 'active', 'enabled', 'open', 'unlocked'].includes(entityState.toLowerCase());
    }

    return result;
  }

  private static handleUnsupportedDomain(
    entityState: string,
    attributes: any,
    domain: string,
    entityId?: string
  ): EntityData {
    const isActive = ['on', 'active', 'enabled', 'open', 'unlocked'].includes(entityState.toLowerCase());
    const stateText = isActive ? localize('status.on') : localize('status.off');
    const icon = attributes.icon || getFallbackIcon(domain, entityState, attributes, entityId);

    return {
      isActive,
      backgroundColor: isActive ? ACTIVE_BASE_STYLE.backgroundColor : INACTIVE_STYLE.backgroundColor,
      iconBackgroundColor: isActive ? '#34c759' : INACTIVE_STYLE.iconBackgroundColor,
      iconColor: isActive ? '#ffffff' : INACTIVE_STYLE.iconColor,
      textColor: isActive ? ACTIVE_BASE_STYLE.textColor : INACTIVE_STYLE.textColor,
      stateText,
      icon,
    };
  }

  static getDefaultBackground() {
    return DEFAULT_BACKGROUND;
  }
}
