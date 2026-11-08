/**
 * Apple Home Dashboard Strategy - Stateless Implementation
 * Apple Home-like automatic dashboard for Home Assistant
 *
 * Version: 2.2.0 - Energy Dashboard
 * Author: Apple Home Dashboard Team
 *
 * This follows the proven mushroom-strategy pattern of stateless configuration generation.
 * No component instances, no singletons, no shared state - just pure configuration.
 */

import { DashboardConfig, DeviceGroup } from './config/DashboardConfig';
import { HomeCard } from './components/HomeCard';
import { HomeView } from './components/HomeView';
import { CustomizationManager } from './utils/CustomizationManager';
import { setupLocalize, localize } from './utils/LocalizationService';
import { BackgroundManager } from './utils/BackgroundManager';
import { HomeAssistantUIManager } from './utils/HomeAssistantUIManager';
import { RTLHelper } from './utils/RTLHelper';
import { injectLiquidGlassStyles } from './utils/LiquidGlassStyles';
import { syncColorScheme } from './styles/tokens';

// Inject liquid glass styles early at module load time
injectLiquidGlassStyles();

// Extend window interface for TypeScript
declare global {
  interface Window {
    customStrategies?: any[];
  }
}

import { DashboardStateManager } from './utils/DashboardStateManager';

/**
 * Extract the dashboard key from the current URL
 * /apple-home/home -> "apple-home"
 */
function getCurrentDashboardKey(): string {
  const path = window.location.pathname;
  const match = path.match(/^\/([^\/]+)/);
  return match ? match[1] : 'lovelace';
}

/**
 * Main strategy function - generates dashboard configuration
 * This is called by Home Assistant's strategy system
 */
async function generateLovelaceDashboard(info: { hass: any; narrow?: boolean }, options?: { title?: string }) {
  const { hass } = info;

  // Initialize localization FIRST before any localize() calls
  setupLocalize(hass);
  syncColorScheme(hass);

  // Initialize RTL support
  RTLHelper.initialize(hass);

  // CRITICAL: Register this dashboard with the DashboardStateManager
  // This is how we know which dashboards are Apple Home Dashboards
  const dashboardKey = getCurrentDashboardKey();
  const dashboardStateManager = DashboardStateManager.getInstance();
  dashboardStateManager.registerDashboard(dashboardKey);

  // Set this dashboard as active since we're generating it
  dashboardStateManager.setDashboardActive(dashboardKey);

  // Load user customizations using CustomizationManager singleton
  const customizationManager = CustomizationManager.getInstance(hass);
  const customizations = await customizationManager.loadCustomizations();

  // Set the loaded customizations in the manager
  await customizationManager.setCustomizations(customizations);

  // Initialize background manager with loaded customizations
  const backgroundManager = new BackgroundManager(customizationManager);

  // Initialize background for dashboard (this will also set dashboard as active)
  backgroundManager.initializeBackground();

  // Initialize UI manager with customizations for header/sidebar control
  const uiManager = HomeAssistantUIManager.initializeWithCustomizations(customizationManager);

  // Apply UI settings once with a small delay to ensure DOM is ready
  setTimeout(() => {
    uiManager.reapplyDashboardSettings();
  }, 100);

  const makeView = (
    title: string,
    path: string,
    icon: string,
    card: Record<string, unknown>,
    subview = true
  ) => ({
    title,
    path,
    icon,
    panel: true,
    ...(subview ? { subview: true } : {}),
    cards: [{ type: 'custom:home-glass-view', title, ...card, customizations }],
  });

  const homeTitle = options?.title || hass?.config?.location_name || localize('pages.my_home');
  const views = [makeView(homeTitle, 'home', 'mdi:home', { pageType: 'home' }, false)];

  // OTHER has no page of its own
  const deviceGroups = (Object.keys(DashboardConfig.GROUP_STYLES) as DeviceGroup[]).filter(
    (group) => group !== DeviceGroup.OTHER
  );
  for (const group of deviceGroups) {
    const groupStyle = DashboardConfig.getGroupStyle(group);
    const groupName = typeof groupStyle.name === 'function' ? groupStyle.name() : groupStyle.name;
    views.push(makeView(groupName, group, groupStyle.icon, { pageType: 'group', deviceGroup: group }));
  }

  views.push(makeView(localize('pages.scenes'), 'scenes', 'mdi:palette', { pageType: 'scenes' }));
  views.push(makeView(localize('pages.cameras'), 'cameras', 'mdi:cctv', { pageType: 'cameras' }));

  try {
    const areas = await hass.callWS({ type: 'config/area_registry/list' });
    for (const area of areas) {
      views.push(
        makeView(area.name, `room-${area.area_id}`, 'mdi:home-outline', {
          pageType: 'room',
          areaId: area.area_id,
          areaName: area.name,
        })
      );
    }
  } catch (error) {
    console.error('Error fetching areas for room views:', error);
  }

  return { views };
}

/**
 * Strategy Class - Required by Home Assistant for proper strategy registration
 * This follows the Home Assistant strategy pattern exactly like mushroom-strategy
 */
class HomeGlassStrategy extends HTMLElement {
  /**
   * Generate a dashboard configuration
   * Called by Home Assistant when creating a dashboard with this strategy
   */
  static async generateDashboard(info: { hass: any; config: any }): Promise<{ views: any[] }> {
    // Extract options from config if available
    const options = info.config?.strategy?.options || {};

    // Use our stateless function
    return generateLovelaceDashboard({ hass: info.hass }, options);
  }
}

// Register custom elements (components still work exactly the same)
if (!customElements.get('home-glass-card')) {
  customElements.define('home-glass-card', HomeCard);
}
if (!customElements.get('home-glass-view')) {
  customElements.define('home-glass-view', HomeView);
}

// HA resolves dashboard strategies as `ll-strategy-dashboard-<type>` (legacy: `ll-strategy-<type>`).
// `hg-strategy` stays registered so dashboards created with the original project keep working.
for (const type of ['home-glass-strategy', 'apple-home-strategy']) {
  for (const tag of [`ll-strategy-dashboard-${type}`, `ll-strategy-${type}`]) {
    if (!customElements.get(tag)) {
      customElements.define(tag, class extends HomeGlassStrategy {});
    }
  }
}

window.customStrategies = window.customStrategies || [];
window.customStrategies.push({
  type: 'home-glass-strategy',
  strategyType: 'dashboard',
  name: 'Home Glass',
  description: 'iOS-style dashboard auto-generated from your Home Assistant areas and devices.',
  documentationURL: 'https://github.com/gilsonsouzah/hass-home-glass-dashboard',
});
