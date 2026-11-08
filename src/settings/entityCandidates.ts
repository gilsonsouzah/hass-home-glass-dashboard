import type { HomeSettingsData } from './settingsData';

export interface CatalogEntity {
  entity_id: string;
  friendly_name: string;
  domain: string;
  state: string;
  attributes: any;
}

export interface Catalog {
  /** Entities of dashboard-supported domains. */
  available: CatalogEntity[];
  /** Available entities of other domains, offered as "extra accessories". */
  additional: CatalogEntity[];
}

const MAX_RESULTS = 10;
const LIST_SETTINGS = ['favoriteAccessories', 'excludedFromDashboard', 'excludedFromHome'];

function isOutlet(entity: CatalogEntity): boolean {
  return (
    entity.attributes?.device_class === 'outlet' ||
    entity.entity_id.toLowerCase().includes('outlet') ||
    entity.friendly_name.toLowerCase().includes('outlet')
  );
}

function isAvailableState(entity: CatalogEntity, unavailable: string[]): boolean {
  return !!entity.state && !unavailable.includes(entity.state.toLowerCase());
}

function weatherEntities(states: Record<string, any>): CatalogEntity[] {
  return Object.values(states)
    .filter((state: any) => state.entity_id.startsWith('weather.'))
    .map((state: any) => ({
      entity_id: state.entity_id,
      friendly_name: state.attributes.friendly_name || state.entity_id,
      domain: 'weather',
      state: state.state,
      attributes: state.attributes,
    }))
    .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name));
}

function sourceList(setting: keyof HomeSettingsData, catalog: Catalog, temp: HomeSettingsData, states: Record<string, any>) {
  if (setting === 'weatherEntity') return weatherEntities(states);
  if (setting === 'extraAccessories') return catalog.additional;
  if (LIST_SETTINGS.includes(setting)) {
    // Manually added extra accessories can also be favorited or excluded.
    const extraIds = new Set(temp.extraAccessories);
    return [...catalog.available, ...catalog.additional.filter((e) => extraIds.has(e.entity_id))];
  }
  return catalog.available;
}

/** Autocomplete matches for one entity picker: at most 10, never already-selected ones. */
export function entityCandidates(
  setting: keyof HomeSettingsData,
  query: string,
  temp: HomeSettingsData,
  catalog: Catalog,
  states: Record<string, any>
): CatalogEntity[] {
  const alreadySelected = temp[setting];
  const isListSetting = LIST_SETTINGS.includes(setting);

  return sourceList(setting, catalog, temp, states)
    .filter((entity) => {
      const matchesQuery =
        query === '' || entity.friendly_name.toLowerCase().includes(query) || entity.entity_id.toLowerCase().includes(query);
      const notSelected =
        setting === 'weatherEntity'
          ? entity.entity_id !== alreadySelected
          : !Array.isArray(alreadySelected) || !alreadySelected.includes(entity.entity_id);

      if (setting === 'favoriteAccessories' && entity.domain === 'camera') return false;

      // Without "show switches", only outlets and explicitly included switches are on the dashboard.
      if (!temp.showSwitches && entity.domain === 'switch' && isListSetting) {
        const isIncluded = Array.isArray(temp.includedSwitches) && temp.includedSwitches.includes(entity.entity_id);
        if (!isOutlet(entity) && !isIncluded) return false;
      }

      if (setting === 'includedSwitches') {
        if (entity.domain !== 'switch' || isOutlet(entity)) return false;
        if (!isAvailableState(entity, ['unavailable', 'unknown', 'none', 'null', ''])) return false;
      }

      if (setting === 'extraAccessories' && !isAvailableState(entity, ['unavailable', 'unknown'])) return false;

      return matchesQuery && notSelected;
    })
    .slice(0, MAX_RESULTS);
}
