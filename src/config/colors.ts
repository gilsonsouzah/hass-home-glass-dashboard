import { localize } from '../utils/LocalizationService';
import { DeviceGroup } from './deviceGroup';

export interface GroupStyle {
  iconColor: string;
  activeIconColor?: string;
  icon: string;
  name: string | (() => string);
}

/** Apple Home color conventions per device group. */
export const GROUP_STYLES: Record<DeviceGroup, GroupStyle> = {
  [DeviceGroup.LIGHTING]: {
    iconColor: '#ffcc06', // Yellow for lights
    icon: 'mdi:lightbulb',
    name: () => localize('groups.lights'),
  },
  [DeviceGroup.CLIMATE]: {
    iconColor: '#00c0e8', // Blue for climate/fans/covers
    icon: 'mdi:fan',
    name: () => localize('groups.climate'),
  },
  [DeviceGroup.SECURITY]: {
    iconColor: '#00cbbf', // Teal for security devices
    icon: 'mdi:lock',
    name: () => localize('groups.security'),
  },
  [DeviceGroup.WATER]: {
    iconColor: '#0b78f6', // Dark blue for water devices
    icon: 'mdi:water-outline',
    name: () => localize('groups.water'),
  },
  [DeviceGroup.MEDIA]: {
    iconColor: '#ffffff', // White for media players
    activeIconColor: '#696969', // Dark grey when active for visibility
    icon: 'mdi:speaker',
    name: () => localize('groups.media'),
  },
  [DeviceGroup.VACUUM]: {
    iconColor: '#ff9500', // Soft orange for vacuums (Apple Home style)
    icon: 'mdi:robot-vacuum',
    name: () => localize('groups.vacuum'),
  },
  [DeviceGroup.ENERGY]: {
    iconColor: '#34C759', // Green for energy (Apple's energy color)
    icon: 'mdi:flash',
    name: () => localize('groups.energy'),
  },
  [DeviceGroup.OTHER]: {
    iconColor: '#ffcc0f', // Yellow for switches/outlets (same as lights)
    icon: 'mdi:light-switch',
    name: () => localize('groups.other'),
  },
};

export const INACTIVE_STYLE = {
  backgroundColor: 'var(--apple-card-bg-inactive, rgba(56, 56, 56, 0.46))',
  iconColor: 'var(--apple-icon-inactive, rgba(142, 142, 147, 0.8))',
  iconBackgroundColor: 'var(--apple-icon-bg-inactive, rgba(0, 0, 0, 0.2))',
  textColor: 'var(--apple-text-inactive, #ffffff)',
};

export const ACTIVE_BASE_STYLE = {
  backgroundColor: 'var(--apple-card-bg-active, #ffffff)',
  textColor: 'var(--apple-text-active, #1d1d1f)',
};

export const CLIMATE_MODE_COLORS = {
  heat: '#ff8d13',
  heating: '#ff8d13',
  cool: '#48a0ff',
  cooling: '#48a0ff',
  auto: '#34c759',
  heat_cool: '#34c759',
  dry: '#466680',
  fan_only: '#000000',
  off: '#ffffff',
};

export const WATER_HEATER_MODE_COLORS = {
  electric: '#ff8d13',
  gas: '#ff8d13',
  heat_pump: '#34c759',
  eco: '#34c759',
  high_demand: '#ff5500',
  performance: '#ff5500',
  off: '#ffffff',
};
