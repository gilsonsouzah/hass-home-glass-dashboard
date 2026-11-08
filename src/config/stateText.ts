import { localize } from '../utils/LocalizationService';

/** [on, off] translation keys per binary_sensor device_class */
const BINARY_SENSOR_TEXT: Record<string, [string, string]> = {
  motion: ['motion.detected', 'motion.not_detected'],
  occupancy: ['occupancy.detected', 'occupancy.not_detected'],
  door: ['status.open', 'status.closed'],
  window: ['status.open', 'status.closed'],
  opening: ['status.open', 'status.closed'],
  garage_door: ['status.open', 'status.closed'],
  moisture: ['status.detected', 'status.clear'],
  gas: ['status.detected', 'status.clear'],
  problem: ['status.detected', 'status.clear'],
  sound: ['status.detected', 'status.clear'],
  vibration: ['status.detected', 'status.clear'],
  safety: ['status.unsafe', 'status.safe'],
  smoke: ['smoke.detected', 'smoke.not_detected'],
  lock: ['status.locked', 'status.unlocked'],
  plug: ['status.plugged_in', 'status.unplugged'],
  presence: ['status.home', 'status.away'],
  power: ['status.on', 'status.off'],
  running: ['status.running', 'status.idle'],
  update: ['status.update_available', 'status.up_to_date'],
};

export function getStateText(domain: string, entityState: string, attributes: any, hass?: any): string {
  switch (domain) {
    case 'light':
      if (entityState === 'on' && attributes.brightness) {
        const brightness = Math.round((attributes.brightness / 255) * 100);
        return `${brightness}%`;
      }
      return entityState === 'on' ? localize('status.on') : localize('status.off');

    case 'switch':
      return entityState === 'on' ? localize('status.on') : localize('status.off');

    case 'cover':
      if (entityState === 'closed') {
        return localize('status.closed');
      } else if (entityState === 'open') {
        const position = attributes.current_position;
        if (typeof position === 'number' && position < 100 && position > 0) {
          return `${position}% ${localize('status.open')}`;
        }
        return localize('status.open');
      } else {
        return humanizeState(entityState);
      }

    case 'climate':
      return getClimateStateText(entityState, attributes, hass);

    case 'water_heater':
      return getWaterHeaterStateText(entityState, attributes, hass);

    case 'fan':
      if (entityState === 'on' && attributes.percentage && typeof attributes.percentage === 'number') {
        return `${attributes.percentage}%`;
      }
      return entityState === 'on' ? localize('status.on') : localize('status.off');

    case 'media_player':
      return getMediaPlayerStateText(entityState);

    case 'lock':
      return getLockStateText(entityState);

    case 'alarm_control_panel':
      return getAlarmStateText(entityState);

    case 'binary_sensor':
      return getBinarySensorStateText(entityState, attributes);

    case 'sensor':
      return getSensorStateText(entityState, attributes);

    case 'vacuum':
      return getVacuumStateText(entityState);

    default:
      return entityState === 'on' ? localize('status.on') : localize('status.off');
  }
}

function getClimateStateText(entityState: string, attributes: any, hass?: any): string {
  const currentTemp = attributes.current_temperature;
  // Get temperature unit from entity attributes, or from Home Assistant config, or fallback to °C
  const tempUnit = attributes.unit_of_measurement || hass?.config?.unit_system?.temperature || '°C';

  // When active, show current temperature
  if (entityState !== 'off' && currentTemp !== undefined && currentTemp !== null) {
    return `${localize('status.current')}: ${currentTemp}${tempUnit}`;
  }

  switch (entityState) {
    case 'off':
      return localize('status.off');
    default:
      return humanizeState(entityState);
  }
}

