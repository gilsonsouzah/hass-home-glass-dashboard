import { CustomizationManager } from './CustomizationManager';
import { DashboardConfig } from '../config/DashboardConfig';
import { DashboardStateManager } from './DashboardStateManager';
import { dimFor, wallpaperLuminance, wallpaperTone } from './wallpaperLuminance';

export interface BackgroundConfig {
  type: 'preset' | 'custom';
  backgroundImage?: string; // data URL (e.g., "url(data:image/jpeg;base64,...)") or preset gradient name
}

export class BackgroundManager {
  private customizationManager: CustomizationManager;
  private currentBackground: BackgroundConfig;
  // Most recently created/used instance; the shared listeners below act on it.
  private static current: BackgroundManager | null = null;
  private static listenersRegistered = false;
  private static probeToken = 0;
  private static probeCache?: { css: string; luminance: number };

  // Predefined gradient backgrounds
  static readonly PRESET_BACKGROUNDS = {
    'default': DashboardConfig.getDefaultBackground(),
    'sunset': `linear-gradient(135deg, 
      rgba(255, 149, 113, 0.8) 0%, 
      rgba(255, 112, 166, 0.8) 20%, 
      rgba(255, 95, 192, 0.8) 40%, 
      rgba(198, 113, 255, 0.8) 60%, 
      rgba(142, 140, 255, 0.8) 80%, 
      rgba(115, 152, 255, 0.8) 100%
    )`,
    'ocean': `linear-gradient(135deg,
      rgba(29, 151, 255, 0.8) 0%,
      rgba(0, 199, 255, 0.8) 25%,
      rgba(0, 229, 195, 0.8) 50%,
      rgba(73, 255, 144, 0.8) 75%,
      rgba(146, 254, 157, 0.8) 100%
    )`,
    'forest': `linear-gradient(135deg,
      rgba(46, 160, 67, 0.8) 0%,
      rgba(81, 198, 103, 0.8) 25%,
      rgba(116, 235, 139, 0.8) 50%,
      rgba(151, 255, 175, 0.8) 75%,
      rgba(186, 255, 201, 0.8) 100%
    )`,
    'purple': `linear-gradient(135deg,
      rgba(88, 86, 214, 0.8) 0%,
      rgba(139, 69, 255, 0.8) 25%,
      rgba(185, 103, 255, 0.8) 50%,
      rgba(231, 137, 255, 0.8) 75%,
      rgba(255, 171, 255, 0.8) 100%
    )`,
    'fire': `linear-gradient(135deg,
      rgba(255, 94, 77, 0.8) 0%,
      rgba(255, 154, 0, 0.8) 25%,
      rgba(255, 206, 84, 0.8) 50%,
      rgba(255, 238, 173, 0.8) 75%,
      rgba(255, 255, 255, 0.8) 100%
    )`
  };

  // Default background is the first preset
  static readonly DEFAULT_BACKGROUND = 'default';
  
  constructor(customizationManager: CustomizationManager) {
    this.customizationManager = customizationManager;
    this.currentBackground = this.getBackgroundConfig();
    BackgroundManager.current = this;
    BackgroundManager.registerListeners();
  }

  // Registered once for the page lifetime: instances are created on every strategy
  // run and settings modal open, so per-instance listeners would pile up.
  private static registerListeners(): void {
    if (BackgroundManager.listenersRegistered) return;
    BackgroundManager.listenersRegistered = true;

    DashboardStateManager.getInstance().addListener((isActive) => {
      const manager = BackgroundManager.current;
      if (!manager) return;
      if (isActive) {
        manager.applyBackgroundToBody(manager.currentBackground);
      } else {
        BackgroundManager.removeStyle();
      }
    });

    document.addEventListener('hg-dashboard-refresh', () => {
      const manager = BackgroundManager.current;
      if (!manager) return;
      const config = manager.getBackgroundConfig();
      if (JSON.stringify(config) === JSON.stringify(manager.currentBackground)) return;
      manager.currentBackground = config;
      manager.applyBackgroundToBody(config);
    });
  }

  private static removeStyle(): void {
    document.querySelector('#hg-body-background')?.remove();
    BackgroundManager.probeToken++;
    BackgroundManager.clearWallpaperTone();
  }

  private static clearWallpaperTone(): void {
    const root = document.documentElement;
    root.removeAttribute('data-hg-wallpaper');
    root.style.removeProperty('--hg-glass-dim');
    root.style.removeProperty('--hg-title-shadow');
  }

