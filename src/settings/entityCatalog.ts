import { DashboardConfig } from '../config/DashboardConfig';
import { DataService } from '../utils/DataService';
import type { Catalog, CatalogEntity } from './entityCandidates';

// Domains that make no sense as cards when offered as extra accessories.
const NON_CARD_DOMAINS = [
  'automation', 'person', 'zone', 'device_tracker', 'sun', 'weather',
  'persistent_notification', 'conversation', 'tts', 'stt', 'update',
  'calendar', 'group', 'image', 'notify', 'number', 'select', 'text',
  'time', 'date', 'datetime',
];

const toEntity = (state: any): CatalogEntity => ({
  entity_id: state.entity_id,
  friendly_name: state.attributes.friendly_name || state.entity_id,
  domain: state.entity_id.split('.')[0],
  state: state.state,
  attributes: state.attributes,
});

const byName = (a: CatalogEntity, b: CatalogEntity) => a.friendly_name.localeCompare(b.friendly_name);

export function loadCatalog(hass: any): Catalog {
  const visible = Object.values(hass.states).filter((state: any) =>
    DataService.isVisibleInRegistry(hass, state.entity_id)
  );

  const available = visible
    .filter((state: any) => DashboardConfig.isSupportedDomain(state.entity_id.split('.')[0]))
    .map(toEntity)
    .sort(byName);

  const additional = visible
    .filter((state: any) => {
      const domain = state.entity_id.split('.')[0];
      const isAvailable = state.state && !['unavailable', 'unknown'].includes(state.state.toLowerCase());
      return isAvailable && !DashboardConfig.isSupportedDomain(domain) && !NON_CARD_DOMAINS.includes(domain);
    })
    .map(toEntity)
    .sort(byName);

  return { available, additional };
}
