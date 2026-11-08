import { HomeAssistantUIManager } from '../utils/HomeAssistantUIManager';
import { SectionReorderManager } from '../utils/SectionReorderManager';
import { CustomizationManager } from '../utils/CustomizationManager';
import { EditModeManager } from '../utils/EditModeManager';
import { HomeSettingsManager } from '../utils/HomeSettingsManager';
import { HomeChips } from './HomeChips';
import { localize } from '../utils/LocalizationService';
import { RTLHelper } from '../utils/RTLHelper';
import { injectLiquidGlassStyles, LiquidGlassClasses } from '../utils/LiquidGlassStyles';
import { navigateToDashboardPath } from './navigation';
import { HEADER_STYLE_ID, injectHeaderStyles } from './header/headerStyles';
import { Area, HeaderConfig, shouldShowSidebarButton } from './header/headerModel';
import { dropdownContent, headerContent, menuButtonContent, roomsSection } from './header/headerTemplates';
import {
  getHomeAssistantHeaderHeight,
  observeHaLayout,
  openHaSidebar,
  positionFixedHeader,
  waitForHAInterface,
} from './header/haLayout';

export type { HeaderConfig } from './header/headerModel';

export class HomeHeader {
  private headerElement?: HTMLElement;
  private scrolledTitleElement?: HTMLElement;
  private menuButton?: HTMLButtonElement;
  private dropdown?: HTMLElement;
  private scrolledChipsContainer?: HTMLElement;
  private isDropdownOpen = false;
  private currentConfig: HeaderConfig = { title: localize('pages.my_home'), isGroupPage: false, showMenu: true };
  private container?: HTMLElement;
  private _hass?: any;
  private uiManager: HomeAssistantUIManager;
  private sectionReorderManager?: SectionReorderManager;
  private homeSettingsManager?: HomeSettingsManager;
  private customizationManager?: CustomizationManager;
  private editModeManager?: EditModeManager;
  private onRefreshCallbacks: Array<() => void> = [];
  private scrollListener?: () => void;
  private resizeListener?: () => void;
  private clickOutsideListener?: (e: Event) => void;
  private escapeKeyListener?: (e: KeyboardEvent) => void;
  private sidebarObserver?: { disconnect(): void };
  private setHassTimeout: NodeJS.Timeout | null = null;
  private pendingHass: any = null;

  // ponytail: _forceInstance is unused but HomeView (not in this change) still passes it; drop both together.
  constructor(_forceInstance = false) {
    this.uiManager = HomeAssistantUIManager.getInstance();
  }

  setEditModeManager(editModeManager: EditModeManager) {
    this.editModeManager = editModeManager;
  }

  get editMode(): boolean {
    return this.editModeManager?.editMode || false;
  }

  private shouldShowSidebarButton(): boolean {
    return shouldShowSidebarButton({
      showBackButton: !!this.currentConfig.showBackButton,
      haHeaderVisible: this.uiManager.isHeaderVisible(),
      haSidebarVisible: this.uiManager.isSidebarVisible(),
      customHeaderHidden: this.customizationManager?.isHeaderHidden() ?? false,
      customSidebarHidden: this.customizationManager?.isSidebarHidden() ?? false,
      isMobile: window.innerWidth <= 768,
    });
  }

  async init(container: HTMLElement, config: HeaderConfig) {
    const containerChanged = this.container !== container;
    const configChanged = JSON.stringify(this.currentConfig) !== JSON.stringify(config);

    this.container = container;

    if (containerChanged || !this.headerElement) {
      this.cleanup();
      this.currentConfig = { ...config };
      this.createHeaderStructure();
      this.setupEventListeners();
      this.setupScrollBehavior();
    } else if (configChanged) {
      this.reconfigure(config);
      this.currentConfig = { ...config };
    }
  }

