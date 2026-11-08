import { localize } from '../../utils/LocalizationService';
import { RTLHelper } from '../../utils/RTLHelper';
import { LiquidGlassClasses } from '../../utils/LiquidGlassStyles';
import { escapeHtml } from '../../utils/html';
import { Area, HeaderConfig, areaId, currentRoomId, editViewKey, orderAreas } from './headerModel';

export const MENU_ID = 'hg-header-menu';

export const menuButtonLabel = (editMode: boolean): string => localize(editMode ? 'ui_actions.done' : 'ui_actions.menu');

export function menuButtonContent(editMode: boolean): string {
  if (editMode) {
    return `<ha-icon icon="mdi:check"></ha-icon>`;
  }
  return `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="6" cy="12" r="2" fill="currentColor"/>
        <circle cx="12" cy="12" r="2" fill="currentColor"/>
        <circle cx="18" cy="12" r="2" fill="currentColor"/>
      </svg>
    `;
}

export function roomItemsHtml(areas: Area[], activeRoomId: string | null): string {
  return areas
    .map((area) => {
      const id = areaId(area);
      const isActive = activeRoomId === id;
      return `
            <div class="dropdown-item room-item${isActive ? ' active' : ''}" role="menuitem" tabindex="-1"${isActive ? ' aria-current="page"' : ''} data-room-id="${escapeHtml(id)}">
              <span class="room-checkmark" aria-hidden="true"></span>
              <span>${escapeHtml(area.name || id)}</span>
            </div>
          `;
    })
    .join('');
}

export interface RoomsInputs {
  areas: Area[];
  /** Saved order and hidden ids; omitted when no customization manager is available. */
  saved?: { order: string[]; hidden: string[] };
}

export function roomsSection({ areas, saved }: RoomsInputs): string {
  const ordered = saved ? orderAreas(areas, saved.order, saved.hidden) : areas;
  if (ordered.length === 0) return '';

  return `
        <div class="dropdown-separator-thick" role="separator"></div>
        ${roomItemsHtml(ordered, currentRoomId(window.location.pathname))}
      `;
}

export interface DropdownInputs {
  config: HeaderConfig;
  headerToggleText: string;
  sidebarToggleText: string;
  roomsHtml: string;
}

export function dropdownContent({ config, headerToggleText, sidebarToggleText, roomsHtml }: DropdownInputs): string {
  const editText = localize(editViewKey(config, { scenes: localize('pages.scenes'), cameras: localize('pages.cameras') }));

  const sidebarSection =
    window.innerWidth <= 768
      ? ''
      : `
      <div class="dropdown-item settings-item sidebar-toggle" role="menuitem" tabindex="-1">
        <span class="item-checkmark" aria-hidden="true"></span>
        <ha-icon icon="${RTLHelper.isRTL() ? 'mdi:dock-right' : 'mdi:dock-left'}" aria-hidden="true"></ha-icon>
        <span>${sidebarToggleText}</span>
      </div>`;

  return `
      <div class="dropdown-item settings-item home-settings-item" role="menuitem" tabindex="-1">
        <span class="item-checkmark" aria-hidden="true"></span>
        <ha-icon icon="mdi:cog-outline" aria-hidden="true"></ha-icon>
        <span>${localize('ui_actions.home_settings')}</span>
      </div>
      <div class="dropdown-item settings-item edit-item" role="menuitem" tabindex="-1">
        <span class="item-checkmark" aria-hidden="true"></span>
        <ha-icon icon="mdi:view-grid-outline" aria-hidden="true"></ha-icon>
        <span>${editText}</span>
      </div>
      <div class="dropdown-item settings-item reorder-item" role="menuitem" tabindex="-1">
        <span class="item-checkmark" aria-hidden="true"></span>
        <ha-icon icon="mdi:view-sequential-outline" aria-hidden="true"></ha-icon>
        <span>${localize('ui_actions.reorder_sections')}</span>
      </div>
      <div class="dropdown-item settings-item header-toggle" role="menuitem" tabindex="-1">
        <span class="item-checkmark" aria-hidden="true"></span>
        <ha-icon icon="mdi:page-layout-header" aria-hidden="true"></ha-icon>
        <span>${headerToggleText}</span>
      </div>${sidebarSection}${roomsHtml}
    `;
}

export interface HeaderContentInputs {
  config: HeaderConfig;
  showSidebarButton: boolean;
  menuButtonHtml: string;
  menuButtonLabel: string;
  dropdownHtml: string;
}

export function headerContent({ config, showSidebarButton, menuButtonHtml, menuButtonLabel, dropdownHtml }: HeaderContentInputs): string {
  const leadingButton = config.showBackButton
    ? `
            <button class="apple-header-back-button ${LiquidGlassClasses.headerButton}" aria-label="${localize('ui_actions.back')}">
              <ha-icon icon="${RTLHelper.getBackIcon()}" aria-hidden="true"></ha-icon>
            </button>
          `
    : showSidebarButton
      ? `
            <button class="apple-header-sidebar-button ${LiquidGlassClasses.headerButton}" aria-label="${localize('toggles.show_ha_sidebar')}">
              <ha-icon icon="mdi:menu" aria-hidden="true"></ha-icon>
            </button>
          `
      : '';

  const menu = config.showMenu
    ? `
            <button class="apple-header-menu-button ${LiquidGlassClasses.headerButton}" aria-label="${menuButtonLabel}" aria-haspopup="menu" aria-expanded="false" aria-controls="${MENU_ID}">
              ${menuButtonHtml}
            </button>
            <div class="apple-header-dropdown hg-glass--thick" id="${MENU_ID}" role="menu" aria-label="${localize('ui_actions.menu')}">
              ${dropdownHtml}
            </div>
          `
    : '';

  return `
        <div class="apple-header-content">
          ${leadingButton}
          <div class="apple-header-scrolled">
            <div class="apple-header-scrolled-title-container">
              <h2 class="apple-header-scrolled-title">${escapeHtml(config.title)}</h2>
            </div>
            <div class="apple-header-scrolled-chips"></div>
          </div>
          ${menu}
        </div>
      `;
}
