import type { Area, Entity, Device } from '../types/types';

export class DataService {
  static async getDevices(hass: any): Promise<Device[]> {
    try {
      return await hass.callWS({ type: 'config/device_registry/list' });
    } catch (error) {
      console.error('Home Glass: failed to load device registry', error);
      return [];
    }
  }

  static async getAreas(hass: any): Promise<Area[]> {
    try {
      return await hass.callWS({ type: 'config/area_registry/list' });
    } catch (error) {
      console.error('Home Glass: failed to load area registry', error);
      return [];
    }
  }

  static async getEntities(hass: any): Promise<Entity[]> {
    try {
      const entities: Entity[] = await hass.callWS({ type: 'config/entity_registry/list' });
      return entities.filter((entity) => this.isEnabled(entity));
    } catch (error) {
      console.error('Home Glass: failed to load entity registry', error);
      return [];
    }
  }

  private static isEnabled(entity: Entity): boolean {
    return !entity.hidden_by && !entity.disabled_by;
  }

  /**
   * Shared auto-discovery rule for every page. Extra accessories bypass the category and domain
   * checks; config and diagnostic entities otherwise never show.
   */
  static isDiscoverable(
    entity: Entity,
    extraAccessories: string[],
    isDomainSupported: (domain: string) => boolean
  ): boolean {
    if (!this.isEnabled(entity)) return false;
    if (extraAccessories.includes(entity.entity_id)) return true;
    if (entity.entity_category === 'config' || entity.entity_category === 'diagnostic') return false;
    return isDomainSupported(entity.entity_id.split('.')[0]);
  }

  /** `hass.entities` is the display registry: it carries `hidden` and omits disabled entities. Unregistered entities count as visible. */
  static isVisibleInRegistry(hass: any, entityId: string): boolean {
    return hass.entities?.[entityId]?.hidden !== true;
  }

  static indexDevices(devices: Device[]): Map<string, Device> {
    return new Map(devices.map((device) => [device.id, device]));
  }

  /** Entity area first, then its device's area. */
  static resolveAreaId(entity: Entity, devicesById: Map<string, Device>): string | undefined {
    if (entity.area_id) return entity.area_id;
    return entity.device_id ? devicesById.get(entity.device_id)?.area_id : undefined;
  }

  static groupEntitiesByArea(
    entities: Entity[],
    areas: Area[],
    devices: Device[] = []
  ): { [areaId: string]: Entity[] } {
    const entitiesByArea: { [areaId: string]: Entity[] } = {};
    const devicesById = this.indexDevices(devices);

    areas.forEach((area) => {
      entitiesByArea[area.area_id] = [];
    });

    // Entities without an area are skipped
    entities.forEach((entity) => {
      const areaId = this.resolveAreaId(entity, devicesById);
      if (!areaId) return;
      (entitiesByArea[areaId] ??= []).push(entity);
    });

    return entitiesByArea;
  }
}
