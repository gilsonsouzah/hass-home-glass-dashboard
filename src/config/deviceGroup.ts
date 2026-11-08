export const DeviceGroup = {
  LIGHTING: 'lighting',
  CLIMATE: 'climate',
  SECURITY: 'security',
  WATER: 'water',
  MEDIA: 'media',
  VACUUM: 'vacuum',
  ENERGY: 'energy',
  OTHER: 'other',
} as const;
export type DeviceGroup = (typeof DeviceGroup)[keyof typeof DeviceGroup];

export const DOMAIN_TO_GROUP: Record<string, DeviceGroup> = {
  light: DeviceGroup.LIGHTING,
  switch: DeviceGroup.OTHER,
  climate: DeviceGroup.CLIMATE,
  fan: DeviceGroup.CLIMATE,
  cover: DeviceGroup.CLIMATE, // garage doors and gates go to security in getDeviceGroup
  lock: DeviceGroup.SECURITY,
  alarm_control_panel: DeviceGroup.SECURITY,
  media_player: DeviceGroup.MEDIA,
  camera: DeviceGroup.SECURITY,
  binary_sensor: DeviceGroup.OTHER,
  sensor: DeviceGroup.OTHER,
  vacuum: DeviceGroup.VACUUM,
  water_heater: DeviceGroup.CLIMATE,
};

const SECURITY_SENSOR_CLASSES = new Set([
  'door',
  'window',
  'motion',
  'occupancy',
  'opening',
  'garage_door',
  'lock',
  'safety',
  'smoke',
  'gas',
  'carbon_monoxide',
  'tamper',
]);

export function isGarageDoorOrGate(_entityId: string, attributes: any): boolean {
  const deviceClass = attributes?.device_class?.toLowerCase();
  return deviceClass === 'garage' || deviceClass === 'gate';
}

export function isOutlet(_entityId: string, attributes: any): boolean {
  return attributes?.device_class?.toLowerCase() === 'outlet';
}

/** Returns undefined when the entity must be hidden (non-outlet switch with showSwitches === false). */
export function getDeviceGroup(
  domain: string,
  entityId?: string,
  attributes?: any,
  showSwitches?: boolean
): DeviceGroup | undefined {
  if (domain === 'cover' && entityId && attributes && isGarageDoorOrGate(entityId, attributes)) {
    return DeviceGroup.SECURITY;
  }

  if (domain === 'switch' && entityId && attributes) {
    // showSwitches undefined means the caller is styling an entity that already passed filtering
    if (isOutlet(entityId, attributes) || showSwitches !== false) return DeviceGroup.OTHER;
    return undefined;
  }

  if (domain === 'sensor' && attributes) {
    const { device_class: deviceClass, unit_of_measurement: unit } = attributes;
    if (deviceClass === 'temperature' || unit === '°C' || unit === '°F') return DeviceGroup.CLIMATE;
    if (deviceClass === 'humidity') return DeviceGroup.CLIMATE;
    if (deviceClass === 'illuminance' || unit === 'lx') return DeviceGroup.LIGHTING;
    if (deviceClass === 'energy' || deviceClass === 'power') return DeviceGroup.ENERGY;
    if (SECURITY_SENSOR_CLASSES.has(deviceClass)) return DeviceGroup.SECURITY;
    return DeviceGroup.OTHER;
  }

  if (domain === 'binary_sensor' && attributes) {
    const deviceClass = attributes.device_class;
    if (SECURITY_SENSOR_CLASSES.has(deviceClass)) return DeviceGroup.SECURITY;
    if (deviceClass === 'light') return DeviceGroup.LIGHTING;
    return DeviceGroup.OTHER;
  }

  return DOMAIN_TO_GROUP[domain];
}
