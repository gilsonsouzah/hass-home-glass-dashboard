import { DashboardConfig } from '../../config/DashboardConfig';
import type { Entity } from '../../types/types';
import { localize } from '../../utils/LocalizationService';
import { calculateStatusValue } from './statusCalculators';

export interface StatusData {
  domain: string;
  icon: string;
  label: string;
  value: string;
  entityIds: string[];
  isVisible: boolean;
}

export function generateStatusData(entities: Entity[], hass: any): StatusData[] {
  const statusMap = new Map<string, StatusData>();

  const statusTypes = [
    { domain: 'lights', icon: 'mdi:lightbulb', label: localize('status_section.lights') },
    { domain: 'switches', icon: 'mdi:toggle-switch', label: localize('status_section.switches') },
    { domain: 'outlets', icon: 'mdi:power-socket', label: localize('status_section.outlets') },
    { domain: 'temperature', icon: 'mdi:thermometer', label: localize('status_section.temperature') },
    { domain: 'humidity', icon: 'mdi:water-percent', label: localize('status_section.humidity') },
    { domain: 'covers', icon: 'mdi:blinds-horizontal', label: localize('status_section.blinds') },
    { domain: 'gates', icon: 'mdi:garage-variant', label: localize('status_section.garage_doors') },
    { domain: 'security', icon: 'mdi:shield-check', label: localize('status_section.security') },
    { domain: 'locks', icon: 'mdi:lock', label: localize('status_section.locks') },
    { domain: 'motion', icon: 'mdi:motion-sensor', label: localize('status_section.motion') },
    { domain: 'occupancy', icon: 'mdi:account-check', label: localize('status_section.occupancy') },
    { domain: 'light_sensor', icon: 'mdi:brightness-6', label: localize('status_section.light') },
    { domain: 'smoke', icon: 'mdi:smoke-detector', label: localize('status_section.smoke') },
    { domain: 'gas', icon: 'mdi:gas-cylinder', label: localize('status_section.gas') },
    { domain: 'flood', icon: 'mdi:water-alert', label: localize('status_section.flood') },
    { domain: 'battery', icon: 'mdi:battery-low', label: localize('status_section.battery') },
    { domain: 'doors', icon: 'mdi:door', label: localize('status_section.doors') },
    { domain: 'windows', icon: 'mdi:window-open', label: localize('status_section.windows') },
    { domain: 'contact', icon: 'mdi:door-open', label: localize('contact.contact_sensors') },
    { domain: 'tvs', icon: 'mdi:television', label: localize('status_section.tvs') },
    { domain: 'speakers', icon: 'mdi:speaker', label: localize('status_section.speakers') },
  ];

  statusTypes.forEach((type) => {
    statusMap.set(type.domain, {
      domain: type.domain,
      icon: type.icon,
      label: type.label,
      value: '',
      entityIds: [],
      isVisible: false,
    });
  });

  entities.forEach((entity) => {
    const state = hass.states[entity.entity_id];
    if (!state) return; // Only skip entities with no state object at all

    const entityDomain = entity.entity_id.split('.')[0];
    const deviceClass = state.attributes?.device_class;

    categorizeEntity(entity.entity_id, entityDomain, deviceClass, state, statusMap);
  });

  statusTypes.forEach((type) => {
    const status = statusMap.get(type.domain);
    if (status && status.entityIds.length > 0) {
      const hasAvailableEntities = status.entityIds.some((entityId) => {
        const state = hass.states[entityId];
        return state && state.state !== 'unavailable' && state.state !== 'unknown';
      });

      if (hasAvailableEntities) {
        status.value = calculateStatusValue(type.domain, status.entityIds, hass);
        status.isVisible = true;
      }
    }
  });

  return Array.from(statusMap.values());
}

function categorizeEntity(
  entityId: string,
  domain: string,
  deviceClass: string | undefined,
  state: any,
  statusMap: Map<string, StatusData>
): void {
  if (domain === 'light') {
    statusMap.get('lights')?.entityIds.push(entityId);
  }

  else if (domain === 'switch') {
    if (DashboardConfig.isOutlet(entityId, state.attributes)) {
      statusMap.get('outlets')?.entityIds.push(entityId);
    } else {
      statusMap.get('switches')?.entityIds.push(entityId);
    }
  }

  else if (
    domain === 'sensor' &&
    (deviceClass === 'temperature' ||
      state.attributes?.unit_of_measurement === '°C' ||
      state.attributes?.unit_of_measurement === '°F')
  ) {
    statusMap.get('temperature')?.entityIds.push(entityId);
  }
  else if (domain === 'climate' || domain === 'water_heater') {
    statusMap.get('temperature')?.entityIds.push(entityId);
  }

  else if (domain === 'sensor' && deviceClass === 'humidity') {
    statusMap.get('humidity')?.entityIds.push(entityId);
  }

  else if (domain === 'cover') {
    if (DashboardConfig.isGarageDoorOrGate(entityId, state.attributes)) {
      statusMap.get('gates')?.entityIds.push(entityId);
    } else {
      statusMap.get('covers')?.entityIds.push(entityId);
    }
  }

  else if (domain === 'alarm_control_panel') {
    statusMap.get('security')?.entityIds.push(entityId);
  }

  else if (domain === 'lock') {
    statusMap.get('locks')?.entityIds.push(entityId);
  }

  else if (domain === 'binary_sensor' && deviceClass === 'motion') {
    statusMap.get('motion')?.entityIds.push(entityId);
  }

  else if (domain === 'binary_sensor' && deviceClass === 'occupancy') {
    statusMap.get('occupancy')?.entityIds.push(entityId);
  }

  else if (domain === 'sensor' && (deviceClass === 'illuminance' || state.attributes?.unit_of_measurement === 'lx')) {
    statusMap.get('light_sensor')?.entityIds.push(entityId);
  }

  else if (domain === 'binary_sensor' && deviceClass === 'smoke') {
    statusMap.get('smoke')?.entityIds.push(entityId);
  }

  else if (domain === 'binary_sensor' && deviceClass === 'gas') {
    statusMap.get('gas')?.entityIds.push(entityId);
  }

  else if (domain === 'binary_sensor' && (deviceClass === 'moisture' || deviceClass === 'water_leak')) {
    statusMap.get('flood')?.entityIds.push(entityId);
  }

  else if (domain === 'sensor' && deviceClass === 'battery' && parseFloat(state.state) < 20) {
    statusMap.get('battery')?.entityIds.push(entityId);
  }

  else if (domain === 'binary_sensor' && deviceClass === 'door') {
    statusMap.get('doors')?.entityIds.push(entityId);
  }

  else if (domain === 'binary_sensor' && deviceClass === 'window') {
    statusMap.get('windows')?.entityIds.push(entityId);
  }

  else if (domain === 'binary_sensor' && deviceClass === 'opening') {
    statusMap.get('contact')?.entityIds.push(entityId);
  }

  else if (domain === 'media_player' && (deviceClass === 'tv' || entityId.includes('tv'))) {
    statusMap.get('tvs')?.entityIds.push(entityId);
  }

  else if (domain === 'media_player') {
    statusMap.get('speakers')?.entityIds.push(entityId);
  }
}
