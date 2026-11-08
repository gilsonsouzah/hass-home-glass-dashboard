import { HomeCard } from './HomeCard';
import { DragAndDropManager } from '../utils/DragAndDropManager';
import { EditModeManager } from '../utils/EditModeManager';
import { HomeHeader, HeaderConfig } from '../sections/HomeHeader';
import { CustomizationManager } from '../utils/CustomizationManager';
import { CardManager } from '../utils/CardManager';
import { setupLocalize, localize } from '../utils/LocalizationService';
import { HomeChips } from '../sections/HomeChips';
import { ChipsConfigurationManager } from '../utils/ChipsConfigurationManager';
import { HomePage } from '../pages/HomePage';
import { GroupPage } from '../pages/GroupPage';
import { RTLHelper } from '../utils/RTLHelper';
import { RoomPage } from '../pages/RoomPage';
import { ScenesPage } from '../pages/ScenesPage';
import { CamerasPage } from '../pages/CamerasPage';
import { DeviceGroup } from '../config/DashboardConfig';
import { RegistrySubscriptionManager, RegistryChangeCallback, RegistryChangeEvent } from '../utils/RegistrySubscriptionManager';
import { VIEW_STYLES } from './view/styles';
import { isEntityHiddenOrDisabled, resolveEntityAreaId } from '../utils/registryDisplay';

const RENDER_THROTTLE_MS = 500;

export class HomeView extends HTMLElement {
  private config?: any;
  private _hass?: any;
  private _config?: any;
  private content?: HTMLElement;
  // Targeted event routing: entity_id -> cards that render it.
  private entityCardIndex: Map<string, Set<HomeCard>> = new Map();
  // Cards that must receive every hass update regardless of state diff (cameras).
  private alwaysUpdateCards: Set<HomeCard> = new Set();
  // Set true whenever this.content's card DOM changes; triggers a lazy index rebuild.
  private indexDirty: boolean = true;
  private contentMutationObserver?: MutationObserver;
  private _rendered = false;
  private _isTransitioning = false; // Add transition state
  private _lastRenderTime = 0;
  private _pendingRender?: ReturnType<typeof setTimeout>;
  private chipsElement?: HomeChips;
  private visibilityChangeHandler?: () => void; // Add visibility change handler
  private globalRefreshHandler?: (event: Event) => void; // Add global refresh handler
  
  // Registry subscription handlers for automatic updates
  private registrySubscriptionManager?: RegistrySubscriptionManager;
  private registryChangeHandler?: RegistryChangeCallback;
  private rtlChangeHandler?: (isRTL: boolean, language: string) => void;
  private _lastLanguage?: string; // Track language for change detection
  
  // Page renderers
  private homePage: HomePage;
  private groupPage: GroupPage;
  private roomPage: RoomPage;
  private scenesPage: ScenesPage;
  private camerasPage: CamerasPage;

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
    this.appleHeader.setEditModeManager(this.editModeManager);
    this.appleHeader.addRefreshCallback(this.refreshCallback);
    
    this.dragAndDropManager = new DragAndDropManager(
      (areaId: string, grid?: HTMLElement) => this.handleSaveCurrentOrder(areaId, grid),
      this.customizationManager,
      () => this.getPageContext()
    );
    
    // Initialize page renderers
    this.homePage = new HomePage();
    this.groupPage = new GroupPage();
    this.roomPage = new RoomPage();
    this.scenesPage = new ScenesPage();
    this.camerasPage = new CamerasPage();
    
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
    
    if (this.content) this.setupContentMutationObserver();

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

