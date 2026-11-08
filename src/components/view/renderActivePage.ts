import type { HomePage } from '../../pages/HomePage';
import type { GroupPage } from '../../pages/GroupPage';
import type { RoomPage } from '../../pages/RoomPage';
import type { ScenesPage } from '../../pages/ScenesPage';
import type { CamerasPage } from '../../pages/CamerasPage';
import type { DeviceGroup } from '../../config/DashboardConfig';
import { localize } from '../../utils/LocalizationService';

export interface ViewPages {
  homePage: HomePage;
  groupPage: GroupPage;
  roomPage: RoomPage;
  scenesPage: ScenesPage;
  camerasPage: CamerasPage;
}

export type ToggleTall = (entityId: string, areaId: string) => void | Promise<boolean | void>;

/** The page object rendered for a config; falls back to home like renderActivePage does. */
export function getActivePage(pages: ViewPages, config: any): any {
  switch (config?.pageType) {
    case 'group': return pages.groupPage;
    case 'room': return pages.roomPage;
    case 'scenes': return pages.scenesPage;
    case 'cameras': return pages.camerasPage;
    default: return pages.homePage;
  }
}

export async function renderActivePage(
  pages: ViewPages,
  config: any,
  hass: any,
  customizations: any,
  content: HTMLElement,
  toggleTall: ToggleTall
): Promise<void> {
  if (config?.pageType === 'group' && config?.deviceGroup) {
    pages.groupPage.hass = hass;
    pages.groupPage.setConfig({ group: config.deviceGroup as DeviceGroup, customizations });
    await pages.groupPage.render(content, config.deviceGroup as DeviceGroup, hass, toggleTall);
  } else if (config?.pageType === 'room' && config?.areaId && config?.areaName) {
    pages.roomPage.hass = hass;
    pages.roomPage.setConfig({ areaId: config.areaId, customizations });
    await pages.roomPage.render(content, config.areaId, config.areaName, hass, toggleTall);
  } else if (config?.pageType === 'scenes') {
    pages.scenesPage.hass = hass;
    pages.scenesPage.setConfig({ customizations });
    await pages.scenesPage.render(content, hass, toggleTall);
  } else if (config?.pageType === 'cameras') {
    pages.camerasPage.hass = hass;
    pages.camerasPage.setConfig({ customizations });
    await pages.camerasPage.render(content, hass, toggleTall);
  } else {
    const homeTitle = config?.title || hass?.config?.location_name || localize('pages.my_home');
    pages.homePage.hass = hass;
    pages.homePage.setConfig({ title: homeTitle, customizations });
    await pages.homePage.render(content, hass, homeTitle, toggleTall);
  }
}
