import { DragAndDropManager } from '../utils/DragAndDropManager';
import { EditModeManager } from '../utils/EditModeManager';
import { HomeHeader, HeaderConfig } from '../sections/HomeHeader';
import { CustomizationManager } from '../utils/CustomizationManager';
import { CardManager } from '../utils/CardManager';
import { setupLocalize, localize } from '../utils/LocalizationService';
import { HomePage } from '../pages/HomePage';
import { GroupPage } from '../pages/GroupPage';
import { RTLHelper } from '../utils/RTLHelper';
import { RoomPage } from '../pages/RoomPage';
import { ScenesPage } from '../pages/ScenesPage';
import { CamerasPage } from '../pages/CamerasPage';
import { DeviceGroup } from '../config/DashboardConfig';
import { RegistrySubscriptionManager, RegistryChangeCallback, RegistryChangeEvent } from '../utils/RegistrySubscriptionManager';
import { syncColorScheme } from '../styles/tokens';
import { escapeHtml } from '../utils/html';
import { liquidGlassCSS } from '../utils/LiquidGlassStyles';
import { VIEW_STYLES } from './view/styles';
import { CardHassRouter } from './view/CardHassRouter';
import { ChipsController } from './view/ChipsController';
import { buildHeaderConfig, headerTitleFor } from './view/headerConfig';
import { pageContextFor } from './view/pageTypes';
import { getScrollParent } from './view/scroll';
import { updateTallCardVisual } from './view/tallCard';
import { getActivePage, renderActivePage, ViewPages } from './view/renderActivePage';
import { handleEntityChange, handleAreaChange, applyHomeCustomizationDiff } from './view/domUpdates';

const RENDER_THROTTLE_MS = 500;
const PERMANENT_CHROME = '.hg-header, .permanent-chips, .apple-page-title, .hg-state-message';

export class HomeView extends HTMLElement {
  private config?: any;
  private _hass?: any;
  private _config?: any;
  private content?: HTMLElement;
  private cardRouter = new CardHassRouter();
  private _rendered = false;
  private _isTransitioning = false;
  private _lastRenderTime = 0;
  private _pendingRender?: ReturnType<typeof setTimeout>;
  private chips: ChipsController;
  private visibilityChangeHandler?: () => void;
  private globalRefreshHandler?: (event: Event) => void;

  private registrySubscriptionManager?: RegistrySubscriptionManager;
  private registryChangeHandler?: RegistryChangeCallback;
  private rtlChangeHandler?: (isRTL: boolean, language: string) => void;
  private _lastLanguage?: string;

  private pages: ViewPages;

  private customizationManager: CustomizationManager;
  private cardManager: CardManager;
  private editModeManager: EditModeManager;
  private appleHeader: HomeHeader;
  private refreshCallback: () => void;
  private dragAndDropManager: DragAndDropManager;

  constructor() {
    super();

    this.refreshCallback = () => this.refreshDashboard();

    this.customizationManager = CustomizationManager.getInstance();
    this.cardManager = new CardManager(this.customizationManager);
    this.editModeManager = new EditModeManager((editMode) => this.handleEditModeChange(editMode));

    this.appleHeader = new HomeHeader();
    this.chips = new ChipsController(
      {
        getContent: () => this.content,
        getHass: () => this._hass,
        getConfig: () => this.config,
        isEditMode: () => this.editModeManager.editMode,
        enableChipsDragAndDrop: (container) => this.dragAndDropManager.enableDragAndDrop(container),
      },
      this.appleHeader,
      this.customizationManager
    );
    this.appleHeader.setEditModeManager(this.editModeManager);

    this.dragAndDropManager = new DragAndDropManager(
      (areaId: string, grid?: HTMLElement) => this.handleSaveCurrentOrder(areaId, grid),
      this.customizationManager,
      () => this.getPageContext()
    );

    this.pages = {
      homePage: new HomePage(),
      groupPage: new GroupPage(),
      roomPage: new RoomPage(),
      scenesPage: new ScenesPage(),
      camerasPage: new CamerasPage(),
    };

    this.appleHeader.setCustomizationManager(this.customizationManager);
  }

