import { localize } from '../../utils/LocalizationService';
import { summarizeSecurity } from '../chipStatus';

export function calculateStatusValue(domain: string, entityIds: string[], hass: any): string {
  switch (domain) {
    case 'lights':
    case 'switches':
    case 'outlets':
      return calculateOnOffStatus(entityIds, hass);

    case 'temperature':
      return calculateTemperatureRange(entityIds, hass);

    case 'humidity':
      return calculateHumidityRange(entityIds, hass);

    case 'covers':
    case 'gates':
      return calculateCoverStatus(entityIds, hass);

    case 'security':
      return calculateSecurityStatus(entityIds, hass);

    case 'locks':
      return calculateLockStatus(entityIds, hass);

    case 'motion':
      return calculateMotionStatus(entityIds, hass);

    case 'occupancy':
      return calculateOccupancyStatus(entityIds, hass);

    case 'light_sensor':
      return calculateLightSensorRange(entityIds, hass);

    case 'smoke':
      return calculateSmokeStatus(entityIds, hass);

    case 'gas':
      return calculateGasStatus(entityIds, hass);

    case 'flood':
      return calculateFloodStatus(entityIds, hass);

    case 'battery':
      return entityIds.length === 1
        ? localize('battery.low_battery')
        : localize('battery.low_battery_count').replace('{count}', entityIds.length.toString());

    case 'doors':
    case 'windows':
    case 'contact':
      return calculateContactStatus(entityIds, hass);

    case 'tvs':
    case 'speakers':
      return calculateMediaStatus(entityIds, hass);

    default:
      return '';
  }
}

function calculateOnOffStatus(entityIds: string[], hass: any): string {
  const onCount = entityIds.filter((id) => {
    const state = hass.states[id];
    return state && (state.state === 'on' || state.state === 'playing');
  }).length;

  if (onCount === 0) {
    return localize('lights.all_off');
  } else if (onCount === entityIds.length) {
    return onCount === 1 ? localize('lights.on') : localize('lights.all_on');
  } else {
    return `${onCount} ${localize('lights.on')}`;
  }
}

function calculateTemperatureRange(entityIds: string[], hass: any): string {
  const temperatures: number[] = [];

  entityIds.forEach((id) => {
    const state = hass.states[id];
    if (!state) return;

    let temp: number | undefined;

    const domain = id.split('.')[0];
    if (domain === 'climate') {
      temp = state.attributes?.current_temperature;
    } else {
      temp = parseFloat(state.state);
    }

    if (typeof temp === 'number' && !isNaN(temp) && temp > -100 && temp < 200) { // Reasonable temperature range
      temperatures.push(temp);
    }
  });

  if (temperatures.length === 0) return '';
  if (temperatures.length === 1) return `${temperatures[0].toFixed(1)}°`;

  const min = Math.min(...temperatures);
  const max = Math.max(...temperatures);

  if (Math.abs(min - max) < 0.1) {
    return `${min.toFixed(1)}°`;
  }

  return `${min.toFixed(1)}°-${max.toFixed(1)}°`;
}

function calculateHumidityRange(entityIds: string[], hass: any): string {
  const humidities: number[] = [];

  entityIds.forEach((id) => {
    const state = hass.states[id];
    if (state) {
      const humidity = parseFloat(state.state);
      if (!isNaN(humidity) && humidity >= 0 && humidity <= 100) {
        humidities.push(Math.round(humidity)); // Round to whole numbers for better display
      }
    }
  });

  if (humidities.length === 0) return '';
  if (humidities.length === 1) return `${humidities[0]}%`;

  const min = Math.min(...humidities);
  const max = Math.max(...humidities);

  if (min === max) {
    return `${min}%`;
  }

  return `${min}%-${max}%`;
}

function calculateCoverStatus(entityIds: string[], hass: any): string {
  const openCount = entityIds.filter((id) => {
    const state = hass.states[id];
    return state && state.state === 'open';
  }).length;

  if (openCount === 0) {
    return localize('covers.all_closed');
  } else if (openCount === entityIds.length) {
    return openCount === 1 ? localize('covers.open') : localize('covers.all_open');
  } else {
    return `${openCount} ${localize('covers.open')}`;
  }
}