    // Stop watching content for card DOM changes
    if (this.contentMutationObserver) {
      this.contentMutationObserver.disconnect();
      this.contentMutationObserver = undefined;
    }

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
        await this.handleEntityChange(event);
        break;
      case 'area':
        await this.handleAreaChange(event);
        break;
      case 'device':
        // Device area changes affect entities on that device.
        // The entity registry events will fire separately for those, so no action needed here.
        break;
    }
  }

  private async handleEntityChange(event: RegistryChangeEvent): Promise<void> {
    const entityId = event.data?.entity_id;
    if (!entityId || !this.content || !this._hass) return;

    if (event.action === 'remove') {
      this.fadeOutCard(entityId);
      return;
    }

    if (event.action === 'update') {
      if (isEntityHiddenOrDisabled(this._hass, entityId)) {
        this.fadeOutCard(entityId);
        return;
      }

      const newAreaId = resolveEntityAreaId(this._hass, entityId);

      const wrapper = this.content.querySelector(`.entity-card-wrapper[data-entity-id="${entityId}"]`) as HTMLElement;
      if (wrapper) {
        const currentGrid = wrapper.closest('.area-entities') as HTMLElement;
        const currentAreaId = currentGrid?.dataset?.areaId;

        if (currentAreaId && currentAreaId !== newAreaId) {
          // Entity moved to a different area
          const targetGrid = this.content.querySelector(`.area-entities[data-area-id="${newAreaId}"]`) as HTMLElement;
          if (targetGrid) {
            // Move card to the target area grid
            wrapper.style.transition = 'opacity 0.2s ease';
            wrapper.style.opacity = '0';
            await new Promise(r => setTimeout(r, 200));
            targetGrid.appendChild(wrapper);
            wrapper.style.opacity = '1';
          } else {
            // Target area not on this page - just remove card
            this.fadeOutCard(entityId);
          }
          this.cleanupEmptySection(currentGrid);
        }
      }
      // If card not in DOM but entity exists and isn't hidden → was previously hidden, skip
      // It will appear on next navigation
    }
  }

  private async handleAreaChange(event: RegistryChangeEvent): Promise<void> {
    if (!this.content || !this._hass) return;

    if (event.action === 'remove') {
      const areaId = event.data?.area_id;
      if (!areaId) return;
      const grid = this.content.querySelector(`.area-entities[data-area-id="${areaId}"]`) as HTMLElement;
      if (grid) {
        const title = grid.previousElementSibling as HTMLElement;
        grid.style.transition = 'opacity 0.2s ease';
        grid.style.opacity = '0';
        if (title?.classList.contains('area-title')) {
          title.style.transition = 'opacity 0.2s ease';
          title.style.opacity = '0';
        }
        await new Promise(r => setTimeout(r, 200));
        grid.remove();
        if (title?.classList.contains('area-title')) title.remove();
      }
      return;
    }

    if (event.action === 'update') {
      // Area renamed - update all matching titles
      try {
        const areas = await this._hass.callWS({ type: 'config/area_registry/list' });
        for (const area of areas) {
          const grid = this.content.querySelector(`.area-entities[data-area-id="${area.area_id}"]`);
          if (grid) {
            const title = grid.previousElementSibling;
            if (title?.classList.contains('area-title')) {
              const span = title.querySelector('span');
              if (span && span.textContent !== area.name) {
                span.textContent = area.name;
              }
            }
          }
        }
      } catch {
        // Silent fail
      }
    }
  }

  private fadeOutCard(entityId: string): void {
    if (!this.content) return;
    const wrapper = this.content.querySelector(`.entity-card-wrapper[data-entity-id="${entityId}"]`) as HTMLElement;
    if (wrapper) this.fadeOutWrapper(wrapper);
  }

  private fadeOutWrapper(wrapper: HTMLElement): void {
    const parentGrid = wrapper.closest('.area-entities') as HTMLElement;

    // Cleanup the card's resources before removing
    const card = wrapper.querySelector('home-glass-card') as any;
    if (card && typeof card.cleanup === 'function') card.cleanup();

    wrapper.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    wrapper.style.opacity = '0';
    wrapper.style.transform = 'scale(0.8)';
    setTimeout(() => {
      wrapper.remove();
      if (parentGrid) this.cleanupEmptySection(parentGrid);
    }, 250);
  }

  private cleanupEmptySection(grid: HTMLElement): void {
    if (!grid || grid.children.length > 0) return;
    const title = grid.previousElementSibling as HTMLElement;
    grid.style.transition = 'opacity 0.2s ease';
    grid.style.opacity = '0';
    if (title?.classList.contains('area-title')) {
      title.style.transition = 'opacity 0.2s ease';
      title.style.opacity = '0';
    }
    setTimeout(() => {
      grid.remove();
      if (title?.classList.contains('area-title')) title.remove();
    }, 200);
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
      // For room pages, use areaName as title, not config.title
      const titleToUse = config.pageType === 'room' ? (config.areaName || config.title) : config.title;
      this.appleHeader.setTitle(titleToUse);
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
      // For room pages, use areaName as title, not config.title
      const titleToUse = config.pageType === 'room' ? (config.areaName || config.title) : config.title;
      this.appleHeader.setTitle(titleToUse);
    }
    
    // Update chips active group if changed
    if (this.chipsElement && config.activeGroup !== this.config?.activeGroup) {
      this.chipsElement.setActiveGroup(config.activeGroup);
    }
    
    // Update existing cards with new hass if available (no diff baseline after a config change)
    this.updateExistingCards(undefined, this._hass);

    // Update chips to reflect any config changes
    this.updateChips();
  }

  private async updateHeaderForConfig() {
    if (!this.content || !this.config) return;
    
    // Determine page type for header configuration
    const isGroupPage = this.config.pageType === 'group';
    const isSpecialPage = ['room', 'scenes', 'cameras'].includes(this.config.pageType);
    
    // Always ensure Apple Home header exists and is properly configured
    
    // Configure header based on page type - direct to HomeHeader
    if (!isGroupPage && !isSpecialPage) {
      // Home page: configure header for home (show menu, use home title)
      const homeConfig: HeaderConfig = {
        title: this.config.title || localize('pages.my_home'),
        isGroupPage: false,
        showMenu: true
      };
      await this.appleHeader.init(this.content, homeConfig);
      // Update page content padding after header is initialized
      this.appleHeader.updatePageContentPadding();
    } else {
      // Group/Special pages: configure header (show menu and back button for special pages)
      let pageTitle = this.config.title || 'Page';
      let showBackButton = false;
      
      // Set appropriate title and back button based on page type
      if (this.config.pageType === 'room') {
        // For room pages, use config.title (which should be the room name from hg-strategy.ts)
        // This matches how group pages work - they just use config.title directly
        pageTitle = this.config.title || localize('pages.default_room');
        showBackButton = true;
      } else if (this.config.pageType === 'scenes') {
        pageTitle = localize('pages.scenes');
        showBackButton = true;
      } else if (this.config.pageType === 'cameras') {
        pageTitle = localize('pages.cameras');
        showBackButton = true;
      }
      
      const pageConfig: HeaderConfig = {
        title: pageTitle,
        isGroupPage: isGroupPage, // Use same styling as group pages
        isSpecialPage: isSpecialPage, // Add special page flag for immediate scroll header
        showMenu: !isGroupPage, // Show menu for special pages
        showBackButton: showBackButton // Show back button for special pages
      };
      await this.appleHeader.init(this.content, pageConfig);
    }
    
    // Update page content padding after header is initialized
    this.appleHeader.updatePageContentPadding();
    
    // Always ensure chips are properly configured and connected to header
    this.ensureChipsConfiguredForHeader();
  }

  private ensureChipsConfiguredForHeader() {
    
    // Only set chips to header if this is a group page
    const isGroupPage = this.config?.pageType === 'group';
    const isSpecialPage = ['room', 'scenes', 'cameras'].includes(this.config?.pageType);
    
    // Hide chips completely for special pages (room, scenes, cameras)
    if (isSpecialPage) {
      this.appleHeader.setChipsElement(null); // Clear header chips for special pages
      // Also hide the permanent chips container
      const chipsContainer = this.content?.querySelector('.permanent-chips') as HTMLElement;
      if (chipsContainer) {
        chipsContainer.style.display = 'none';
      }
      return;
    }
    
    if (!isGroupPage) {
      this.appleHeader.setChipsElement(null); // Clear header chips for home page
      // Show chips container for non-special pages
      const chipsContainer = this.content?.querySelector('.permanent-chips') as HTMLElement;
      if (chipsContainer) {
        chipsContainer.style.display = 'block';
      }
      return;
    }
    
    // Make sure chips exist and are configured
    this.ensureChipsExist();
    
    // Pass chips to header if they're properly configured (group pages only)
    if (this.chipsElement && this.chipsElement.isConfigured() && this.chipsElement.hass) {
      this.appleHeader.setChipsElement(this.chipsElement);
    } else if (this.chipsElement) {
      this.configureChips();
      
      // Try again after configuration
      if (this.chipsElement.isConfigured() && this.chipsElement.hass) {
        this.appleHeader.setChipsElement(this.chipsElement);
      } else {
      }
    } else {
    }
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
      this.updateChips();
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
      this.setupContentMutationObserver();
    }

    // Only update chips reference if we don't have one or if it's not connected
    if (!this.chipsElement) {
      const chipsContainer = this.content.querySelector('.permanent-chips') as HTMLElement;
      if (chipsContainer) {
        this.chipsElement = new HomeChips(chipsContainer, this.customizationManager);
        this.setupChipsCallback();
      } else {
      }
    }
    
    // Only initialize header when structure is created for the first time
    // This prevents repeated header initialization calls
    if (structureCreated) {
      await this.updateHeaderForConfig();
    }
  }

  /**
   * Rebuild the entity->card index from the currently rendered DOM. Runs at most
   * once per DOM change (guarded by indexDirty), never on the steady hot path.
   */
  private rebuildEntityCardIndex(): void {
    this.entityCardIndex.clear();
    this.alwaysUpdateCards.clear();
    if (!this.content) {
      this.indexDirty = false;
      return;
    }
    const cards = this.content.querySelectorAll('home-glass-card');
    cards.forEach((el) => {
      const card = el as HomeCard;
      if (card.needsContinuousHass) {
        this.alwaysUpdateCards.add(card);
        return;
      }
      const id = card.entityId;
      if (!id) return;
      let set = this.entityCardIndex.get(id);
      if (!set) {
        set = new Set<HomeCard>();
        this.entityCardIndex.set(id, set);
      }
      set.add(card);
    });
    this.indexDirty = false;
  }

  /**
   * Cheap reference-compare diff of hass.states. HA replaces the state object on
   * every change, so identity inequality == changed. Also reports removed ids.
   * O(#entities) pointer comparisons; no JSON, no per-attribute work.
   */
  private computeChangedEntityIds(oldHass: any, newHass: any): string[] {
    const changed: string[] = [];
    const newStates = newHass?.states;
    if (!newStates) return changed;
    const oldStates = oldHass?.states;
    if (!oldStates) return Object.keys(newStates);
    for (const id in newStates) {
      if (oldStates[id] !== newStates[id]) changed.push(id);
    }
    for (const id in oldStates) {
      if (!(id in newStates)) changed.push(id);
    }
    return changed;
  }

  /**
   * The single page object that is actually rendered for this view instance,
   * selected by pageType. Only this page needs the new hass; the other four
   * page objects are never rendered here.
   */
  private getActivePage(): any {
    switch (this.config?.pageType) {
      case 'group': return this.groupPage;
      case 'room': return this.roomPage;
      case 'scenes': return this.scenesPage;
      case 'cameras': return this.camerasPage;
      default: return this.homePage;
    }
  }

  /**
   * Watch this.content for card add/remove/move (full re-render, edit-mode drag,
   * registry surgical updates) and mark the index dirty for a lazy rebuild on the
   * next push. Observes light DOM only (childList + subtree) — NOT attributes and
   * NOT across shadow boundaries, so in-place card updates and camera image swaps
   * (which live in each card's shadowRoot) never trigger a rebuild.
   */
  private setupContentMutationObserver(): void {
    if (!this.content) return;
    if (this.contentMutationObserver) {
      this.contentMutationObserver.disconnect();
    }
    this.indexDirty = true;
    this.contentMutationObserver = new MutationObserver(() => {
      this.indexDirty = true;
    });
    this.contentMutationObserver.observe(this.content, {
      childList: true,
      subtree: true,
    });
  }

  private updateExistingCards(oldHass: any, newHass: any) {
    if (!this.content || !newHass) return;

    // Rebuild the index only when the card DOM actually changed since last push.
    if (this.indexDirty) {
      this.rebuildEntityCardIndex();
    }

    // Camera (continuous) cards always get the latest hass for snapshot auth.
    this.alwaysUpdateCards.forEach((card) => {
      if (card.hass !== newHass) card.hass = newHass;
    });

    if (!oldHass) {
      // No baseline to diff against (first update / config change): refresh all
      // indexed cards once. Still O(cards) but only on this rare path.
      this.entityCardIndex.forEach((cards) => {
        cards.forEach((card) => {
          if (card.hass !== newHass) card.hass = newHass;
        });
      });
    } else {
      // Steady hot path: touch only cards whose entity changed this push.
      const changedIds = this.computeChangedEntityIds(oldHass, newHass);
      const updated = new Set<HomeCard>();
      for (const id of changedIds) {
        const cards = this.entityCardIndex.get(id);
        if (!cards) continue;
        cards.forEach((card) => {
          if (updated.has(card)) return;
          updated.add(card);
          if (card.hass !== newHass) card.hass = newHass;
        });
      }
    }

    // Active-page guard: only the rendered page object needs the new hass.
    const activePage = this.getActivePage();
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
    if (this.chipsElement) {
      this.chipsElement.setEditMode(editMode);
    }
    
    const pageType = this.config?.pageType;
    if (pageType === 'cameras') {
      this.camerasPage.updateDragAndDrop(editMode, this.content!);
    } else if (pageType === 'scenes') {
      this.scenesPage.updateDragAndDrop(editMode, this.content!);
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

  private setupChipsCallback() {
    if (this.chipsElement) {
      this.chipsElement.setOnRenderCallback(() => {
        // Re-enable drag and drop for chips after they re-render
        if (this.editModeManager.editMode) {
          setTimeout(() => {
            const chipsContainer = this.content?.querySelector('.permanent-chips') as HTMLElement;
            if (chipsContainer) {
              this.dragAndDropManager.enableDragAndDrop(chipsContainer);
            }
          }, 50);
        }
      });
    }
  }

  // All drag-and-drop functionality is now handled by DragAndDropManager

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
    const pageType = this.config?.pageType;
    return ['room', 'scenes', 'cameras', 'group'].includes(pageType) ? pageType : 'home';
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
    const scrollParent = this.getScrollParent();
    const savedScrollTop = hasExistingContent && scrollParent ? scrollParent.scrollTop : 0;

    if (hasExistingContent) {
      this.content.style.transition = 'opacity 0.15s ease-out';
      this.content.style.opacity = '0';
      await new Promise(r => setTimeout(r, 150));
    }

    try {
      this.forceChipsReset();
      this.callOnCards('pauseCamera');

      if (this.config?.pageType === 'group' && this.config?.deviceGroup) {
        // Configure and render group page
        this.groupPage.hass = this._hass;
        this.groupPage.setConfig({
          group: this.config.deviceGroup as DeviceGroup,
          customizations: this.customizationManager.getCustomizations()
        });
        
        await this.groupPage.render(
          this.content,
          this.config.deviceGroup as DeviceGroup,
          this._hass,
          (entityId: string, areaId: string) => this.toggleTallCard(entityId, areaId)
        );
      } else if (this.config?.pageType === 'room' && this.config?.areaId && this.config?.areaName) {
        // Configure and render room page
        this.roomPage.hass = this._hass;
        this.roomPage.setConfig({
          areaId: this.config.areaId,
          customizations: this.customizationManager.getCustomizations()
        });
        
        await this.roomPage.render(
          this.content,
          this.config.areaId,
          this.config.areaName,
          this._hass,
          (entityId: string, areaId: string) => this.toggleTallCard(entityId, areaId)
        );
      } else if (this.config?.pageType === 'scenes') {
        // Configure and render scenes page
        this.scenesPage.hass = this._hass;
        this.scenesPage.setConfig({
          customizations: this.customizationManager.getCustomizations()
        });
        
        await this.scenesPage.render(
          this.content,
          this._hass,
          (entityId: string, areaId: string) => this.toggleTallCard(entityId, areaId)
        );
      } else if (this.config?.pageType === 'cameras') {
        // Configure and render cameras page
        this.camerasPage.hass = this._hass;
        this.camerasPage.setConfig({
          customizations: this.customizationManager.getCustomizations()
        });
        
        await this.camerasPage.render(
          this.content,
          this._hass,
          (entityId: string, areaId: string) => this.toggleTallCard(entityId, areaId)
        );
      } else {
        // Configure and render home page (default)
        const homeTitle = this.config?.title || this._hass?.config?.location_name || localize('pages.my_home');
        this.homePage.hass = this._hass;
        this.homePage.setConfig({
          title: homeTitle,
          customizations: this.customizationManager.getCustomizations()
        });
        
        await this.homePage.render(
          this.content,
          this._hass,
          homeTitle,
          (entityId: string, areaId: string) => this.toggleTallCard(entityId, areaId)
        );
      }
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
    this.ensureChipsExist();
    
    // Pages await mid-render, so pushes that arrived meanwhile never reached the new cards.
    this.indexDirty = true;
    this.updateExistingCards(undefined, this._hass);
    this.updateChips();
    
    // CRITICAL: Connect chips to header after everything is ready
    setTimeout(() => {
      this.ensureChipsConfiguredForHeader();
    }, 100);

    // Resume cameras after page is rendered
    setTimeout(() => {
      this.callOnCards('resumeCamera');
      this._isTransitioning = false;
    }, 200);
  }

  private configureChips() {
    if (!this.chipsElement) {
      return;
    }
    
    
    // Get chips settings from dashboard config - use defaults if not configured
    const chipsSettings = ChipsConfigurationManager.getSettingsFromConfig();
    
    // Set configuration from settings
    this.chipsElement.setConfig(chipsSettings.chips_config);
    
    // Set active group if specified in config
    if (this.config?.activeGroup) {
      this.chipsElement.setActiveGroup(this.config.activeGroup);
    }
    
    // Set hass if available
    if (this._hass) {
      this.chipsElement.hass = this._hass;
    }
    
  }

  /**
   * Reset chips configuration for component reuse
   * Since chips are now permanent, we just need to reconfigure them
   */
  private forceChipsReset() {
    
    // Make sure we have the chips reference from the correct location
    if (!this.chipsElement && this.content) {
      const chipsContainer = this.content.querySelector('.permanent-chips') as HTMLElement;
      if (chipsContainer) {
        this.chipsElement = new HomeChips(chipsContainer, this.customizationManager);
        this.setupChipsCallback();
      }
    }
    
    // Clear existing chips content to force clean state
    if (this.chipsElement) {
      this.chipsElement.clearContainer();
    }
    
    // Re-configure chips to ensure they have the proper config
    if (this._hass) {
      this.configureChips();
    } else {
    }
  }

  private ensureChipsExist() {
    
    // Chips are now permanent - just make sure we have the reference
    if (!this.chipsElement && this.content) {
      const chipsContainer = this.content.querySelector('.permanent-chips') as HTMLElement;
      if (chipsContainer) {
        this.chipsElement = new HomeChips(chipsContainer, this.customizationManager);
      }
    }
    
    // Debug chips state
    if (this.chipsElement) {
      
      // CRITICAL FIX: Always ensure chips are properly configured
      // This handles cases where the element exists but lost its config
      if (!this.chipsElement.isConfigured()) {
        this.configureChips();
      }
      
      // Ensure hass is set
      if (!this.chipsElement.hass && this._hass) {
        this.chipsElement.hass = this._hass;
      }
    } else {
    }
    
    // Configure chips for current page type
    if (this.chipsElement && this.chipsElement.isConfigured()) {
      const isGroupPage = this.config?.pageType === 'group';
      const isSpecialPage = ['room', 'scenes', 'cameras'].includes(this.config?.pageType);
      
      if (isGroupPage && this.config?.deviceGroup) {
        // Group page - set active group for highlighting using deviceGroup
        this.chipsElement.setActiveGroup(this.config.deviceGroup);
      } else if (isSpecialPage) {
        // Special pages - clear active group (no highlighting)
        this.chipsElement.setActiveGroup(undefined);
      } else {
        // Home page - clear active group
        this.chipsElement.setActiveGroup(undefined);
      }
    }
  }

  private updateChips() {
    if (this.chipsElement && this._hass) {
      // Only update if hass reference is different
      if (this.chipsElement.hass !== this._hass) {
        this.chipsElement.hass = this._hass;
      }
    }
  }

  // Customization functionality is now handled by CardManager
  private async toggleTallCard(entityId: string, areaId: string, clickedElement?: HTMLElement) {
    const context = this.getPageContext();
    
    // Wait for the toggle operation to complete with the correct context
    const newTallState = await this.cardManager.toggleTallCard(entityId, areaId, context);
    
    // Now update the visual to match the new state - target the specific card that was clicked
    this.updateTallCardVisual(entityId, areaId, clickedElement, context);
    
    return newTallState;
  }

  private updateTallCardVisual(entityId: string, areaId: string, clickedElement?: HTMLElement, context?: string) {
    // Try to find the specific card wrapper based on context and entity ID
    let wrapper: HTMLElement | null = null;
    
    // Try context-specific selectors first
    if (context === 'home' && this.config?.pageType !== 'room') {
      // For home page, try to target the specific section based on areaId
      if (areaId === 'favorites') {
        wrapper = this.shadowRoot!.querySelector(`[data-area-id="favorites"] [data-entity-id="${entityId}"]`) as HTMLElement;
      } else if (areaId === 'cameras_section') {
        wrapper = this.shadowRoot!.querySelector(`[data-area-id="cameras_section"] [data-entity-id="${entityId}"]`) as HTMLElement;
      } else if (areaId === 'scenes_section') {
        wrapper = this.shadowRoot!.querySelector(`[data-area-id="scenes_section"] [data-entity-id="${entityId}"]`) as HTMLElement;
      } else {
        // For regular area sections, try to find the card within that specific area
        wrapper = this.shadowRoot!.querySelector(`[data-area-id="${areaId}"] [data-entity-id="${entityId}"]`) as HTMLElement;
      }
    } else {
      // For other contexts (room, cameras page, scenes page), target within the specific area
      wrapper = this.shadowRoot!.querySelector(`[data-area-id="${areaId}"] [data-entity-id="${entityId}"]`) as HTMLElement;
    }
    
    // Fallback to the old method if context-specific targeting fails
    if (!wrapper) {
      wrapper = this.shadowRoot!.querySelector(`[data-entity-id="${entityId}"]`) as HTMLElement;
    }
    
    if (!wrapper) return;
    
    const shouldBeTall = this.cardManager.shouldCardBeTall(entityId, areaId, context || 'home');
    
    // Update the wrapper class for grid sizing
    wrapper.classList.toggle('tall', shouldBeTall);
    
    // Update the card's design class
    const cardElement = wrapper.querySelector('home-glass-card') as any;
    if (cardElement) {
      // Update the card's configuration
      const currentConfig = cardElement.config || {};
      const newConfig = { ...currentConfig, is_tall: shouldBeTall };
      cardElement.setConfig(newConfig);
    }
    
    // Update the button visual state
    const button = wrapper.querySelector('.tall-toggle') as HTMLButtonElement;
    if (button) {
      button.classList.toggle('active', shouldBeTall);
      button.innerHTML = `<ha-icon icon="mdi:${shouldBeTall ? 'arrow-collapse' : 'arrow-expand'}"></ha-icon>`;
      button.title = shouldBeTall ? 'Switch to regular design' : 'Switch to tall design';
    }
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
      // Snapshot old customizations
      const oldHome = this.config?.customizations?.home || {};

      // Get fresh customizations
      const fresh = this.customizationManager.getCustomizations();
      this.config = { ...this.config, customizations: JSON.parse(JSON.stringify(fresh)) };
      const newHome = fresh?.home || {};

      let didChange = false;

      // --- Excluded entities ---
      const toRemove = new Set<string>();
      const toAdd = new Set<string>();
      this.diffLists(oldHome.excluded_from_dashboard, newHome.excluded_from_dashboard, toRemove, toAdd);
      if (!this.config?.pageType || this.config?.pageType === 'home') {
        this.diffLists(oldHome.excluded_from_home, newHome.excluded_from_home, toRemove, toAdd);
      }
      for (const entityId of toRemove) { this.fadeOutCard(entityId); didChange = true; }
      for (const entityId of toAdd) { this.addCardToDOM(entityId); didChange = true; }

      // --- Favorites ---
      const oldFav = new Set<string>(oldHome.favorites || []);
      const newFav = new Set<string>(newHome.favorites || []);
      const favRemoved = [...oldFav].filter(e => !newFav.has(e));
      const favAdded = [...newFav].filter(e => !oldFav.has(e));

      // Remove cards from favorites grid
      const favGrid = this.content.querySelector('.area-entities[data-area-id="favorites"]') as HTMLElement;
      for (const entityId of favRemoved) {
        const favCard = favGrid?.querySelector(`.entity-card-wrapper[data-entity-id="${entityId}"]`) as HTMLElement;
        if (favCard) {
          this.fadeOutWrapper(favCard);
          didChange = true;
        }
      }

      // Add cards to favorites grid
      for (const entityId of favAdded) {
        this.addCardToFavorites(entityId);
        didChange = true;
      }

      // --- Weather entity ---
      const weatherChanged = oldHome.weather_entity !== newHome.weather_entity;
      if (weatherChanged) {
        this._rendered = false;
        await this.renderPage('refreshCallback');
        return;
      }

      // --- Energy toggle ---
      const energyChanged = oldHome.show_energy !== newHome.show_energy;
      if (energyChanged) {
        this._rendered = false;
        await this.renderPage('refreshCallback');
        return;
      }

      // --- Switches toggle ---
      const switchesChanged = oldHome.showSwitches !== newHome.showSwitches;
      const includedSwitchesChanged = JSON.stringify(oldHome.includedSwitches || []) !== JSON.stringify(newHome.includedSwitches || []);
      if (switchesChanged || includedSwitchesChanged) {
        // Switches visibility changed - need rebuild since it affects many cards
        this._rendered = false;
        await this.renderPage('refreshCallback');
        return;
      }

      // --- Extra accessories ---
      const oldExtra = new Set<string>(oldHome.extraAccessories || []);
      const newExtra = new Set<string>(newHome.extraAccessories || []);
      const extraRemoved = [...oldExtra].filter(e => !newExtra.has(e));
      const extraAdded = [...newExtra].filter(e => !oldExtra.has(e));
      for (const entityId of extraRemoved) { this.fadeOutCard(entityId); didChange = true; }
      for (const entityId of extraAdded) { this.addCardToDOM(entityId); didChange = true; }

      // --- Section order ---
      const sectionOrderChanged = JSON.stringify(oldHome.sections?.order) !== JSON.stringify(newHome.sections?.order);
      if (sectionOrderChanged) {
        this._rendered = false;
        await this.renderPage('refreshCallback');
        return;
      }

      // --- Hidden sections ---
      const hiddenChanged = JSON.stringify(oldHome.sections?.hidden || []) !== JSON.stringify(newHome.sections?.hidden || []);
      if (hiddenChanged) {
        this._rendered = false;
        await this.renderPage('refreshCallback');
        return;
      }

      // If nothing changed at all, no need to do anything
      if (!didChange) {
        // Check for any other customization change we didn't handle
        const oldStr = JSON.stringify(oldHome);
        const newStr = JSON.stringify(newHome);
        if (oldStr !== newStr) {
          this._rendered = false;
          await this.renderPage('refreshCallback');
        }
      }

    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    }
  }

  /**
   * Diff two entity lists to find what was added/removed.
   * Items added to an exclude list = entities removed from UI.
   * Items removed from an exclude list = entities added to UI.
   */
  private diffLists(
    oldList: string[] | undefined,
    newList: string[] | undefined,
    toRemoveFromUI: Set<string>,
    toAddToUI: Set<string>
  ): void {
    const oldSet = new Set(oldList || []);
    const newSet = new Set(newList || []);
    // Newly excluded → remove from UI
    for (const e of newSet) { if (!oldSet.has(e)) toRemoveFromUI.add(e); }
    // Newly un-excluded → add to UI
    for (const e of oldSet) { if (!newSet.has(e)) toAddToUI.add(e); }
  }

  /**
   * Create a card element and add it to the correct area grid with fade-in.
   */
  private addCardToDOM(entityId: string): void {
    if (!this._hass || !this.content) return;

    const state = this._hass.states[entityId];
    if (!state) return;

    // Don't add if already in DOM
    if (this.content.querySelector(`.entity-card-wrapper[data-entity-id="${entityId}"]`)) return;

    const areaId = resolveEntityAreaId(this._hass, entityId);

    // Find the area grid
    const grid = this.content.querySelector(`.area-entities[data-area-id="${areaId}"]`) as HTMLElement;
    if (!grid) return; // Area not on this page

    this.appendCardWithFadeIn(grid, entityId, state);
  }

  private appendCardWithFadeIn(grid: HTMLElement, entityId: string, state: any): void {
    const cardElement = document.createElement('home-glass-card') as any;
    cardElement.setConfig({
      type: 'custom:home-glass-card',
      entity: entityId,
      name: state.attributes?.friendly_name || entityId.split('.')[1].replace(/_/g, ' '),
      domain: entityId.split('.')[0],
      is_tall: false
    });
    cardElement.hass = this._hass;

    const wrapper = document.createElement('div');
    wrapper.className = 'entity-card-wrapper';
    wrapper.dataset.entityId = entityId;
    wrapper.appendChild(cardElement);

    wrapper.style.opacity = '0';
    wrapper.style.transform = 'scale(0.8)';
    grid.appendChild(wrapper);

    requestAnimationFrame(() => {
      wrapper.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      wrapper.style.opacity = '1';
      wrapper.style.transform = 'scale(1)';
    });
  }

  /**
   * Add a card to the favorites section, creating the section if needed.
   */
  private addCardToFavorites(entityId: string): void {
    if (!this._hass || !this.content) return;

    const state = this._hass.states[entityId];
    if (!state) return;

    // Find or create the favorites grid
    let favGrid = this.content.querySelector('.area-entities[data-area-id="favorites"]') as HTMLElement;
    if (!favGrid) {
      // Create the favorites section
      const titleDiv = document.createElement('div');
      titleDiv.className = 'hg-section-title';
      titleDiv.innerHTML = `<span>${localize('section_titles.favorites')}</span>`;

      favGrid = document.createElement('div');
      favGrid.className = 'area-entities';
      favGrid.dataset.areaId = 'favorites';

      // Insert at top of content (after header and chips)
      const firstSection = this.content.querySelector('.hg-section-title, .area-title');
      if (firstSection) {
        this.content.insertBefore(favGrid, firstSection);
        this.content.insertBefore(titleDiv, favGrid);
      } else {
        this.content.appendChild(titleDiv);
        this.content.appendChild(favGrid);
      }
    }

    // Don't add if already in favorites grid
    if (favGrid.querySelector(`.entity-card-wrapper[data-entity-id="${entityId}"]`)) return;

    this.appendCardWithFadeIn(favGrid, entityId, state);
  }

  private getScrollParent(): Element | null {
    let el: Element | null = this;
    while (el) {
      // Check host element if inside shadow DOM
      if (el instanceof ShadowRoot) {
        el = (el as ShadowRoot).host;
        continue;
      }
      if (el instanceof HTMLElement) {
        const style = window.getComputedStyle(el);
        if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) {
          return el;
        }
      }
      el = el.parentElement || (el.getRootNode() as ShadowRoot)?.host || null;
    }
    return document.scrollingElement || document.documentElement;
  }
}