  connectedCallback() {
    this.visibilityChangeHandler = () => this.callOnCards(document.hidden ? 'pauseCamera' : 'resumeCamera');
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);

    this.globalRefreshHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (this._hass && customEvent.detail?.customizations) {
        this.handleGlobalRefresh(customEvent.detail.customizations);
      }
    };
    document.addEventListener('hg-dashboard-refresh', this.globalRefreshHandler);

    this.appleHeader.removeRefreshCallback(this.refreshCallback);
    this.appleHeader.addRefreshCallback(this.refreshCallback);

    if (this.content) {
      this.cardRouter.observe(this.content);
      void this.updateHeaderForConfig();
    }

    this.setupRegistrySubscriptions();
    this.setupRTLChangeDetection();
  }

  disconnectedCallback() {
    // Persist anything still held back by edit mode, so pending reorders are not
    // lost if the view is torn down (navigation, reload) before edit mode ends.
    void this.customizationManager.flushDeferredSaves();

    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
    if (this.globalRefreshHandler) {
      document.removeEventListener('hg-dashboard-refresh', this.globalRefreshHandler);
    }

    if (this._pendingRender) {
      clearTimeout(this._pendingRender);
      this._pendingRender = undefined;
    }

    this.cardRouter.disconnect();
    this.cleanupRegistrySubscriptions();
    this.cleanupRTLChangeDetection();
    this.appleHeader.removeRefreshCallback(this.refreshCallback);

    if (this.content) {
      this.dragAndDropManager.disableDragAndDrop(this.content);
    }

    this.callOnCards('cleanup');
    this.appleHeader.destroy();
  }

  private async handleGlobalRefresh(customizations: any) {
    try {
      await this.customizationManager.setCustomizations(customizations);
      this.config = { ...this.config, customizations };
      this._rendered = false;
      await this.renderPage('globalRefresh');
    } catch (error) {
      console.error('Home Glass: Error during global refresh:', error);
    }
  }

  private setupRegistrySubscriptions(): void {
    this.registrySubscriptionManager = RegistrySubscriptionManager.getInstance();

    this.registryChangeHandler = (event) => {
      if (this.editModeManager?.editMode) return;
      this.handleRegistryChange(event);
    };
    
    this.registrySubscriptionManager.addListener(this.registryChangeHandler);

    if (this._hass) {
      this.registrySubscriptionManager.setHass(this._hass);
    }
  }

  private cleanupRegistrySubscriptions(): void {
    if (this.registryChangeHandler && this.registrySubscriptionManager) {
      this.registrySubscriptionManager.removeListener(this.registryChangeHandler);
    }
    this.registryChangeHandler = undefined;
  }

  private async handleRegistryChange(event: RegistryChangeEvent): Promise<void> {
    if (!this._rendered || this._isTransitioning || !this._hass || !this.content) return;

    switch (event.type) {
      case 'entity':
        await handleEntityChange(this.content, this._hass, event);
        break;
      case 'area':
        await handleAreaChange(this.content, this._hass, event);
        break;
      case 'device':
        // Entity registry events fire separately for the affected entities.
        break;
    }
  }

  private setupRTLChangeDetection(): void {
    this.rtlChangeHandler = (isRTL: boolean, language: string) => {
      this.handleRTLChange(isRTL, language);
    };

    RTLHelper.addListener(this.rtlChangeHandler);
  }

  private cleanupRTLChangeDetection(): void {
    if (this.rtlChangeHandler) {
      RTLHelper.removeListener(this.rtlChangeHandler);
    }
    this.rtlChangeHandler = undefined;
  }

  private handleRTLChange(isRTL: boolean, language: string): void {
    if (this.content) {
      const wrapperContent = this.shadowRoot?.querySelector('.wrapper-content');
      if (wrapperContent) {
        wrapperContent.classList.remove('rtl', 'ltr');
        wrapperContent.classList.add(isRTL ? 'rtl' : 'ltr');
      }
    }

    if (this._rendered && !this._isTransitioning) {
      this._rendered = false;
      this.renderPage('rtlChange');
    }
  }

  async setConfig(config: any) {
    const oldConfig = this._config;

    // Reset on every config change; keeping the flag across navigation corrupts state.
    this._rendered = false;

    this.config = config;

    // Stored customizations win over config so navigation sees the latest settings.
    if (this._hass) {
      await this.loadAndApplyCustomizations();
    } else {
      await this.customizationManager.setCustomizations(config.customizations || {
        home: { sections: { order: [], hidden: [] }, favorites: [], excluded_from_dashboard: [], excluded_from_home: [] },
        pages: {},
        ui: {},
        background: {}
      });
    }

    this._config = config;

    if (config.title) {
      this.appleHeader.setTitle(headerTitleFor(config));
    }

    if (this._hass) {
      if (this.needsFullRender(oldConfig, config)) {
        this.renderPage('setConfig-fullRender');
      } else {
        this.updateConfigProperties(config);
      }
    }
  }

  private needsFullRender(oldConfig: any, newConfig: any): boolean {
    if (!oldConfig) return true;

    return (
      oldConfig.pageType !== newConfig.pageType ||
      oldConfig.areaId !== newConfig.areaId ||
      oldConfig.areaName !== newConfig.areaName ||
      oldConfig.deviceGroup !== newConfig.deviceGroup ||
      oldConfig.activeGroup !== newConfig.activeGroup
    );
  }

  private updateConfigProperties(config: any): void {
    if (config.title !== this.config?.title) {
      this.appleHeader.setTitle(headerTitleFor(config));
    }

    if (config.activeGroup !== this.config?.activeGroup) {
      this.chips.setActiveGroup(config.activeGroup);
    }

    // No diff baseline after a config change, so every indexed card is refreshed.
    this.updateExistingCards(undefined, this._hass);
    this.chips.update();
  }

  private async updateHeaderForConfig() {
    if (!this.content || !this.config) return;

    await this.appleHeader.init(this.content, buildHeaderConfig(this.config));
    this.appleHeader.updatePageContentPadding();
    this.chips.ensureConfiguredForHeader();
  }

  set hass(hass: any) {
    const oldHass = this._hass;
    this._hass = hass;

    setupLocalize(hass);
    if (oldHass?.themes?.darkMode !== hass?.themes?.darkMode) syncColorScheme(hass);

    this.customizationManager.setHass(hass);
    this.appleHeader.setHass(hass);
    this.registrySubscriptionManager?.setHass(hass);

    const currentLanguage = hass?.locale?.language || hass?.language;
    if (this._lastLanguage && currentLanguage && this._lastLanguage !== currentLanguage) {
      RTLHelper.checkForChanges(hass);
    }
    this._lastLanguage = currentLanguage;

    // Customizations are reloaded on the first hass only; reloading on every state push would re-render needlessly.
    if (!oldHass) {
      this.loadAndApplyCustomizations();
    }

    this.ensureShadowRootExists();

    if (!this._rendered) {
      this.renderPage('setHass-firstTime');
    } else {
      this.updateExistingCards(oldHass, this._hass);
      this.chips.update();
    }
  }

  private async loadAndApplyCustomizations() {
    if (!this._hass) return;

    try {
      const customizations = await this.customizationManager.loadCustomizations();
      await this.customizationManager.setCustomizations(customizations);

      if (this.config) {
        const oldCustomizations = this.config.customizations;
        this.config = { ...this.config, customizations };

        // A re-render during edit mode would tear down the active drag and drop.
        if (
          this._rendered &&
          !this.editModeManager?.editMode &&
          JSON.stringify(oldCustomizations) !== JSON.stringify(customizations) &&
          this.customizationChangesRequireRender(oldCustomizations, customizations)
        ) {
          this._rendered = false;
          this.renderPage('customizationChange');
        }
      }
    } catch (error) {
      console.error('Home Glass: Error loading customizations:', error);
    }
  }

  // Background and header/sidebar visibility are UI-only; entity layout lives under home and pages.
  private customizationChangesRequireRender(oldCustomizations: any, newCustomizations: any): boolean {
    return ['home', 'pages'].some(
      (key) => JSON.stringify(oldCustomizations?.[key]) !== JSON.stringify(newCustomizations?.[key])
    );
  }

  private async ensureShadowRootExists() {
    let structureCreated = false;

    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }

    const wrapperContent = this.shadowRoot!.querySelector('.wrapper-content');
    if (!wrapperContent) {
      structureCreated = true;
      this.shadowRoot!.innerHTML = `
        <style>${liquidGlassCSS}${VIEW_STYLES}</style>
        <div class="wrapper-content ${RTLHelper.isRTL() ? 'rtl' : 'ltr'}">
          <div class="page-content">
            <div class="hg-header permanent-header"></div>
            <div class="permanent-chips"></div>
          </div>
        </div>
      `;
    }

    const content = this.shadowRoot!.querySelector('.page-content') as HTMLElement;
    if (content !== this.content) {
      this.content = content;
      this.cardRouter.observe(this.content);
    }

    this.chips.attach();

    if (structureCreated) {
      await this.updateHeaderForConfig();
    }
  }

  private updateExistingCards(oldHass: any, newHass: any) {
    if (!this.content || !newHass) return;

    this.cardRouter.update(this.content, oldHass, newHass);

    // Only the rendered page object needs the new hass.
    const activePage = getActivePage(this.pages, this.config);
    if (activePage) activePage.hass = newHass;
  }

  private handleEditModeChange(editMode: boolean) {
    // Entering edit mode holds customization writes in memory. Every
    // `lovelace/config/save` makes Home Assistant re-render the dashboard from
    // the strategy, which rebuilds this component and resets edit mode - so
    // persisting on each drop would exit edit mode after every single card move.
    // Changes are flushed once, when the user leaves edit mode.
    if (editMode) {
      this.customizationManager.beginDeferredSaves();
    } else {
      void this.customizationManager.flushDeferredSaves();
    }

    this.chips.setEditMode(editMode);

    const pageType = this.config?.pageType;
    if (pageType === 'cameras') {
      this.pages.camerasPage.updateDragAndDrop(editMode, this.content!);
    } else if (pageType === 'scenes') {
      this.pages.scenesPage.updateDragAndDrop(editMode, this.content!);
    } else {
      if (editMode) {
        // Let the cards finish rendering before wiring up sortables
        setTimeout(() => {
          this.dragAndDropManager.enableDragAndDrop(this.content!);
          EditModeManager.updateEntityWrapperStyles(this.content!, true);
        }, 100);
      } else {
        this.dragAndDropManager.disableDragAndDrop(this.content!);
        EditModeManager.updateEntityWrapperStyles(this.content!, false);
      }

      if (pageType !== 'room') {
        this.classList.toggle('edit-mode', editMode);
      }
    }
  }

  // A room renders several grids with the same data-area-id (one per device group),
  // so the dragged grid must be passed in; the selector is only a fallback.
  private handleSaveCurrentOrder(areaId: string, grid?: HTMLElement) {
    const areaContainer = grid ?? this.content!.querySelector(`[data-area-id="${areaId}"]`);
    if (!areaContainer) return;

    const wrappers = areaContainer.querySelectorAll('.entity-card-wrapper:not(.drag-placeholder)');
    const newOrder: string[] = [];

    wrappers.forEach(wrapper => {
      const entityId = (wrapper as HTMLElement).dataset.entityId;
      if (entityId) {
        newOrder.push(entityId);
      }
    });

    const context = this.getPageContext();
    const domain = context === 'room' ? (areaContainer as HTMLElement).dataset.deviceGroup : undefined;

    this.customizationManager.saveCardOrderWithContext(areaId, newOrder, context, domain);
  }

  private getPageContext(): string {
    return pageContextFor(this.config?.pageType);
  }

  private async renderPage(source: string = 'unknown') {
    if (!this.content || !this._hass || this._isTransitioning) {
      return;
    }

    // Renders requested inside the window are coalesced into one trailing render.
    const wait = RENDER_THROTTLE_MS - (Date.now() - this._lastRenderTime);
    if (wait > 0) {
      this._rendered = false;
      if (!this._pendingRender) {
        this._pendingRender = setTimeout(() => {
          this._pendingRender = undefined;
          void this.renderPage(source);
        }, wait);
      }
      return;
    }
    this._lastRenderTime = Date.now();

    this._isTransitioning = true;

    // Crossfade on re-renders; the permanent header and chips are the first two children.
    const hasExistingContent = this.content && this.content.children.length > 2;

    const scrollParent = getScrollParent(this);
    const savedScrollTop = hasExistingContent && scrollParent ? scrollParent.scrollTop : 0;

    if (hasExistingContent) {
      this.content.style.transition = 'opacity var(--hg-dur-fast) var(--hg-ease-standard)';
      this.content.style.opacity = '0';
      await new Promise(r => setTimeout(r, 150));
    }

    try {
      this.chips.forceReset();
      this.callOnCards('pauseCamera');

      await renderActivePage(
        this.pages,
        this.config,
        this._hass,
        this.customizationManager.getCustomizations(),
        this.content,
        (entityId, areaId) => this.toggleTallCard(entityId, areaId)
      );
      this.showEmptyStateIfBare();
    } catch (error) {
      console.error('Error rendering page:', error);
      this._isTransitioning = false;
      this.showRenderError(error);
    }

    this._rendered = true;

    if (this.content) {
      this.content.style.opacity = '1';
    }

    if (savedScrollTop > 0 && scrollParent) {
      scrollParent.scrollTop = savedScrollTop;
    }

    this.chips.ensureExist();

    // Pages await mid-render, so pushes that arrived meanwhile never reached the new cards.
    this.cardRouter.markDirty();
    this.updateExistingCards(undefined, this._hass);
    this.chips.update();

    setTimeout(() => {
      this.chips.ensureConfiguredForHeader();
    }, 100);

    setTimeout(() => {
      this.callOnCards('resumeCamera');
      this._isTransitioning = false;
    }, 200);
  }

  private showEmptyStateIfBare(): void {
    if (!this.content) return;
    const bare = Array.from(this.content.children).every((child) => child.matches(PERMANENT_CHROME));
    if (bare) this.appendStateMessage('mdi:home-outline', localize('settings.no_entities_found'));
  }

  private appendStateMessage(icon: string, title: string, detail = ''): void {
    this.content!.querySelector('.hg-state-message')?.remove();
    const box = document.createElement('div');
    box.className = 'hg-state-message hg-glass';
    box.innerHTML = `<ha-icon icon="${icon}"></ha-icon><div class="hg-state-title">${escapeHtml(title)}</div>${detail ? `<div class="hg-state-detail">${escapeHtml(detail)}</div>` : ''}`;
    this.content!.appendChild(box);
  }

  private showRenderError(error: unknown): void {
    if (!this.content) return;
    this.appendStateMessage(
      'mdi:alert-circle-outline',
      localize('errors.render_failed', 'This page could not be loaded'),
      error instanceof Error ? error.message : ''
    );
    this.content.querySelector('.hg-state-message')?.setAttribute('role', 'alert');
  }

  private async toggleTallCard(entityId: string, areaId: string) {
    const context = this.getPageContext();
    const newTallState = await this.cardManager.toggleTallCard(entityId, areaId, context);
    updateTallCardVisual(this.shadowRoot!, this.cardManager, entityId, areaId, context);
    
    return newTallState;
  }

  getCardSize() {
    return 1;
  }

  private callOnCards(method: 'cleanup' | 'pauseCamera' | 'resumeCamera') {
    this.content?.querySelectorAll('home-glass-card').forEach((card: any) => {
      if (typeof card[method] === 'function') card[method]();
    });
  }

  private async refreshDashboard() {
    if (this.editModeManager?.editMode || !this._hass || !this.content) return;

    try {
      const oldHome = this.config?.customizations?.home || {};
      const fresh = this.customizationManager.getCustomizations();
      this.config = { ...this.config, customizations: JSON.parse(JSON.stringify(fresh)) };

      const needsRender = applyHomeCustomizationDiff(this.content, this._hass, oldHome, fresh?.home || {}, this.config?.pageType);
      if (needsRender) {
        this._rendered = false;
        await this.renderPage('refreshCallback');
      }
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    }
  }
}