  private reconfigure(config: HeaderConfig) {
    if (this.menuButton) {
      this.menuButton.style.display = config.showMenu ? 'flex' : 'none';
    }

    if (this.scrolledTitleElement && config.title !== this.currentConfig.title) {
      this.scrolledTitleElement.textContent = config.title;
    }

    if (!config.isGroupPage && this.scrolledChipsContainer) {
      this.scrolledChipsContainer.innerHTML = '';
    }
  }

  setTitle(title: string) {
    if (this.currentConfig.title === title) {
      return;
    }

    this.currentConfig.title = title;

    if (this.scrolledTitleElement) {
      this.scrolledTitleElement.textContent = title;
    }
  }

  setChipsElement(chipsElement: any | null) {
    if (chipsElement && this.headerElement) {
      const headerChipsContainer = this.headerElement.querySelector('.apple-header-scrolled-chips') as HTMLElement;

      if (headerChipsContainer && chipsElement.isConfigured && chipsElement.isConfigured() && chipsElement.hass) {
        const headerChips = new HomeChips(headerChipsContainer, this.customizationManager);
        headerChips.setConfig(chipsElement.getConfig());
        headerChips.hass = chipsElement.hass;
        headerChips.setActiveGroup(chipsElement.getActiveGroup());
      }
    } else if (!this.currentConfig.isGroupPage && this.headerElement) {
      const headerChipsContainer = this.headerElement.querySelector('.apple-header-scrolled-chips') as HTMLElement;
      if (headerChipsContainer) {
        headerChipsContainer.innerHTML = '';
      }
    }
  }

  updatePageContentPadding() {
    if (this.headerElement && this.container) {
      this.container.classList.toggle('has-fixed-header', this.currentConfig.isGroupPage);
    }
  }

  private updateFixedHeaderPosition() {
    if (this.headerElement && this.currentConfig.isGroupPage) {
      positionFixedHeader(this.headerElement);
    }
  }

  private updateHAHeaderHeight() {
    this.headerElement?.style.setProperty('--ha-header-height', `${getHomeAssistantHeaderHeight()}px`);
  }

  private syncLayout() {
    this.updateHAHeaderHeight();
    this.updateFixedHeaderPosition();
  }

  private headerHtml(): string {
    return headerContent({
      config: this.currentConfig,
      showSidebarButton: this.shouldShowSidebarButton(),
      menuButtonHtml: menuButtonContent(this.editMode),
      dropdownHtml: this.currentConfig.showMenu ? this.getDropdownContent() : '',
    });
  }

  private createHeaderStructure() {
    if (!this.container) {
      console.error('No container available for header creation');
      return;
    }

    const existingHeader = this.container.querySelector('.hg-header.permanent-header') as HTMLElement;

    if (existingHeader) {
      existingHeader.innerHTML = this.headerHtml();
      this.headerElement = existingHeader;

      const pageContent = this.container.querySelector('.page-content');
      pageContent?.classList.toggle('has-fixed-header', this.currentConfig.isGroupPage);
    } else {
      this.container.insertAdjacentHTML(
        'afterbegin',
        `<div class="hg-header ${RTLHelper.isRTL() ? 'rtl' : 'ltr'}">${this.headerHtml()}</div>`
      );
      this.headerElement = this.container.querySelector('.hg-header') as HTMLElement;
    }

    const isRTL = RTLHelper.isRTL();
    this.headerElement.classList.toggle('rtl', isRTL);
    this.headerElement.classList.toggle('ltr', !isRTL);
    this.headerElement.classList.toggle('group-page', this.currentConfig.isGroupPage);

    this.scrolledTitleElement = this.headerElement.querySelector('.apple-header-scrolled-title') as HTMLElement;
    this.scrolledChipsContainer = this.headerElement.querySelector('.apple-header-scrolled-chips') as HTMLElement;

    if (this.currentConfig.showMenu) {
      this.menuButton = this.headerElement.querySelector('.apple-header-menu-button') as HTMLButtonElement;
      this.dropdown = this.headerElement.querySelector('.apple-header-dropdown') as HTMLElement;
    }

    injectLiquidGlassStyles();
    injectHeaderStyles(this.container);
    this.updateHAHeaderHeight();

    waitForHAInterface().then(() => {
      this.updateHAHeaderHeight();
      this.setupSidebarObserver();

      if (this.currentConfig.isGroupPage) {
        this.updateFixedHeaderPosition();
        setTimeout(() => this.syncLayout(), 200);
      }

      setTimeout(() => this.updateSidebarButtonVisibility(), 300);
    });
  }

