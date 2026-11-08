import { CustomizationManager } from './CustomizationManager';
import { DashboardConfig } from '../config/DashboardConfig';
import { DashboardStateManager } from './DashboardStateManager';
import { dimFor, gradientLuminance, wallpaperLuminance, wallpaperTone } from './wallpaperLuminance';
import { DYNAMIC_PRESET, DYNAMIC_REFRESH_MS, Phase, currentPhase, phaseBackground, phaseSky } from './dynamicBackground';

const STYLE_ID = 'hg-body-background';

// HA 2026.11+ paints the theme background on partial-panel-resolver::before and
// hui-view-background (z-index -1, isolated), which covers body::after.
const PANEL_BACKGROUND_RESET = `
      :root {
        --ha-panel-background: transparent !important;
        --lovelace-background: transparent !important;
      }`;

const bodyLayer = (selector: string, background: string, extra = ''): string => `
      ${selector} {
        content: "";
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        width: 100vw;
        z-index: -1;
        background: ${background} center center;
        background-size: cover;
        background-repeat: no-repeat;${extra}
      }`;

// ::before holds the previous phase; ::after fades the new one in on top of it.
// The transition is declared only in the revealed state so the reset to opacity 0 is instant.
// Reduced motion shrinks --hg-dur-slow to 1ms, which collapses the fade.
const dynamicCss = (from: Phase, to: Phase, revealed: boolean): string =>
  PANEL_BACKGROUND_RESET +
  bodyLayer('body::before', phaseBackground(from)) +
  bodyLayer(
    'body::after',
    phaseBackground(to),
    revealed
      ? `
        opacity: 1;
        transition: opacity calc(var(--hg-dur-slow) * 5) var(--hg-ease-standard);`
      : `
        opacity: 0;`
  );

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
  private static hass?: any;
  private static dynamicPhase?: Phase;
  private static dynamicTimer?: number;

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

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') BackgroundManager.refreshDynamic();
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
    document.querySelector(`#${STYLE_ID}`)?.remove();
    BackgroundManager.probeToken++;
    window.clearInterval(BackgroundManager.dynamicTimer);
    BackgroundManager.dynamicPhase = undefined;
    BackgroundManager.clearWallpaperTone();
  }

  private static clearWallpaperTone(): void {
    const root = document.documentElement;
    root.removeAttribute('data-hg-wallpaper');
    root.style.removeProperty('--hg-glass-dim');
    root.style.removeProperty('--hg-title-shadow');
    root.style.removeProperty('--hg-title-color');
  }

  // Inline custom properties would beat the solid-surface overrides, so they are skipped there.
  private static applyWallpaperTone(luminance: number): void {
    const root = document.documentElement;
    const tone = wallpaperTone(luminance);
    root.setAttribute('data-hg-wallpaper', tone);
    root.style.setProperty('--hg-title-color', tone === 'light' ? 'rgba(0, 0, 0, 0.88)' : '#fff');
    root.style.setProperty('--hg-title-shadow', 'none');
    if (root.dataset.hgSolid === 'true' || window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches) return;
    root.style.setProperty('--hg-glass-dim', dimFor(luminance));
  }

  // The sky gradients are known, so the tone comes from them directly instead of a probe.
  private static applyPhaseTone(phase: Phase): void {
    BackgroundManager.probeToken++;
    BackgroundManager.applyWallpaperTone(gradientLuminance(phaseSky(phase)) ?? 0.5);
  }

  static getCurrentPhase(): Phase {
    const hass = BackgroundManager.hass ?? (document.querySelector('home-assistant') as any)?.hass;
    return currentPhase(hass, new Date());
  }

  /** Feed every hass update; sun.sun changes move the dynamic wallpaper to its new phase. */
  static updateHass(hass: any): void {
    BackgroundManager.hass = hass;
    BackgroundManager.refreshDynamic();
  }

  updateHass(hass: any): void {
    BackgroundManager.updateHass(hass);
  }

  private static refreshDynamic(): void {
    const from = BackgroundManager.dynamicPhase;
    const style = document.querySelector(`#${STYLE_ID}`);
    if (from === undefined || !style) return;

    const to = BackgroundManager.getCurrentPhase();
    if (to === from) return;

    BackgroundManager.dynamicPhase = to;
    style.textContent = dynamicCss(from, to, false);
    // Commit the hidden state first, otherwise the opacity change has nothing to transition from.
    void getComputedStyle(document.body, '::after').opacity;
    style.textContent = dynamicCss(from, to, true);
    BackgroundManager.applyPhaseTone(to);
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
    
    const dynamic = config.type === 'preset' && config.backgroundImage === DYNAMIC_PRESET;

    BackgroundManager.removeStyle();

    const phase = BackgroundManager.getCurrentPhase();
    const styleElement = document.createElement('style');
    styleElement.id = STYLE_ID;
    styleElement.textContent = dynamic
      ? dynamicCss(phase, phase, true)
      : PANEL_BACKGROUND_RESET + bodyLayer('body::after', backgroundStyle);

    document.head.appendChild(styleElement);

    if (!dynamic) {
      void this.probeWallpaper(backgroundStyle);
      return;
    }
    BackgroundManager.dynamicPhase = phase;
    BackgroundManager.applyPhaseTone(phase);
    BackgroundManager.dynamicTimer = window.setInterval(() => BackgroundManager.refreshDynamic(), DYNAMIC_REFRESH_MS);
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
    if (name === DYNAMIC_PRESET) return phaseBackground(BackgroundManager.getCurrentPhase());
    return BackgroundManager.PRESET_BACKGROUNDS[name as keyof typeof BackgroundManager.PRESET_BACKGROUNDS] || BackgroundManager.getDefaultBackground();
  }

  /**
   * Get all available preset background names
   */
  static getPresetNames(): string[] {
    return [...Object.keys(BackgroundManager.PRESET_BACKGROUNDS), DYNAMIC_PRESET];
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