function calculateSecurityStatus(entityIds: string[], hass: any): string {
  if (entityIds.length === 1) {
    const state = hass.states[entityIds[0]];
    return state?.state?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Unknown';
  }

  const { armed, triggered } = summarizeSecurity(
    entityIds.map((id) => ({ entity_id: id, state: hass.states[id]?.state ?? '' }))
  );
  if (triggered > 0) return `${triggered} ${localize('status.triggered')}`;
  return armed === 0 ? localize('status.disarmed') : `${armed} ${localize('status.armed')}`;
}

function calculateLockStatus(entityIds: string[], hass: any): string {
  const unlockedCount = entityIds.filter((id) => {
    const state = hass.states[id];
    return state && state.state === 'unlocked';
  }).length;

  if (unlockedCount === 0) {
    return localize('status_section.all_locked');
  } else if (unlockedCount === entityIds.length) {
    return unlockedCount === 1 ? localize('status.unlocked') : localize('status_section.all_unlocked');
  } else {
    return `${unlockedCount} ${localize('status.unlocked')}`;
  }
}

function countOn(entityIds: string[], hass: any): number {
  return entityIds.filter((id) => hass.states[id]?.state === 'on').length;
}

function calculateMotionStatus(entityIds: string[], hass: any): string {
  const activeCount = countOn(entityIds, hass);

  if (activeCount === 0) {
    return localize('motion.not_detected');
  } else if (activeCount === 1) {
    return localize('motion.detected');
  } else {
    return `${activeCount} ${localize('motion.detected')}`;
  }
}

function calculateOccupancyStatus(entityIds: string[], hass: any): string {
  const activeCount = countOn(entityIds, hass);

  if (activeCount === 0) {
    return localize('occupancy.not_detected');
  } else if (activeCount === 1) {
    return localize('occupancy.detected');
  } else {
    return `${activeCount} ${localize('occupancy.detected')}`;
  }
}

function calculateLightSensorRange(entityIds: string[], hass: any): string {
  const luxValues: number[] = [];

  entityIds.forEach((id) => {
    const state = hass.states[id];
    if (state) {
      const lux = parseFloat(state.state);
      if (!isNaN(lux) && lux >= 0) {
        luxValues.push(Math.round(lux));
      }
    }
  });

  if (luxValues.length === 0) return '';
  if (luxValues.length === 1) return `${luxValues[0]} lx`;

  const min = Math.min(...luxValues);
  const max = Math.max(...luxValues);

  if (min === max) {
    return `${min} lx`;
  }

  return `${min}-${max} lx`;
}

function calculateSmokeStatus(entityIds: string[], hass: any): string {
  const detectedCount = countOn(entityIds, hass);

  return detectedCount === 0 ? localize('smoke.not_detected') : localize('smoke.detected');
}

function calculateGasStatus(entityIds: string[], hass: any): string {
  const detectedCount = countOn(entityIds, hass);

  return detectedCount === 0 ? localize('gas.not_detected') : localize('gas.detected');
}

function calculateFloodStatus(entityIds: string[], hass: any): string {
  const detectedCount = countOn(entityIds, hass);

  return detectedCount === 0 ? localize('flood.not_detected') : localize('flood.detected');
}

function calculateContactStatus(entityIds: string[], hass: any): string {
  const openCount = countOn(entityIds, hass);

  if (openCount === 0) {
    return localize('contact.all_closed');
  } else if (openCount === 1) {
    return `1 ${localize('covers.open')}`;
  } else {
    return `${openCount} ${localize('covers.open')}`;
  }
}

function calculateMediaStatus(entityIds: string[], hass: any): string {
  const playingCount = entityIds.filter((id) => {
    const state = hass.states[id];
    return state && state.state === 'playing';
  }).length;

  if (playingCount > 0) {
    return playingCount === 1 ? localize('media.playing') : `${playingCount} ${localize('media.multiple_playing')}`;
  }

  const onCount = entityIds.filter((id) => {
    const state = hass.states[id];
    return state && !['off', 'unavailable', 'unknown', 'standby'].includes(state.state);
  }).length;

  if (onCount === 0) {
    return localize('lights.all_off');
  } else if (onCount === entityIds.length) {
    return onCount === 1 ? localize('lights.on') : localize('lights.all_on');
  } else {
    return `${onCount} ${localize('lights.on')}`;
  }
}
