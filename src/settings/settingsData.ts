export interface HomeSettingsData {
  favoriteAccessories: string[];
  excludedFromDashboard: string[];
  excludedFromHome: string[];
  includedSwitches: string[];
  extraAccessories: string[];
  weatherEntity?: string;
  backgroundType: 'preset' | 'custom';
  customBackground?: string;
  presetBackground?: string;
  hideHeader?: boolean;
  hideSidebar?: boolean;
  showSwitches?: boolean;
  showEnergy?: boolean;
  showCost?: boolean;
  showGas?: boolean;
}

export function defaultSettings(defaultPreset: string): HomeSettingsData {
  return {
    favoriteAccessories: [],
    excludedFromDashboard: [],
    excludedFromHome: [],
    includedSwitches: [],
    extraAccessories: [],
    weatherEntity: undefined,
    backgroundType: 'preset',
    presetBackground: defaultPreset,
    showSwitches: false,
    showEnergy: false,
    showCost: true,
    showGas: true,
  };
}

export function cloneSettings(settings: HomeSettingsData): HomeSettingsData {
  return {
    ...settings,
    favoriteAccessories: [...settings.favoriteAccessories],
    excludedFromDashboard: [...settings.excludedFromDashboard],
    excludedFromHome: [...settings.excludedFromHome],
    includedSwitches: [...settings.includedSwitches],
    extraAccessories: [...settings.extraAccessories],
  };
}

/** Same fallbacks as BackgroundManager.getBackgroundConfig, read straight from the stored customizations. */
export function settingsFromCustomizations(customizations: any, defaultPreset: string): HomeSettingsData {
  const background = customizations.background;
  const type: 'preset' | 'custom' = background ? background.type || 'preset' : 'preset';
  const image: string | undefined = background
    ? background.value || background.backgroundImage || defaultPreset
    : defaultPreset;

  return {
    favoriteAccessories: customizations.home?.favorites || [],
    excludedFromDashboard: customizations.home?.excluded_from_dashboard || [],
    excludedFromHome: customizations.home?.excluded_from_home || [],
    includedSwitches: customizations.home?.included_switches || [],
    extraAccessories: customizations.home?.extra_accessories || [],
    weatherEntity: customizations.home?.weather_entity || undefined,
    backgroundType: type,
    customBackground: type === 'custom' ? image : undefined,
    presetBackground: type === 'preset' ? image : defaultPreset,
    hideHeader: customizations.ui?.hide_header || false,
    hideSidebar: customizations.ui?.hide_sidebar || false,
    showSwitches: customizations.home?.show_switches || false,
    showEnergy: customizations.home?.show_energy || false,
    showCost: customizations.home?.show_cost !== false,
    showGas: customizations.home?.show_gas !== false,
  };
}

/** True when a change affects which entities are rendered, as opposed to wallpaper/UI-only changes. */
export function requiresRender(before: HomeSettingsData, after: HomeSettingsData): boolean {
  const lists = ['favoriteAccessories', 'excludedFromDashboard', 'excludedFromHome', 'includedSwitches', 'extraAccessories'] as const;
  const scalars = ['showSwitches', 'showEnergy', 'showCost', 'showGas', 'weatherEntity'] as const;
  return (
    lists.some((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])) ||
    scalars.some((key) => before[key] !== after[key])
  );
}

export function backgroundValue(settings: HomeSettingsData): string | undefined {
  return settings.backgroundType === 'custom' ? settings.customBackground : settings.presetBackground;
}

/** Merges the settings into the stored sections, keeping keys this modal does not own. */
export function settingsToSections(settings: HomeSettingsData, home: any, ui: any) {
  return {
    home: {
      ...home,
      favorites: settings.favoriteAccessories,
      excluded_from_dashboard: settings.excludedFromDashboard,
      excluded_from_home: settings.excludedFromHome,
      included_switches: settings.includedSwitches,
      extra_accessories: settings.extraAccessories,
      weather_entity: settings.weatherEntity,
      show_switches: settings.showSwitches,
      show_energy: settings.showEnergy,
      show_cost: settings.showCost,
      show_gas: settings.showGas,
    },
    ui: { ...ui, hide_header: settings.hideHeader, hide_sidebar: settings.hideSidebar },
    background: { type: settings.backgroundType, value: backgroundValue(settings) },
  };
}
