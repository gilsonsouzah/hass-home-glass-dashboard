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

export class HomeView extends HTMLElement {
  private config?: any;
  private _hass?: any;
  private _config?: any;
  private content?: HTMLElement;
  private cardRouter = new CardHassRouter();
  private _rendered = false;
  private _isTransitioning = false; // Add transition state
  private _lastRenderTime = 0;
  private _pendingRender?: ReturnType<typeof setTimeout>;
  private chips: ChipsController;
  private visibilityChangeHandler?: () => void; // Add visibility change handler
  private globalRefreshHandler?: (event: Event) => void; // Add global refresh handler
  
  // Registry subscription handlers for automatic updates
  private registrySubscriptionManager?: RegistrySubscriptionManager;
  private registryChangeHandler?: RegistryChangeCallback;
  private rtlChangeHandler?: (isRTL: boolean, language: string) => void;
  private _lastLanguage?: string; // Track language for change detection
  
  // Page renderers
  private pages: ViewPages;

  // Managers
  private customizationManager: CustomizationManager;
  private cardManager: CardManager;
  private editModeManager: EditModeManager;
  private appleHeader: HomeHeader;
  private refreshCallback: () => void;
  private dragAndDropManager: DragAndDropManager;

  constructor() {
    super();
    
    // Initialize callbacks
    this.refreshCallback = () => this.refreshDashboard();

    // Initialize managers as instance-specific but use singleton for customization
    this.customizationManager = CustomizationManager.getInstance();
    this.cardManager = new CardManager(this.customizationManager);
    this.editModeManager = new EditModeManager((editMode) => this.handleEditModeChange(editMode));
    
    // Create instance-specific header (NO SINGLETON!) and pass editModeManager
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
    this.appleHeader.addRefreshCallback(this.refreshCallback);
    
    this.dragAndDropManager = new DragAndDropManager(
      (areaId: string, grid?: HTMLElement) => this.handleSaveCurrentOrder(areaId, grid),
      this.customizationManager,
      () => this.getPageContext()
    );
    
    // Initialize page renderers
    this.pages = {
      homePage: new HomePage(),
      groupPage: new GroupPage(),
      roomPage: new RoomPage(),
      scenesPage: new ScenesPage(),
      camerasPage: new CamerasPage(),
    };
    
    // Set up header manager dependencies
    this.appleHeader.setCustomizationManager(this.customizationManager);
    
  }

