const ICON_TOGGLE_DOMAINS = ['humidifier', 'siren', 'valve'];

function toggleClimate(hass: any, entityId: string, onMode: string | null) {
  const state = hass.states[entityId];
  if (!state || state.state === 'unavailable' || state.state === 'unknown') return;

  if (state.state !== 'off') {
    hass.callService('climate', 'set_hvac_mode', { entity_id: entityId, hvac_mode: 'off' });
    return;
  }
  if (onMode) {
    hass.callService('climate', 'set_hvac_mode', { entity_id: entityId, hvac_mode: onMode });
  } else {
    hass.callService('climate', 'turn_on', { entity_id: entityId });
  }
}

function toggleWaterHeater(hass: any, entityId: string) {
  const state = hass.states[entityId];
  if (state?.attributes?.operation_mode === 'off' || state?.state === 'off') {
    // Turn on - use first available mode that is not 'off'
    const availableModes = (state?.attributes?.operation_list || []).filter((mode: string) => mode !== 'off');
    hass.callService('water_heater', 'set_operation_mode', {
      entity_id: entityId,
      operation_mode: availableModes.length > 0 ? availableModes[0] : 'gas',
    });
  } else {
    hass.callService('water_heater', 'set_operation_mode', {
      entity_id: entityId,
      operation_mode: 'off',
    });
  }
}

export interface ActionContext {
  hass: any;
  entityId: string;
  /** Mode to switch a climate on with (pickHvacOnMode), null when the entity has none. */
  climateOnMode: string | null;
  openMoreInfo: () => void;
  toggleLock: (entityId: string) => void;
}

/** Tap on the card body (outside the icon and thermostat chevrons). */
export function runCardAction({ hass, entityId, climateOnMode, openMoreInfo, toggleLock }: ActionContext) {
  const domain = entityId.split('.')[0];

  switch (domain) {
    case 'light':
      hass.callService('light', 'toggle', { entity_id: entityId });
      return;
    case 'climate':
      toggleClimate(hass, entityId, climateOnMode);
      return;
    case 'water_heater':
      toggleWaterHeater(hass, entityId);
      return;
    case 'lock':
      toggleLock(entityId);
      return;
    case 'scene':
    case 'script':
      hass.callService(domain, 'turn_on', { entity_id: entityId });
      return;
  }
  openMoreInfo();
}

/** Tap on the round icon. */
export function runIconAction({ hass, entityId, openMoreInfo, toggleLock }: ActionContext) {
  const domain = entityId.split('.')[0];

  switch (domain) {
    case 'light':
    case 'switch':
    case 'fan':
    case 'input_boolean':
      hass.callService(domain, 'toggle', { entity_id: entityId });
      break;
    case 'cover':
      hass.callService('cover', hass.states[entityId]?.state === 'open' ? 'close_cover' : 'open_cover', {
        entity_id: entityId,
      });
      break;
    case 'lock':
      toggleLock(entityId);
      break;
    case 'media_player': {
      const mediaState = hass.states[entityId]?.state;
      if (mediaState === 'playing') {
        hass.callService('media_player', 'media_pause', { entity_id: entityId });
      } else if (mediaState === 'paused') {
        hass.callService('media_player', 'media_play', { entity_id: entityId });
      } else {
        hass.callService('media_player', 'turn_on', { entity_id: entityId });
      }
      break;
    }
    case 'scene':
    case 'script':
      hass.callService(domain, 'turn_on', { entity_id: entityId });
      break;
    case 'button':
    case 'input_button':
      hass.callService(domain, 'press', { entity_id: entityId });
      break;
    default:
      // Only domains with a plain toggle service are toggled; everything else (climate, camera,
      // sensors, alarm panels, vacuum, selects...) has no meaningful toggle and opens more-info
      if (ICON_TOGGLE_DOMAINS.includes(domain)) {
        hass.callService('homeassistant', 'toggle', { entity_id: entityId });
      } else {
        openMoreInfo();
      }
  }
}
