import { CustomizationManager } from './CustomizationManager';
import { DashboardStateManager } from './DashboardStateManager';
import { localize } from './LocalizationService';
import { dockToRestore } from './sidebarDock';

export interface HomeAssistantUIState {
  headerVisible: boolean;
  sidebarVisible: boolean;
}

const HEADER_RETRY_DELAYS_MS = [100, 300, 700, 1500];

export class HomeAssistantUIManager {
  private static instance: HomeAssistantUIManager | null = null;
  private state: HomeAssistantUIState;
  private initialized = false;
  private customizationManager: CustomizationManager | null = null;
  private listenerSetup = false;
  private lastSidebarState: boolean | null = null;
  // The user's own `hass.dockedSidebar` ('docked' | 'auto' | 'always_hidden'), captured
  // when we hide the sidebar so leaving the dashboard puts back exactly that.
  private originalDock: string | null = null;
  private restoreTimeout: number | null = null;

  private constructor() {
    // Initialize with default visible state - will be overridden by dashboard settings
    this.state = {
      headerVisible: true,
      sidebarVisible: true
    };
  }

  public static getInstance(): HomeAssistantUIManager {
    if (!HomeAssistantUIManager.instance) {
      HomeAssistantUIManager.instance = new HomeAssistantUIManager();
      // Initialize only once
      HomeAssistantUIManager.instance.initialize();
    }
    return HomeAssistantUIManager.instance;
  }

  public static initializeWithCustomizations(customizationManager: CustomizationManager): HomeAssistantUIManager {
    const instance = HomeAssistantUIManager.getInstance();
    instance.setCustomizationManager(customizationManager);
    return instance;
  }

  private setCustomizationManager(customizationManager: CustomizationManager): void {
    this.customizationManager = customizationManager;
    
    if (!this.listenerSetup) {
      this.setupDashboardStateListener();
      this.listenerSetup = true;
    }
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await this.waitForHomeAssistant();
    this.applyUIState();
    this.initialized = true;
  }

  private async waitForHomeAssistant(): Promise<void> {
    await customElements.whenDefined("home-assistant");
    await customElements.whenDefined("home-assistant-main");
  }

  // Utility: breadth-first search through nested shadow-DOM
  private deepQuery(root: any, sel: string): HTMLElement | null {
    const stack = [root];
    while (stack.length) {
      const n = stack.pop();
      if (!n) continue;
      const found = n.querySelector?.(sel);
      if (found) return found;
      n.children && stack.push(...n.children);
      n.shadowRoot && stack.push(n.shadowRoot);
    }
    return null;
  }


  /** Returns false when hui-root or its header is not rendered yet (nothing was applied). */
  private collapseHeader(hide: boolean = true): boolean {
    const haRoot = document.querySelector("home-assistant");
    const huiRoot = this.deepQuery(haRoot, "hui-root");
    const headerEl = huiRoot?.shadowRoot?.querySelector(".header") as HTMLElement | null;

    if (!huiRoot || !headerEl) {
      return false;
    }

    try {
      const viewElement = huiRoot.shadowRoot?.querySelector("#view") as HTMLElement | null;
      if (hide) {
        headerEl.style.display = "none";
        huiRoot.style.setProperty("--mdc-top-app-bar-height", "0px");
        huiRoot.style.setProperty("--header-height", "0px");
        viewElement?.style.setProperty("padding-top", "0px");
      } else {
        headerEl.style.display = "";
        huiRoot.style.removeProperty("--mdc-top-app-bar-height");
        huiRoot.style.removeProperty("--header-height");
        viewElement?.style.removeProperty("padding-top");
      }

      huiRoot.dispatchEvent(
        new Event("iron-resize", { bubbles: true, composed: true })
      );
    } catch (error) {
      console.warn('Error in collapseHeader:', error);
    }
    return true;
  }