function humanizeState(entityState: string): string {
  const words = entityState.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function getWaterHeaterStateText(entityState: string, attributes: any, hass?: any): string {
  const targetTemp = attributes.temperature;
  const tempUnit = attributes.unit_of_measurement || hass?.config?.unit_system?.temperature || '°C';

  if (entityState === 'off') {
    return localize('status.off');
  }

  // Handle boolean-like or unknown states from some integrations
  const lowerState = entityState.toLowerCase();
  const isGenericOn = lowerState === 'true' || lowerState === 'on';
  const modeLabel = isGenericOn
    ? localize('status.on')
    : entityState.charAt(0).toUpperCase() + entityState.slice(1).replace(/_/g, ' ');

  if (targetTemp) {
    return `${modeLabel} · ${targetTemp}${tempUnit}`;
  }

  return modeLabel;
}

function getMediaPlayerStateText(entityState: string): string {
  switch (entityState) {
    case 'playing':
      return localize('status.playing');
    case 'paused':
      return localize('status.paused');
    case 'buffering':
      return localize('status.buffering');
    case 'idle':
      return localize('status.idle');
    case 'standby':
      return localize('status.standby');
    case 'on':
      return localize('status.on');
    default:
      return localize('status.off');
  }
}

function getVacuumStateText(entityState: string): string {
  switch (entityState) {
    case 'cleaning':
      return localize('status.cleaning');
    case 'docked':
      return localize('status.docked');
    case 'returning':
      return localize('status.returning');
    case 'paused':
      return localize('status.paused');
    case 'idle':
      return localize('status.idle');
    case 'error':
      return localize('status.error');
    case 'off':
      return localize('status.off');
    default:
      return humanizeState(entityState);
  }
}

function getLockStateText(entityState: string): string {
  switch (entityState) {
    case 'locked':
      return localize('status.locked');
    case 'unlocked':
      return localize('status.unlocked');
    case 'open':
    case 'opening':
      return localize('status.open');
    case 'locking':
      return localize('status.locking');
    case 'unlocking':
      return localize('status.unlocking');
    case 'jammed':
      return localize('status.jammed');
    default:
      return localize('status.off');
  }
}

function getAlarmStateText(entityState: string): string {
  switch (entityState) {
    case 'disarmed':
      return localize('status.disarmed');
    case 'armed_home':
      return localize('status.armed_home');
    case 'armed_away':
      return localize('status.armed_away');
    case 'armed_night':
      return localize('status.armed_night');
    case 'armed_vacation':
      return localize('status.armed_vacation');
    case 'armed_custom_bypass':
      return localize('status.armed_custom_bypass');
    case 'pending':
      return localize('status.pending');
    case 'arming':
      return localize('status.arming');
    case 'disarming':
      return localize('status.disarming');
    case 'triggered':
      return localize('status.triggered');
    default:
      return localize('status.unknown');
  }
}

function getBinarySensorStateText(entityState: string, attributes: any): string {
  const [onKey, offKey] = BINARY_SENSOR_TEXT[attributes.device_class] ?? ['status.on', 'status.off'];
  return localize(entityState === 'on' ? onKey : offKey);
}

function getSensorStateText(entityState: string, attributes: any): string {
  const deviceClass = attributes.device_class;
  const unitOfMeasurement = attributes.unit_of_measurement;

  // If it has a unit of measurement, show the value with unit
  if (unitOfMeasurement && entityState !== 'unavailable' && entityState !== 'unknown') {
    return `${entityState} ${unitOfMeasurement}`;
  }

  // Handle special device classes
  switch (deviceClass) {
    case 'battery':
      return entityState !== 'unavailable' && entityState !== 'unknown' ? `${entityState}%` : entityState;
    case 'humidity':
      return entityState !== 'unavailable' && entityState !== 'unknown' ? `${entityState}%` : entityState;
    case 'temperature':
      return entityState !== 'unavailable' && entityState !== 'unknown' ? `${entityState}°` : entityState;
    case 'timestamp':
      // Return the raw timestamp for now
      return entityState;
    default:
      return entityState;
  }
}

export function getUnavailableStateText(entityState: string): string {
  switch (entityState.toLowerCase()) {
    case 'unavailable':
      return localize('status.unavailable');
    case 'unknown':
      return localize('status.unknown');
    case 'none':
    case 'null':
    case '':
      return localize('status.none');
    default:
      return entityState;
  }
}
