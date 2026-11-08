import { CustomizationManager } from '../CustomizationManager';
import { localize } from '../LocalizationService';
import { EnergySection } from '../../sections/EnergySection';
import { DataService } from '../DataService';
import { orderSections } from '../sectionOrder';

export interface SectionItem {
  id: string;
  name: string;
  type: 'area' | 'scenes' | 'cameras' | 'favorites' | 'weather' | 'energy';
  visible: boolean;
}

export async function prepareSectionsData(
customizationManager: CustomizationManager,
areas: any[],
hass: any
): Promise<SectionItem[]> {
  const sections: SectionItem[] = [];
  const customizations = customizationManager.getCustomizations();

  const sectionOrder: string[] = customizations.home?.sections?.order || [];
  const hiddenSections: string[] = customizations.home?.sections?.hidden || [];
  const excluded = new Set(await customizationManager.getExcludedFromDashboard());
  const add = (id: string, name: string, type: SectionItem['type']) =>
    sections.push({ id, name, type, visible: !hiddenSections.includes(id) });

  const weatherEntity = await customizationManager.getWeatherEntity();
  if (weatherEntity && hass.states[weatherEntity]) {
    add('weather_section', localize('section_titles.weather'), 'weather');
  }

  const showEnergy = await customizationManager.getShowEnergy();
  if (showEnergy && EnergySection.hasEnergySensors(hass)) {
    add('energy_section', localize('section_titles.energy'), 'energy');
  }

  const hasVisible = (prefixes: string[]) =>
    Object.keys(hass.states).some(
      (entityId) =>
        prefixes.some((prefix) => entityId.startsWith(prefix)) &&
        !excluded.has(entityId) &&
        DataService.isVisibleInRegistry(hass, entityId)
    );

  if (hasVisible(['camera.'])) add('cameras_section', localize('section_titles.cameras'), 'cameras');
  if (hasVisible(['scene.', 'script.'])) add('scenes_section', localize('section_titles.scenes'), 'scenes');

  const favoriteAccessories = await customizationManager.getFavoriteAccessories();
  if (favoriteAccessories.length > 0) add('favorites_section', localize('section_titles.favorites'), 'favorites');

  const areaNames: Record<string, string> = {};
  areas.forEach((area) => {
    const areaId = area.area_id || area.id;
    areaNames[areaId] = area.name || areaId;
    add(areaId, areaNames[areaId], 'area');
  });

  const byId = new Map(sections.map((section) => [section.id, section]));
  return orderSections(
    sections.map((section) => section.id),
    sectionOrder,
    areaNames,
    hass.locale?.language || hass.language
  ).map((id) => byId.get(id)!);
}
