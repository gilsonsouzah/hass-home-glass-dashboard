import { isGarageDoorOrGate, isOutlet } from './deviceGroup';

function getMediaPlayerIcon(entityState: string, attributes: any): string {
  const deviceClass = attributes.device_class;

  // Use device class for specific icons (no state-based changes)
  switch (deviceClass) {
    case 'tv':
      return 'mdi:television';
    case 'speaker':
      return 'mdi:speaker';
    case 'receiver':
      return 'mdi:audio-video';
    case 'music':
      return 'mdi:music';
    default:
      // Fallback to generic cast icon
      return 'mdi:cast';
  }
}

export function getFallbackIcon(domain: string, entityState: string, attributes: any, entityId?: string): string {
  switch (domain) {
    case 'light':
      return 'mdi:lightbulb';
    case 'switch':
      // Special handling for outlets
      if (entityId && isOutlet(entityId, attributes)) {
        return 'mdi:power-socket';
      }
      // Fallback for other switches (though they should be hidden)
      return 'mdi:light-switch';
    case 'cover':
      // Special handling for garage doors and gates
      if (entityId && isGarageDoorOrGate(entityId, attributes)) {
        switch (entityState) {
          case 'opening':
            return 'mdi:garage-open';
          case 'closing':
            return 'mdi:garage';
          case 'open':
            return 'mdi:garage-open';
          case 'closed':
          default:
            return 'mdi:garage';
        }
      }
      // Regular covers (blinds, shutters, etc.)
      if (entityState === 'opening' || entityState === 'closing') {
        return 'mdi:window-shutter-cog';
      }
      return entityState === 'open' ? 'mdi:window-shutter-open' : 'mdi:window-shutter';
    case 'climate':
      return 'mdi:thermostat';
    case 'water_heater':
      return 'mdi:water-boiler';
    case 'fan':
      return 'mdi:fan';
    case 'media_player':
      return getMediaPlayerIcon(entityState, attributes);
    case 'lock':
      return entityState === 'unlocked' ? 'mdi:lock-open' : 'mdi:lock';
    case 'alarm_control_panel':
      return 'mdi:alarm-light';
    case 'button':
      return 'mdi:gesture-tap-button';
    case 'input_boolean':
      return entityState === 'on' ? 'mdi:toggle-switch' : 'mdi:toggle-switch-off';
    case 'input_button':
      return 'mdi:gesture-tap-button';
    case 'vacuum':
      return 'mdi:robot-vacuum';
    case 'scene':
      return 'mdi:palette';
    case 'script':
      return 'mdi:script-text';
    case 'sensor': {
      const dc = attributes?.device_class;
      if (dc === 'energy') return 'mdi:flash';
      if (dc === 'power') return 'mdi:flash';
      if (dc === 'temperature') return 'mdi:thermometer';
      if (dc === 'humidity') return 'mdi:water-percent';
      if (dc === 'battery') return 'mdi:battery';
      if (dc === 'illuminance') return 'mdi:brightness-5';
      return 'mdi:eye';
    }
    case 'binary_sensor': {
      const bdc = attributes?.device_class;
      if (bdc === 'motion') return entityState === 'on' ? 'mdi:motion-sensor' : 'mdi:motion-sensor-off';
      if (bdc === 'door') return entityState === 'on' ? 'mdi:door-open' : 'mdi:door-closed';
      if (bdc === 'window') return entityState === 'on' ? 'mdi:window-open' : 'mdi:window-closed';
      if (bdc === 'smoke') return 'mdi:smoke-detector';
      if (bdc === 'gas') return 'mdi:gas-cylinder';
      if (bdc === 'moisture') return 'mdi:water-alert';
      if (bdc === 'occupancy') return 'mdi:home-account';
      if (bdc === 'light') return 'mdi:brightness-5';
      return entityState === 'on' ? 'mdi:checkbox-marked-circle' : 'mdi:checkbox-blank-circle-outline';
    }
    default:
      return 'mdi:help-circle';
  }
}
