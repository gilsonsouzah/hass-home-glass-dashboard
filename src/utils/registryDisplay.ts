/**
 * Helpers over `hass.entities` / `hass.devices`, the registry *display* data the HA
 * frontend keeps in sync. It carries `hidden` (not `hidden_by`) and omits disabled
 * entities entirely.
 */

export function resolveEntityAreaId(hass: any, entityId: string): string {
  const entity = hass?.entities?.[entityId];
  return entity?.area_id
    || (entity?.device_id ? hass?.devices?.[entity.device_id]?.area_id : null)
    || 'no_area';
}

export function isEntityHiddenOrDisabled(hass: any, entityId: string): boolean {
  const entity = hass?.entities?.[entityId];
  return !entity || entity.hidden === true;
}
