import type { DeviceGroup } from '../config/DashboardConfig';

export interface SwitchRules {
  getDeviceGroup(domain: string, entityId?: string, attributes?: any, showSwitches?: boolean): DeviceGroup | undefined;
  isOutlet(entityId: string, attributes: any): boolean;
}

/** Home and room pages: with the switches setting off, only outlets and explicitly included switches show. */
export function isSwitchShown(
  rules: SwitchRules,
  entityId: string,
  attributes: any,
  showSwitches: boolean,
  includedSwitches: string[]
): boolean {
  if (showSwitches) return rules.getDeviceGroup('switch', entityId, attributes, showSwitches) !== undefined;
  return rules.isOutlet(entityId, attributes) || includedSwitches.includes(entityId);
}

/** Group page: device group of an entity, applying the same switch visibility rule as `isSwitchShown`. */
export function groupOfEntity(
  rules: SwitchRules,
  entityId: string,
  attributes: any,
  showSwitches: boolean,
  includedSwitches: string[]
): DeviceGroup | undefined {
  const domain = entityId.split('.')[0];
  if (domain !== 'switch' || showSwitches) return rules.getDeviceGroup(domain, entityId, attributes, showSwitches);
  if (!rules.isOutlet(entityId, attributes) && !includedSwitches.includes(entityId)) return undefined;
  // Outlets and included switches need showSwitches=true to resolve a group.
  return rules.getDeviceGroup(domain, entityId, attributes, true);
}
