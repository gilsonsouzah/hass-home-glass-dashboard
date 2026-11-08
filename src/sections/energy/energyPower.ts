import { powerCandidates, sumPower } from '../energyCalc';
import { getCachedGridEntityIds } from './energyData';

export function hasEnergySensors(hass: any): boolean {
  if (!hass?.states) return false;
  for (const entityId of Object.keys(hass.states)) {
    if (!entityId.startsWith('sensor.')) continue;
    const state = hass.states[entityId];
    const dc = state?.attributes?.device_class;
    if ((dc === 'energy' || dc === 'power') && state?.attributes?.state_class) {
      return true;
    }
  }
  return false;
}

export function getTotalPower(hass: any): number | null {
  if (!hass?.states) return null;

  // Strategy 1: grid entity ids from the energy prefs
  const cachedGridEntityIds = getCachedGridEntityIds();
  if (cachedGridEntityIds && hass.entities) {
    const total = sumPower(hass, powerCandidates(hass, cachedGridEntityIds));
    if (total !== null) return total;
  }

  // Strategy 2: Find power sensors on the same device as energy sensors
  if (hass.entities) {
    const energyEntityIds: string[] = [];
    for (const entityId of Object.keys(hass.states)) {
      if (!entityId.startsWith('sensor.')) continue;
      const state = hass.states[entityId];
      if (state?.attributes?.device_class !== 'energy') continue;
      if (state?.attributes?.state_class !== 'total_increasing') continue;
      const reg = hass.entities[entityId] as any;
      if (reg?.entity_category || reg?.hidden) continue;
      energyEntityIds.push(entityId);
    }

    if (energyEntityIds.length > 0) {
      let total = 0;
      let found = false;
      const seenDevices = new Set<string>();

      for (const energyEntityId of energyEntityIds) {
        const reg = hass.entities[energyEntityId] as any;
        if (!reg?.device_id || seenDevices.has(reg.device_id)) continue;
        seenDevices.add(reg.device_id);

        for (const [eid, entityReg] of Object.entries(hass.entities || {})) {
          const r = entityReg as any;
          if (r.device_id !== reg.device_id || eid === energyEntityId) continue;
          const state = hass.states[eid];
          if (!state || state.attributes?.device_class !== 'power') continue;
          if (!state.attributes?.state_class) continue;
          const val = parseFloat(state.state);
          if (!isNaN(val) && val >= 0) {
            total += val;
            found = true;
            break; // take first power sensor per device
          }
        }
      }

      if (found) return total;
    }
  }

  // Strategy 3: Fall back to summing all power sensors
  let total = 0;
  let found = false;
  for (const entityId of Object.keys(hass.states)) {
    if (!entityId.startsWith('sensor.')) continue;
    const state = hass.states[entityId];
    if (state?.attributes?.device_class !== 'power') continue;
    if (!state?.attributes?.state_class) continue;
    const reg = hass.entities?.[entityId] as any;
    if (reg?.entity_category === 'config' || reg?.entity_category === 'diagnostic') continue;
    if (reg?.hidden) continue;

    const val = parseFloat(state.state);
    if (!isNaN(val) && val >= 0) {
      total += val;
      found = true;
    }
  }
  return found ? total : null;
}
