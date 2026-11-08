export interface HeaderConfig {
  title: string;
  isGroupPage: boolean;
  isSpecialPage?: boolean;
  showMenu: boolean;
  showBackButton?: boolean;
  /** Strategy page type. When absent, the page is inferred from the localized title. */
  pageType?: string;
}

export interface Area {
  area_id?: string;
  id?: string;
  name?: string;
}

export interface SidebarButtonInputs {
  showBackButton: boolean;
  haHeaderVisible: boolean;
  haSidebarVisible: boolean;
  customHeaderHidden: boolean;
  customSidebarHidden: boolean;
  isMobile: boolean;
}

export function editViewKey(config: HeaderConfig, titles: { scenes: string; cameras: string }): string {
  if (config.pageType) {
    switch (config.pageType) {
      case 'scenes':
        return 'edit.edit_scenes_view';
      case 'cameras':
        return 'edit.edit_cameras_view';
      case 'room':
        return 'edit.edit_room_view';
      default:
        return 'edit.edit_home_view';
    }
  }
  if (config.title === titles.scenes) return 'edit.edit_scenes_view';
  if (config.title === titles.cameras) return 'edit.edit_cameras_view';
  return config.showBackButton ? 'edit.edit_room_view' : 'edit.edit_home_view';
}

/** Desktop needs the HA sidebar and header both hidden; mobile only needs the header hidden. */
export function shouldShowSidebarButton(inputs: SidebarButtonInputs): boolean {
  if (inputs.showBackButton) return false;

  const headerHidden = !inputs.haHeaderVisible || inputs.customHeaderHidden;
  if (!headerHidden) return false;
  if (inputs.isMobile) return true;

  return !inputs.haSidebarVisible || inputs.customSidebarHidden;
}

export const areaId = (area: Area): string => (area.area_id || area.id) as string;

/** Drops hidden areas, then orders by the saved order; unsaved areas follow, sorted by name. */
export function orderAreas(areas: Area[], sectionOrder: string[], hiddenSections: string[]): Area[] {
  return areas
    .filter((area) => !hiddenSections.includes(areaId(area)))
    .sort((a, b) => {
      const idA = areaId(a);
      const idB = areaId(b);
      const orderA = sectionOrder.indexOf(idA);
      const orderB = sectionOrder.indexOf(idB);

      if (orderA !== -1 && orderB !== -1) return orderA - orderB;
      if (orderA !== -1) return -1;
      if (orderB !== -1) return 1;
      return (a.name || idA).localeCompare(b.name || idB);
    });
}

export function currentRoomId(pathname: string): string | null {
  return pathname.match(/room-([^/]+)$/)?.[1] ?? null;
}