  private fire(target: Element, type: string, detail: Record<string, unknown>): void {
    target.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private collapseSidebar(hide: boolean = true): void {
    if (this.lastSidebarState === hide) {
      return;
    }
    // Showing only undoes a hide of ours; otherwise it would overwrite the user's dock preference.
    if (!hide && this.originalDock === null) {
      return;
    }
    
    this.lastSidebarState = hide;
    
    try {
      const ha = document.querySelector("home-assistant") as any;
      const main = ha?.shadowRoot?.querySelector("home-assistant-main");
      
      if (!main) {
        console.warn('Home Assistant main element not found for sidebar control');
        this.lastSidebarState = null;
        return;
      }

      if (hide) {
        this.originalDock ??= dockToRestore(ha.hass?.dockedSidebar);
        this.fire(main, "hass-dock-sidebar", { dock: "always_hidden" });
      } else {
        const dock = this.originalDock!;
        this.originalDock = null;
        this.dockAfterDrawerClosed(main, dock);
      }
      
    } catch (error) {
      console.warn('Error in collapseSidebar:', error);
      this.lastSidebarState = null;
    }
  }

  private async dockAfterDrawerClosed(main: Element, targetDock: string = "docked"): Promise<void> {
    const drawer = main.shadowRoot?.querySelector("ha-drawer");

    // Check if drawer is already non-blocking
    const isOpen = (drawer as any)?.mdcFoundation?.isOpen?.() || (drawer as any)?.open === true;
    
    if (!isOpen) {
      // Already non-blocking, dock immediately
      this.fire(main, "hass-dock-sidebar", { dock: targetDock });
      return;
    }

    // Build a promise that resolves when the drawer is guaranteed non-blocking
    const waitForNonBlocking = () =>
      new Promise<void>((resolve) => {
        let done = false;
        const finish = () => { 
          if (done) return; 
          done = true; 
          cleanup(); 
          resolve(); 
        };

        const cleanups: (() => void)[] = [];

        // 1) Drawer closed event
        if (drawer) {
          const onClosed = () => finish();
          drawer.addEventListener("MDCDrawer:closed", onClosed, { once: true });
          cleanups.push(() => drawer.removeEventListener("MDCDrawer:closed", onClosed));
        }

        // 2) Body overflow released by ha-drawer adapter
        const bodyObs = new MutationObserver(() => {
          const inline = document.body.style.overflow;
          const computed = getComputedStyle(document.body).overflow;
          if (inline !== "hidden" && computed !== "hidden") finish();
        });
        bodyObs.observe(document.body, { attributes: true, attributeFilter: ["style"] });
        cleanups.push(() => bodyObs.disconnect());

        // 3) Modal attribute removed from main
        const mainObs = new MutationObserver(() => {
          if (!main.hasAttribute("modal")) finish();
        });
        mainObs.observe(main, { attributes: true, attributeFilter: ["modal"] });
        cleanups.push(() => mainObs.disconnect());

        function cleanup() { 
          cleanups.forEach((fn) => fn()); 
        }
      });

    // Step A: ensure the drawer is closing
    this.fire(main, "hass-toggle-menu", { open: false });

    // Step B: wait until the overlay is truly gone
    await waitForNonBlocking();

    // Extra safety check as suggested
    if (document.body.style.overflow === "hidden") {
      this.fire(main, "hass-toggle-menu", { open: false });
    }

    // Step C: now it is safe to change the docking mode
    this.fire(main, "hass-dock-sidebar", { dock: targetDock });
  }

  private applyUIState(): void {
    this.collapseHeader(!this.state.headerVisible);
    this.collapseSidebar(!this.state.sidebarVisible);
  }

  public async toggleHeader(): Promise<boolean> {
    this.state.headerVisible = !this.state.headerVisible;
    
    // Save to customizations if we have a customization manager
    if (this.customizationManager) {
      await this.customizationManager.setHeaderVisibility(!this.state.headerVisible);
    }
    
    this.collapseHeader(!this.state.headerVisible);
    
    return this.state.headerVisible;
  }

  public async toggleSidebar(): Promise<boolean> {
    this.state.sidebarVisible = !this.state.sidebarVisible;
    
    // Save to customizations if we have a customization manager
    if (this.customizationManager) {
      await this.customizationManager.setSidebarVisibility(!this.state.sidebarVisible);
    }
    
    // Reset the last state tracker since this is a manual toggle
    this.lastSidebarState = null;
    
    // Re-find elements in case DOM changed
    this.collapseSidebar(!this.state.sidebarVisible);
    
    return this.state.sidebarVisible;
  }

  public isHeaderVisible(): boolean {
    return this.state.headerVisible;
  }

  public isSidebarVisible(): boolean {
    return this.state.sidebarVisible;
  }

  public getHeaderToggleText(): string {
    return this.state.headerVisible ? localize('toggles.hide_header') : localize('toggles.show_header');
  }

  public getSidebarToggleText(): string {
    return this.state.sidebarVisible ? localize('toggles.hide_sidebar') : localize('toggles.show_sidebar');
  }

  private setupDashboardStateListener(): void {
    const dashboardState = DashboardStateManager.getInstance();

    if (dashboardState.isDashboardActive()) {
      this.applyDashboardUISettings();
    }

    dashboardState.addListener((isActive: boolean) => {
      if (isActive) {
        if (this.restoreTimeout !== null) {
          clearTimeout(this.restoreTimeout);
          this.restoreTimeout = null;
        }
        requestAnimationFrame(() => this.reapplyDashboardSettings());
      } else {
        // Delay so quick hops between Home Glass dashboards do not flash the HA chrome
        this.restoreTimeout = window.setTimeout(() => {
          this.restoreHomeAssistantUI();
          this.restoreTimeout = null;
        }, 300);
      }
    });
  }

  /** Returns false when the header had to be hidden but hui-root is not ready yet. */
  private applyDashboardUISettings(): boolean {
    if (!this.customizationManager || !DashboardStateManager.getInstance().isDashboardActive()) {
      return true;
    }

    this.state.headerVisible = !this.customizationManager.isHeaderHidden();
    this.state.sidebarVisible = !this.customizationManager.isSidebarHidden();

    const headerApplied = this.collapseHeader(!this.state.headerVisible);
    this.collapseSidebar(!this.state.sidebarVisible);
    return headerApplied || this.state.headerVisible;
  }

  /**
   * Apply dashboard UI settings, retrying while hui-root has not rendered its header
   * (a fresh hui-root after navigating back from another panel).
   */
  public reapplyDashboardSettings(attempt = 0): void {
    if (this.applyDashboardUISettings() || attempt >= HEADER_RETRY_DELAYS_MS.length) return;
    setTimeout(() => this.reapplyDashboardSettings(attempt + 1), HEADER_RETRY_DELAYS_MS[attempt]);
  }

  private restoreHomeAssistantUI(): void {
    if (!this.state.headerVisible) {
      this.state.headerVisible = true;
      this.collapseHeader(false);
    }

    if (!this.state.sidebarVisible) {
      this.lastSidebarState = null;
      this.state.sidebarVisible = true;
      this.collapseSidebar(false);
    }
  }
}