  connectedCallback() {
    // Create and store visibility change handler to pause cameras when hidden
    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        // Pause all cameras when page becomes hidden
        this.callOnCards('pauseCamera');
      } else {
        // Resume cameras when page becomes visible
        this.callOnCards('resumeCamera');
      }
    };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);

    // Create and store global refresh handler
    this.globalRefreshHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      // Only refresh if we have hass and this is a different customization update
      if (this._hass && customEvent.detail?.customizations) {
        this.handleGlobalRefresh(customEvent.detail.customizations);
      }
    };
    document.addEventListener('hg-dashboard-refresh', this.globalRefreshHandler);
    
    if (this.content) this.cardRouter.observe(this.content);

    this.setupRegistrySubscriptions();
    
    // Set up RTL change detection
    this.setupRTLChangeDetection();
    
  }

  disconnectedCallback() {
    // Persist anything still held back by edit mode, so pending reorders are not
    // lost if the view is torn down (navigation, reload) before edit mode ends.
    void this.customizationManager.flushDeferredSaves();

    // Clean up event listeners
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

    // Clean up registry subscription handlers
    this.cleanupRegistrySubscriptions();
    
    // Clean up RTL change detection
    this.cleanupRTLChangeDetection();
    
    // Clean up instance-specific header callbacks
    if (this.refreshCallback) {
      this.appleHeader.removeRefreshCallback(this.refreshCallback);
    }
    
    // Clean up managers and their resources
    if (this.content) {
      this.dragAndDropManager.disableDragAndDrop(this.content);
    }
    
    this.callOnCards('cleanup');
    this.appleHeader.destroy();
  }

  private async handleGlobalRefresh(customizations: any) {
    try {
      // Update the customization manager with fresh data
      await this.customizationManager.setCustomizations(customizations);
      
      // Update config with fresh customizations
      this.config = {
        ...this.config,
        customizations: customizations
      };
      
      // Apply changes immediately if not already rendered by customization changes
      this._rendered = false;
      await this.renderPage('globalRefresh');
      
    } catch (error) {
      console.error('Home Glass: Error during global refresh:', error);
    }
  }

  /**
   * Set up registry subscription manager for automatic updates
   * This handles: entity area changes, device moves, entity hide/delete/disable
   */
  private setupRegistrySubscriptions(): void {
    this.registrySubscriptionManager = RegistrySubscriptionManager.getInstance();
    
    // Create the handler for registry changes
    this.registryChangeHandler = (event) => {
      if (this.editModeManager?.editMode) return;
      this.handleRegistryChange(event);
    };
    
    this.registrySubscriptionManager.addListener(this.registryChangeHandler);
    
    // Initialize with hass if available
    if (this._hass) {
      this.registrySubscriptionManager.setHass(this._hass);
    }
  }

  /**
   * Clean up registry subscriptions
   */
  private cleanupRegistrySubscriptions(): void {
    if (this.registryChangeHandler && this.registrySubscriptionManager) {
      this.registrySubscriptionManager.removeListener(this.registryChangeHandler);
    }
    this.registryChangeHandler = undefined;
  }

  /**
   * Handle registry changes with surgical DOM updates - no full page rebuilds.
   */
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
        // Device area changes affect entities on that device.
        // The entity registry events will fire separately for those, so no action needed here.
        break;
    }
  }

  /**
   * Set up RTL change detection
   */
  private setupRTLChangeDetection(): void {
    this.rtlChangeHandler = (isRTL: boolean, language: string) => {
      // Handle RTL/language change
      this.handleRTLChange(isRTL, language);
    };
    
    RTLHelper.addListener(this.rtlChangeHandler);
  }

  /**
   * Clean up RTL change detection
   */
  private cleanupRTLChangeDetection(): void {
    if (this.rtlChangeHandler) {
      RTLHelper.removeListener(this.rtlChangeHandler);
    }
    this.rtlChangeHandler = undefined;
  }

  /**
   * Handle RTL/language changes
   */
  private handleRTLChange(isRTL: boolean, language: string): void {
    // Update wrapper content direction class
    if (this.content) {
      const wrapperContent = this.shadowRoot?.querySelector('.wrapper-content');
      if (wrapperContent) {
        wrapperContent.classList.remove('rtl', 'ltr');
        wrapperContent.classList.add(isRTL ? 'rtl' : 'ltr');
      }
    }
    
    // Force re-render to update all RTL-dependent UI elements
    if (this._rendered && !this._isTransitioning) {
      this._rendered = false;
      this.renderPage('rtlChange');
    }
  }

  async setConfig(config: any) {
    
    // Store old config for comparison
    const oldConfig = this._config;
    
    // CRITICAL FIX: Force complete reset on every config change
    // This prevents state corruption during navigation
    this._rendered = false;
    
    
    this.config = config;

    // CRITICAL: Always load fresh customizations from storage instead of using config
    // This ensures we get the latest settings even when navigating between pages
    if (this._hass) {
      await this.loadAndApplyCustomizations();
    } else {
      // If no hass yet, set the config customizations as fallback
      await this.customizationManager.setCustomizations(config.customizations || { 
        home: { sections: { order: [], hidden: [] }, favorites: [], excluded_from_dashboard: [], excluded_from_home: [] }, 
        pages: {}, 
        ui: {}, 
        background: {} 
      });
    }
    
    this._config = config;
    
    // Update header title if available
    if (this.appleHeader && config.title) {
      this.appleHeader.setTitle(headerTitleFor(config));
    } else {
    }
    
    // Smart render: only full re-render if structural changes occurred
    if (this._hass) {
      if (this.needsFullRender(oldConfig, config)) {
        this.renderPage('setConfig-fullRender');
      } else {
        // Just update existing components with new config
        this.updateConfigProperties(config);
      }
    }
  }

  private needsFullRender(oldConfig: any, newConfig: any): boolean {
    // No old config means first render
    if (!oldConfig) return true;
    
    // Check for structural changes that require full re-render
    return (
      oldConfig.pageType !== newConfig.pageType ||
      oldConfig.areaId !== newConfig.areaId ||
      oldConfig.areaName !== newConfig.areaName ||
      oldConfig.deviceGroup !== newConfig.deviceGroup ||
      oldConfig.activeGroup !== newConfig.activeGroup
    );
  }

  private updateConfigProperties(config: any): void {
    // Update title without full render
    if (this.appleHeader && config.title !== this.config?.title) {
      this.appleHeader.setTitle(headerTitleFor(config));
    }
    
    // Update chips active group if changed
    if (config.activeGroup !== this.config?.activeGroup) {
      this.chips.setActiveGroup(config.activeGroup);
    }
    
    // Update existing cards with new hass if available (no diff baseline after a config change)
    this.updateExistingCards(undefined, this._hass);

    // Update chips to reflect any config changes
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
    
    // Setup localization with the new hass instance
    setupLocalize(hass);
    
    // Update managers with new hass
    this.customizationManager.setHass(hass);
    this.appleHeader.setHass(hass);
    
    // Update registry subscription manager with new hass
    if (this.registrySubscriptionManager) {
      this.registrySubscriptionManager.setHass(hass);
    }
    
    // Check for RTL/language changes on every hass update
    const currentLanguage = hass?.locale?.language || hass?.language;
    if (this._lastLanguage && currentLanguage && this._lastLanguage !== currentLanguage) {
      // Language changed - check for RTL change
      RTLHelper.checkForChanges(hass);
    }
    this._lastLanguage = currentLanguage;
    
    // Only load customizations on first hass set, not on every hass update
    // This prevents unnecessary re-rendering and title updates on entity state changes
    const isFirstHassSet = !oldHass;
    if (isFirstHassSet) {
      // CRITICAL: Load fresh customizations only on first hass set
      // This ensures navigation to any page gets the latest excluded entities
      this.loadAndApplyCustomizations();
    }
    
    // Ensure shadow root exists (but don't recreate if it exists)
    this.ensureShadowRootExists();
    
    // Only render if this is the first time
    if (!this._rendered) {
      this.renderPage('setHass-firstTime');
    } else {
      // Optimized updates: route the new hass only to affected cards
      this.updateExistingCards(oldHass, this._hass);
      this.chips.update();
    }
  }

  private async loadAndApplyCustomizations() {
    if (!this._hass) return;
    
    try {
      // Load customizations from storage
      const customizations = await this.customizationManager.loadCustomizations();
      
      // Set the loaded customizations
      await this.customizationManager.setCustomizations(customizations);
      
      // Update config with loaded customizations
      if (this.config) {
        const oldCustomizations = this.config.customizations;
        
        this.config = {
          ...this.config,
          customizations: customizations
        };
        
        // If page is already rendered and customizations changed, check if full render is needed
        // BUT SKIP re-render if we're in edit mode to prevent breaking drag and drop
        if (this._rendered && JSON.stringify(oldCustomizations) !== JSON.stringify(customizations)) {
          const isInEditMode = this.editModeManager?.editMode;
          
          if (!isInEditMode) {
            // Check if the changes require a full render or just UI updates
            const needsFullRender = this.customizationChangesRequireRender(oldCustomizations, customizations);
            
            if (needsFullRender) {
              this._rendered = false;
              this.renderPage('customizationChange');
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Home Glass: Error loading customizations:', error);
    }
  }

  /**
   * Check if customization changes require a full page render
   * vs just UI-only updates (like background, header/sidebar visibility)
   */
  private customizationChangesRequireRender(oldCustomizations: any, newCustomizations: any): boolean {
    // Entity-related changes that require full render
    const entityChangingKeys = ['home', 'pages'];
    
    for (const key of entityChangingKeys) {
      if (JSON.stringify(oldCustomizations?.[key]) !== JSON.stringify(newCustomizations?.[key])) {
        return true;
      }
    }
    
    return false;
  }


  private async ensureShadowRootExists() {
    let structureCreated = false;
    
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    
    // Check if HTML structure exists, not just shadow root
    const wrapperContent = this.shadowRoot!.querySelector('.wrapper-content');
    if (!wrapperContent) {
      structureCreated = true;
      this.shadowRoot!.innerHTML = `
        <style>${VIEW_STYLES}</style>
        <div class="wrapper-content ${RTLHelper.isRTL() ? 'rtl' : 'ltr'}">
          <div class="page-content">
            <div class="hg-header permanent-header"></div>
            <div class="permanent-chips"></div>
          </div>
        </div>
      `;
    }
    
    // Always ensure we have the references after HTML structure exists
    const content = this.shadowRoot!.querySelector('.page-content') as HTMLElement;
    if (content !== this.content) {
      this.content = content;
      this.cardRouter.observe(this.content);
    }

    this.chips.attach();

    // Only initialize header when structure is created for the first time
    // This prevents repeated header initialization calls
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

    // Update chips edit mode
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
        // Pending order changes are persisted by flushDeferredSaves() above
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

    // Save the card order to customizations instead of trying to modify the config
    // This approach persists via Home Assistant storage and doesn't modify immutable objects
    // Use context-specific saving based on page type
    const context = this.getPageContext();
    
    // For room pages, extract the domain from the container's data-device-group attribute
    let domain: string | undefined;
    if (context === 'room') {
      const deviceGroup = (areaContainer as HTMLElement).dataset.deviceGroup;
      domain = deviceGroup;
    }
    
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
    
    // Set transition state to prevent concurrent renders
    this._isTransitioning = true;

    // Smooth crossfade on re-renders to avoid visible flash
    const hasExistingContent = this.content && this.content.children.length > 2;

    // Save scroll position before rebuild
    const scrollParent = getScrollParent(this);
    const savedScrollTop = hasExistingContent && scrollParent ? scrollParent.scrollTop : 0;

    if (hasExistingContent) {
      this.content.style.transition = 'opacity 0.15s ease-out';
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
    } catch (error) {
      console.error('Error rendering page:', error);
      this._isTransitioning = false;
    }

    // Mark as rendered immediately after render logic completes
    this._rendered = true;

    // Fade content back in after rebuild
    if (this.content) {
      this.content.style.opacity = '1';
    }

    // Restore scroll position
    if (savedScrollTop > 0 && scrollParent) {
      scrollParent.scrollTop = savedScrollTop;
    }

    // CRITICAL: Ensure chips are recreated and properly configured after page render
    this.chips.ensureExist();
    
    // Pages await mid-render, so pushes that arrived meanwhile never reached the new cards.
    this.cardRouter.markDirty();
    this.updateExistingCards(undefined, this._hass);
    this.chips.update();
    
    // CRITICAL: Connect chips to header after everything is ready
    setTimeout(() => {
      this.chips.ensureConfiguredForHeader();
    }, 100);

    // Resume cameras after page is rendered
    setTimeout(() => {
      this.callOnCards('resumeCamera');
      this._isTransitioning = false;
    }, 200);
  }

  private async toggleTallCard(entityId: string, areaId: string) {
    const context = this.getPageContext();
    
    // Wait for the toggle operation to complete with the correct context
    const newTallState = await this.cardManager.toggleTallCard(entityId, areaId, context);
    
    // Now update the visual to match the new state - target the specific card that was clicked
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
