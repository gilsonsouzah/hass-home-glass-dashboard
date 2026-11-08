import { localize } from '../utils/LocalizationService';
import { DeviceGroup } from './deviceGroup';

export interface GroupStyle {
  iconColor: string;
  activeIconColor?: string;
  icon: string;
  name: string | (() => string);
}

const systemColor = (name: string) => `var(--hg-color-${name})`;

/** Glyph drawn on a solid domain-colored icon well; stays white in both schemes. */
export const GLYPH_ON_COLOR = '#ffffff';

export const GENERIC_ACTIVE_ICON_BG = systemColor('green');

export const GROUP_STYLES: Record<DeviceGroup, GroupStyle> = {
  [DeviceGroup.LIGHTING]: {
    iconColor: systemColor('yellow'),
    icon: 'mdi:lightbulb',
    name: () => localize('groups.lights'),
  },
  [DeviceGroup.CLIMATE]: {
    iconColor: systemColor('cyan'),
    icon: 'mdi:fan',
    name: () => localize('groups.climate'),
  },
  [DeviceGroup.SECURITY]: {
    iconColor: systemColor('mint'),
    icon: 'mdi:lock',
    name: () => localize('groups.security'),
  },
  [DeviceGroup.WATER]: {
    iconColor: systemColor('blue'),
    icon: 'mdi:water-outline',
    name: () => localize('groups.water'),
  },
  [DeviceGroup.MEDIA]: {
    iconColor: systemColor('gray'),
    icon: 'mdi:speaker',
    name: () => localize('groups.media'),
  },
  [DeviceGroup.VACUUM]: {
    iconColor: systemColor('orange'),
    icon: 'mdi:robot-vacuum',
    name: () => localize('groups.vacuum'),
  },
  [DeviceGroup.ENERGY]: {
    iconColor: systemColor('green'),
    icon: 'mdi:flash',
    name: () => localize('groups.energy'),
  },
  [DeviceGroup.OTHER]: {
    iconColor: systemColor('yellow'),
    icon: 'mdi:light-switch',
    name: () => localize('groups.other'),
  },
};

export const INACTIVE_STYLE = {
  backgroundColor: 'var(--hg-glass-regular)',
  iconColor: systemColor('gray'),
  iconBackgroundColor: 'var(--hg-fill)',
  textColor: 'var(--hg-label)',
};

export const UNAVAILABLE_STYLE = {
  ...INACTIVE_STYLE,
  iconColor: 'var(--hg-label-secondary)',
};

export const ACTIVE_BASE_STYLE = {
  backgroundColor: 'var(--hg-fill-active)',
  textColor: 'var(--hg-label-on-active)',
};

export const CLIMATE_MODE_COLORS = {
  heat: systemColor('orange'),
  heating: systemColor('orange'),
  cool: systemColor('blue'),
  cooling: systemColor('blue'),
  auto: systemColor('green'),
  heat_cool: systemColor('green'),
  dry: systemColor('gray'),
  fan_only: 'var(--hg-label-on-active)',
  off: 'var(--hg-label)',
};

export const WATER_HEATER_MODE_COLORS = {
  electric: systemColor('orange'),
  gas: systemColor('orange'),
  heat_pump: systemColor('green'),
  eco: systemColor('green'),
  high_demand: systemColor('red'),
  performance: systemColor('red'),
  off: 'var(--hg-label)',
};
