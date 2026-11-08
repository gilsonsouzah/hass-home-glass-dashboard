import { EntityData, EntityState } from '../types/types';
import { localize } from '../utils/LocalizationService';
import {
  ACTIVE_BASE_STYLE,
  CLIMATE_MODE_COLORS,
  GENERIC_ACTIVE_ICON_BG,
  GLYPH_ON_COLOR,
  GROUP_STYLES,
  GroupStyle,
  INACTIVE_STYLE,
  UNAVAILABLE_STYLE,
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

    const iconColor = groupStyle.activeIconColor || GLYPH_ON_COLOR;

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
    // Use known mode color, or fall back to heat orange for active / label color for off
    const climateColor =
      (CLIMATE_MODE_COLORS as Record<string, string>)[entityState] ||
      (isActive ? CLIMATE_MODE_COLORS.heat : CLIMATE_MODE_COLORS.off);

    if (isActive) {
      return {
        ...ACTIVE_BASE_STYLE,
        iconBackgroundColor: 'transparent',
        iconColor: climateColor,
      };
    } else {
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
      return {
        ...ACTIVE_BASE_STYLE,
        iconBackgroundColor: 'transparent',
        iconColor: waterHeaterColor,
      };
    } else {
      return {
        ...INACTIVE_STYLE,
        iconColor: waterHeaterColor,
      };
    }
  }

  static isUnavailable(state: EntityState): boolean {
    return ['unavailable', 'unknown', 'none', 'null', ''].includes(state.state.toLowerCase());
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

    if (this.isUnavailable(state)) {
      return {
        isActive: false,
        backgroundColor: UNAVAILABLE_STYLE.backgroundColor,
        iconColor: UNAVAILABLE_STYLE.iconColor,
        iconBackgroundColor: UNAVAILABLE_STYLE.iconBackgroundColor,
        textColor: UNAVAILABLE_STYLE.textColor,
        stateText: getUnavailableStateText(entityState),
        icon: attributes.icon || getFallbackIcon(domain, entityState, attributes, state.entity_id),
      };
    }

    if (!this.isStatusDomain(domain)) {
      return this.handleUnsupportedDomain(entityState, attributes, domain, state.entity_id);
    }

    const deviceGroup = this.getDeviceGroup(domain, state.entity_id, attributes);
    const isActive = this.isEntityActive(domain, entityState);

    const icon = attributes.icon || getFallbackIcon(domain, entityState, attributes, state.entity_id);
    const stateText = getStateText(domain, entityState, attributes, hass);

    let styling: Partial<EntityData>;
    if (domain === 'climate') {
      styling = this.applyClimateStyling(entityState, isActive);
    } else if (domain === 'water_heater') {
      styling = this.applyWaterHeaterStyling(entityState, isActive);
    } else if (isActive && deviceGroup) {
      styling = this.applyGroupStyling(deviceGroup);
    } else {
      styling = this.applyInactiveStyling(deviceGroup);
    }

    if (forceWhiteIcons) {
      styling = {
        ...styling,
        iconColor: GLYPH_ON_COLOR,
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
        result = true;
        break;
      case 'vacuum':
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
      iconBackgroundColor: isActive ? GENERIC_ACTIVE_ICON_BG : INACTIVE_STYLE.iconBackgroundColor,
      iconColor: isActive ? GLYPH_ON_COLOR : INACTIVE_STYLE.iconColor,
      textColor: isActive ? ACTIVE_BASE_STYLE.textColor : INACTIVE_STYLE.textColor,
      stateText,
      icon,
    };
  }

  static getDefaultBackground() {
    return DEFAULT_BACKGROUND;
  }
}