  // Inline custom properties would beat the solid-surface overrides, so they are skipped there.
  private static applyWallpaperTone(luminance: number): void {
    const root = document.documentElement;
    const tone = wallpaperTone(luminance);
    root.setAttribute('data-hg-wallpaper', tone);
    if (root.dataset.hgSolid === 'true' || window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches) return;
    root.style.setProperty('--hg-glass-dim', dimFor(luminance));
    root.style.setProperty('--hg-title-shadow', tone === 'light' ? '0 1px 3px rgba(0, 0, 0, 0.45)' : 'none');
  }

  private async probeWallpaper(backgroundStyle: string): Promise<void> {
    const token = ++BackgroundManager.probeToken;
    const cached = BackgroundManager.probeCache;
    const luminance = cached?.css === backgroundStyle ? cached.luminance : await wallpaperLuminance(backgroundStyle);
    if (token !== BackgroundManager.probeToken || luminance === undefined) return;
    BackgroundManager.probeCache = { css: backgroundStyle, luminance };
    BackgroundManager.applyWallpaperTone(luminance);
  }

  private getBackgroundConfig(): BackgroundConfig {
    const backgroundData = this.customizationManager.getCustomizations().background;

    if (backgroundData) {
      return {
        type: backgroundData.type || 'preset',
        backgroundImage: backgroundData.value || backgroundData.backgroundImage || BackgroundManager.DEFAULT_BACKGROUND
      };
    }

    return { type: 'preset', backgroundImage: BackgroundManager.DEFAULT_BACKGROUND };
  }

  /**
   * Apply background visually without saving to storage.
   * Use this when the background config has already been saved elsewhere.
   */
  applyBackgroundOnly(config: BackgroundConfig): void {
    BackgroundManager.current = this;
    this.currentBackground = config;
    this.applyBackgroundToBody(config);
  }

  /**
   * Apply background to document body using CSS style element
   * Uses body::after pseudo-element for iOS Safari compatibility.
   * iOS Safari doesn't support background-attachment: fixed properly - it uses
   * the full document height instead of viewport height for background-size: cover,
   * causing the background to stretch based on content length.
   * The fix is to use a fixed-positioned ::after pseudo-element with 100vh height.
   */
  private applyBackgroundToBody(config: BackgroundConfig): void {
    // Only apply background if Dashboard is active per DashboardStateManager
    if (!DashboardStateManager.getInstance().isDashboardActive()) {
      return;
    }
    
    let backgroundStyle = '';
    
    if (config.type === 'custom' && config.backgroundImage) {
      backgroundStyle = config.backgroundImage;
    } else if (config.type === 'preset' && config.backgroundImage) {
      backgroundStyle = BackgroundManager.getPresetBackground(config.backgroundImage);
    } else {
      backgroundStyle = BackgroundManager.getDefaultBackground();
    }
    
    BackgroundManager.removeStyle();
    
    // Create new style element for body background
    // Uses body::after pseudo-element for iOS Safari compatibility
    const styleElement = document.createElement('style');
    styleElement.id = 'hg-body-background';
    
    // HA 2026.11+ paints the theme background on partial-panel-resolver::before and
    // hui-view-background (z-index -1, isolated), which covers body::after.
    styleElement.textContent = `
      :root {
        --ha-panel-background: transparent !important;
        --lovelace-background: transparent !important;
      }
      body::after {
        content: "";
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        width: 100vw;
        z-index: -1;
        background: ${backgroundStyle} center center;
        background-size: cover;
        background-repeat: no-repeat;
      }
    `;
    
    document.head.appendChild(styleElement);
    void this.probeWallpaper(backgroundStyle);
  }

  /**
   * Initialize background on app start
   */
  initializeBackground(): void {
    // Set dashboard as active and apply background
    this.customizationManager.setDashboardActive(true);
    
    const config = this.getCurrentBackground();
    this.applyBackgroundToBody(config);
  }

  /**
   * Get current background config
   */
  getCurrentBackground(): BackgroundConfig {
    return { ...this.currentBackground };
  }

  /**
   * Get the default background for preview
   */
  static getDefaultBackground(): string {
    return BackgroundManager.PRESET_BACKGROUNDS[BackgroundManager.DEFAULT_BACKGROUND];
  }

  /**
   * Get a preset background by name
   */
  static getPresetBackground(name: string): string {
    return BackgroundManager.PRESET_BACKGROUNDS[name as keyof typeof BackgroundManager.PRESET_BACKGROUNDS] || BackgroundManager.getDefaultBackground();
  }

  /**
   * Get all available preset background names
   */
  static getPresetNames(): string[] {
    return Object.keys(BackgroundManager.PRESET_BACKGROUNDS);
  }

  /**
   * Convert image file to data URL
   */
  static async imageToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(`url(${result})`);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
