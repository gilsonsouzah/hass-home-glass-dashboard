interface ChipEntity {
  entity_id: string;
  state: string;
}

const WATER_KEYWORDS = ['water', 'leak', 'flood'];

/** Moisture sensors; id keywords apply only to binary_sensors that declare no device_class. */
export function isWaterEntity(entityId: string, attributes?: { device_class?: string }): boolean {
  const deviceClass = attributes?.device_class;
  if (deviceClass === 'moisture') return true;
  return !deviceClass && entityId.startsWith('binary_sensor.') && WATER_KEYWORDS.some((kw) => entityId.includes(kw));
}

export function countLightsOn(entities: ChipEntity[]): number {
  return entities.filter((e) => e.entity_id.startsWith('light.') && e.state === 'on').length;
}

export interface SecuritySummary {
  triggered: number;
  armed: number;
  unlocked: number;
  jammed: number;
}

const ALARM_ARMED_STATES = new Set(['pending', 'arming']);
const LOCK_OPEN_STATES = new Set(['unlocked', 'unlocking', 'open']);

export function summarizeSecurity(entities: ChipEntity[]): SecuritySummary {
  const summary: SecuritySummary = { triggered: 0, armed: 0, unlocked: 0, jammed: 0 };
  for (const { entity_id, state } of entities) {
    if (entity_id.startsWith('alarm_control_panel.')) {
      if (state === 'triggered') summary.triggered++;
      else if (state.startsWith('armed_') || ALARM_ARMED_STATES.has(state)) summary.armed++;
    } else if (entity_id.startsWith('lock.')) {
      if (LOCK_OPEN_STATES.has(state)) summary.unlocked++;
      else if (state === 'jammed') summary.jammed++;
    }
  }
  return summary;
}

export function formatPower(watts: number): string {
  return watts >= 1000 ? `${(watts / 1000).toFixed(1)} kW` : `${Math.round(watts)} W`;
}