  private getDropdownContent(): string {
    return dropdownContent({
      config: this.currentConfig,
      headerToggleText: this.uiManager.getHeaderToggleText(),
      sidebarToggleText: this.uiManager.getSidebarToggleText(),
      roomsHtml: this.getRoomsSection(),
    });
  }

  private getRoomsSection(): string {
    if (!this._hass) {
      return '';
    }

    try {
      const customizations = this.customizationManager?.getCustomizations();
      return roomsSection({
        areas: this._hass.areas ? Object.values(this._hass.areas) : [],
        saved: customizations && {
          order: customizations.home?.sections?.order || [],
          hidden: customizations.home?.sections?.hidden || [],
        },
      });
    } catch (error) {
      console.error('Error getting rooms section:', error);
      return '';
    }
  }

  private setupEventListeners() {
    this.headerElement?.querySelector('.apple-header-back-button')?.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      navigateToDashboardPath('home');
    });

    this.headerElement?.querySelector('.apple-header-sidebar-button')?.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      openHaSidebar();
    });

    if (!this.menuButton || !this.dropdown) return;

    this.menuButton.addEventListener('click', (e: Event) => {
      e.stopPropagation();

      if (this.editMode) {
        this.toggleEditMode();
      } else {
        this.toggleDropdown();
      }
    });

    this.setupDropdownItemListeners();

    this.removeDocumentListeners();

    this.clickOutsideListener = (e: Event) => {
      if (!this.headerElement?.contains(e.target as Node)) {
        this.closeDropdown();
      }
    };
    document.addEventListener('click', this.clickOutsideListener);

    this.escapeKeyListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeDropdown();
      }
    };
    document.addEventListener('keydown', this.escapeKeyListener);
  }

  private setupDropdownItemListeners() {
    if (!this.dropdown) return;

    const onItem = (selector: string, action: () => void) => {
      this.dropdown!.querySelector(selector)?.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        action();
        this.closeDropdown();
      });
    };

    onItem('.home-settings-item', () => this.showHomeSettingsModal());
    onItem('.edit-item', () => this.toggleEditMode());
    onItem('.header-toggle', () => this.toggleHeader());
    onItem('.sidebar-toggle', () => this.toggleSidebar());
    onItem('.reorder-item', () => this.showReorderModal());

    this.dropdown.querySelectorAll('.room-item').forEach((roomItem) => {
      roomItem.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const roomId = (roomItem as HTMLElement).getAttribute('data-room-id');
        if (roomId) {
          navigateToDashboardPath(`room-${roomId}`);
        }
        this.closeDropdown();
      });
    });
  }

  private setupScrollBehavior() {
    if (!this.headerElement) {
      console.error('No headerElement found for scroll behavior setup');
      return;
    }

    this.removeWindowListeners();

    let ticking = false;

    const updateHeader = () => {
      if (!this.headerElement) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
      const scrollThreshold = this.currentConfig.isSpecialPage ? 1 : 30;
      this.headerElement.classList.toggle('scrolled', scrollTop > scrollThreshold);

      ticking = false;
    };

    this.scrollListener = () => {
      if (!ticking) {
        requestAnimationFrame(updateHeader);
        ticking = true;
      }
    };

    this.resizeListener = () => {
      requestAnimationFrame(() => {
        this.syncLayout();
        this.updateSidebarButtonVisibility();
      });
    };

    window.addEventListener('scroll', this.scrollListener);
    window.addEventListener('resize', this.resizeListener);
  }

  private setupSidebarObserver() {
    this.sidebarObserver?.disconnect();
    this.sidebarObserver = observeHaLayout(
      () => {
        this.syncLayout();
        this.updateSidebarButtonVisibility();
      },
      () => this.syncLayout()
    );
  }

  private toggleDropdown() {
    if (!this.dropdown) return;

    this.isDropdownOpen = !this.isDropdownOpen;

    if (this.isDropdownOpen) {
      this.dropdown.innerHTML = this.getDropdownContent();
      this.setupDropdownItemListeners();
      this.positionDropdown();
    }

    this.dropdown.classList.toggle('open', this.isDropdownOpen);
  }

  private positionDropdown() {
    if (!this.dropdown || !this.menuButton) return;

    const buttonRect = this.menuButton.getBoundingClientRect();
    const dropdownHeight = this.dropdown.offsetHeight;
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    this.dropdown.classList.remove('dropdown-above');

    if (spaceBelow < dropdownHeight + 20 && spaceAbove > dropdownHeight + 20) {
      this.dropdown.classList.add('dropdown-above');
    }

    this.dropdown.style.right = RTLHelper.isRTL() ? 'auto' : '10px';
    this.dropdown.style.left = RTLHelper.isRTL() ? '10px' : 'auto';
  }

  private closeDropdown() {
    if (!this.dropdown) return;

    this.isDropdownOpen = false;
    this.dropdown.classList.remove('open');
  }

  private toggleEditMode() {
    if (!this.editModeManager) {
      return;
    }

    this.editModeManager.toggleEditMode();

    if (this.menuButton) {
      this.menuButton.innerHTML = menuButtonContent(this.editMode);
      this.menuButton.classList.toggle('edit-mode', this.editMode);
    }

    this.dropdown?.querySelector('.edit-item')?.classList.toggle('active', this.editMode);
  }

  private toggleHeader() {
    this.uiManager.toggleHeader();
    this.updateDropdownTexts();
    this.updateSidebarButtonVisibility();
  }

  private toggleSidebar() {
    this.uiManager.toggleSidebar();
    this.updateDropdownTexts();
    this.updateSidebarButtonVisibility();
  }

  public updateSidebarButtonVisibility() {
    if (!this.headerElement) return;

    const sidebarButton = this.headerElement.querySelector('.apple-header-sidebar-button') as HTMLElement;
    const shouldShow = this.shouldShowSidebarButton();

    if (shouldShow && !sidebarButton && !this.currentConfig.showBackButton) {
      this.addSidebarButton();
    } else if (sidebarButton && (!shouldShow || this.currentConfig.showBackButton)) {
      sidebarButton.remove();
    }
  }

  private addSidebarButton() {
    const headerContent = this.headerElement?.querySelector('.apple-header-content');
    if (!headerContent) return;

    const sidebarButton = document.createElement('button');
    sidebarButton.className = `apple-header-sidebar-button ${LiquidGlassClasses.headerButton}`;
    sidebarButton.innerHTML = '<ha-icon icon="mdi:menu"></ha-icon>';
    sidebarButton.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      openHaSidebar();
    });

    headerContent.insertBefore(sidebarButton, headerContent.firstChild);
  }

  public updateDropdownTexts() {
    if (!this.dropdown) return;

    const headerToggle = this.dropdown.querySelector('.header-toggle span');
    if (headerToggle) {
      headerToggle.textContent = this.uiManager.getHeaderToggleText();
    }

    const sidebarToggle = this.dropdown.querySelector('.sidebar-toggle span');
    if (sidebarToggle) {
      sidebarToggle.textContent = this.uiManager.getSidebarToggleText();
    }
  }

  private async showReorderModal() {
    if (!this.customizationManager || !this._hass) {
      console.warn('CustomizationManager or hass not available for section reordering');
      return;
    }

    if (!this.sectionReorderManager) {
      this.sectionReorderManager = new SectionReorderManager(this.customizationManager, () => {
        this.onRefreshCallbacks.forEach((callback) => callback());
      });
    }

    try {
      const areas = await this.getAreas();
      await this.sectionReorderManager.showReorderModal(areas, this._hass);
    } catch (error) {
      console.error('Error showing section reorder modal:', error);
    }
  }

  private async showHomeSettingsModal() {
    if (!this.customizationManager || !this._hass) {
      console.warn('CustomizationManager or hass not available for home settings');
      return;
    }

    if (!this.homeSettingsManager) {
      this.homeSettingsManager = new HomeSettingsManager(this.customizationManager, () => {
        this.onRefreshCallbacks.forEach((callback) => callback());
      });
    }

    try {
      await this.homeSettingsManager.showHomeSettingsModal(this._hass);
    } catch (error) {
      console.error('Error showing home settings modal:', error);
    }
  }

  private async getAreas(): Promise<Area[]> {
    if (!this._hass) return [];

    try {
      if (this._hass.areas) {
        return Object.values(this._hass.areas);
      }

      const areas = await this._hass.callWS({
        type: 'config/area_registry/list',
      });

      return areas || [];
    } catch (error) {
      console.warn('Could not fetch areas:', error);
      return [];
    }
  }

  private removeWindowListeners() {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = undefined;
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = undefined;
    }
  }

  private removeDocumentListeners() {
    if (this.clickOutsideListener) {
      document.removeEventListener('click', this.clickOutsideListener);
      this.clickOutsideListener = undefined;
    }
    if (this.escapeKeyListener) {
      document.removeEventListener('keydown', this.escapeKeyListener);
      this.escapeKeyListener = undefined;
    }
  }

  private cleanup() {
    this.removeWindowListeners();
    this.removeDocumentListeners();

    this.sidebarObserver?.disconnect();
    this.sidebarObserver = undefined;

    this.container?.querySelector('.hg-header')?.remove();
    this.container?.querySelector('.apple-static-title')?.remove();
    this.container?.classList.remove('has-fixed-header');

    this.headerElement = undefined;
    this.menuButton = undefined;
    this.dropdown = undefined;
    this.scrolledTitleElement = undefined;
    this.scrolledChipsContainer = undefined;
  }

  // Debounced: hass updates arrive in bursts.
  setHass(hass: any) {
    this._hass = hass;
    this.pendingHass = hass;

    if (this.setHassTimeout) {
      clearTimeout(this.setHassTimeout);
    }

    this.setHassTimeout = setTimeout(() => {
      this.processSetHass(this.pendingHass);
      this.setHassTimeout = null;
    }, 100);
  }

  private processSetHass(hass: any) {
    RTLHelper.initialize(hass);

    // Special pages (room, scenes, cameras) keep their own titles.
    if (!this.currentConfig.isGroupPage && !this.currentConfig.isSpecialPage && hass?.config?.location_name) {
      this.setTitle(hass.config.location_name);
    }
  }

  setCustomizationManager(customizationManager: CustomizationManager) {
    this.customizationManager = customizationManager;
  }

  addRefreshCallback(callback: () => void) {
    this.onRefreshCallbacks.push(callback);
  }

  removeRefreshCallback(callback: () => void) {
    const index = this.onRefreshCallbacks.indexOf(callback);
    if (index > -1) {
      this.onRefreshCallbacks.splice(index, 1);
    }
  }

  destroy() {
    if (this.setHassTimeout) {
      clearTimeout(this.setHassTimeout);
      this.setHassTimeout = null;
    }
    const rootNode = this.container?.getRootNode();
    const styleRoot: ParentNode = rootNode instanceof ShadowRoot ? rootNode : document;
    this.cleanup();
    styleRoot.querySelector(`#${HEADER_STYLE_ID}`)?.remove();
  }
}
