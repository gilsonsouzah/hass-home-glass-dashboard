import { CustomizationManager } from './CustomizationManager';
import { escapeHtml } from './html';
import { localize } from './LocalizationService';
import { BackgroundManager } from './BackgroundManager';
import { HomeAssistantUIManager } from './HomeAssistantUIManager';
import { injectLiquidGlassStyles } from './LiquidGlassStyles';
import {
  HomeSettingsData,
  backgroundValue,
  cloneSettings,
  defaultSettings,
  requiresRender,
  settingsFromCustomizations,
  settingsToSections,
} from '../settings/settingsData';
import { Catalog, entityCandidates } from '../settings/entityCandidates';
import { loadCatalog } from '../settings/entityCatalog';
import {
  modalHtml,
  selectedEntitiesHtml,
  selectedInclusionHtml,
  selectedWeatherHtml,
} from '../settings/settingsTemplate';
import { SETTINGS_CSS, SETTINGS_STYLE_ID } from '../settings/settingsStyles';
import { applyUploadedWallpaper, openPresetsView, updateWallpaperPreview } from '../settings/wallpaperPicker';
import { openModal } from '../settings/modalStack';
import { applySolidSurfaces } from '../settings/solidSurfaces';

export type { HomeSettingsData } from '../settings/settingsData';

const MODAL_FADE_MS = 300;

const TOGGLES: Array<{ id: string; key: 'hideHeader' | 'hideSidebar' | 'solidSurfaces' | 'showSwitches' | 'showEnergy' | 'showCost' | 'showGas' }> = [
  { id: 'header-toggle', key: 'hideHeader' },
  { id: 'sidebar-toggle', key: 'hideSidebar' },
  { id: 'solid-toggle', key: 'solidSurfaces' },
  { id: 'switches-toggle', key: 'showSwitches' },
  { id: 'energy-toggle', key: 'showEnergy' },
  { id: 'cost-toggle', key: 'showCost' },
  { id: 'gas-toggle', key: 'showGas' },
];

export class HomeSettingsManager {
  private modal?: HTMLElement;
  private listenersAbort?: AbortController;
  private releaseModal?: () => void;
  private customizationManager: CustomizationManager;
  private backgroundManager?: BackgroundManager;
  private onSaveCallback: () => void;
  private hass: any;
  private settings: HomeSettingsData;
  private tempSettings: HomeSettingsData;
  private catalog: Catalog = { available: [], additional: [] };

  constructor(customizationManager: CustomizationManager, onSaveCallback: () => void) {
    this.customizationManager = customizationManager;
    this.onSaveCallback = onSaveCallback;
    this.settings = defaultSettings(BackgroundManager.DEFAULT_BACKGROUND);
    this.tempSettings = cloneSettings(this.settings);
  }

  public async showHomeSettingsModal(hass: any) {
    this.hass = hass;
    await this.loadSettings();
    this.catalog = loadCatalog(hass);
    this.createModal();
    this.setupEventListeners();
    this.showModal();
  }

  private async loadSettings() {
    await this.customizationManager.ensureCustomizationsLoaded();
    this.settings = settingsFromCustomizations(
      this.customizationManager.getCustomizations(),
      BackgroundManager.DEFAULT_BACKGROUND
    );
    this.tempSettings = cloneSettings(this.settings);
  }

  private chipRenderers() {
    return {
      entities: (ids: string[]) => selectedEntitiesHtml(this.catalog, ids),
      inclusion: (ids: string[]) => selectedInclusionHtml(this.catalog, ids),
      weather: (id?: string) => selectedWeatherHtml(this.hass, id),
    };
  }

  private createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'hg-settings-modal';
    this.modal.innerHTML = modalHtml(this.tempSettings, this.chipRenderers());

    this.addModalStyles();
    document.body.appendChild(this.modal);
  }

  private addModalStyles() {
    injectLiquidGlassStyles();

    if (document.querySelector(`#${SETTINGS_STYLE_ID}`)) return;

    const style = document.createElement('style');
    style.id = SETTINGS_STYLE_ID;
    style.textContent = SETTINGS_CSS;
    document.head.appendChild(style);
  }

  private setupEventListeners() {
    if (!this.modal) return;
    this.listenersAbort = new AbortController();
    const signal = this.listenersAbort.signal;

    this.modal.querySelector('.modal-cancel')?.addEventListener('click', () => this.closeModal());
    this.modal.querySelector('.modal-done')?.addEventListener('click', () => this.saveAndClose());
    this.modal.querySelector('.modal-backdrop')?.addEventListener('click', () => this.closeModal());

    this.setupAutocomplete();
    this.modal.addEventListener('click', (e) => this.handleRemoveClick(e), { signal });
    this.modal.addEventListener('keydown', (e) => this.handleActivationKey(e), { signal });
    this.releaseModal = openModal(this.modal, () => this.closeModal());

    this.setupBackgroundEventListeners();
  }

  private forEachSelector(fn: (selector: Element, input: HTMLInputElement, results: HTMLElement, setting: keyof HomeSettingsData) => void) {
    this.modal?.querySelectorAll('.entity-selector').forEach((selector) => {
      const input = selector.querySelector('.autocomplete-input') as HTMLInputElement;
      const results = selector.querySelector('.autocomplete-results') as HTMLElement;
      const setting = selector.getAttribute('data-setting') as keyof HomeSettingsData;
      if (input && results && setting) fn(selector, input, results, setting);
    });
  }

  private setupAutocomplete() {
    const signal = this.listenersAbort?.signal;

    this.forEachSelector((selector, input, results, setting) => {
      const show = () => this.showAutocompleteResults(input.value.toLowerCase().trim(), results, setting);
      input.addEventListener('input', show);
      input.addEventListener('focus', show);

      document.addEventListener('click', (e) => {
        if (!selector.contains(e.target as Node)) {
          results.classList.remove('show');
        }
      }, { signal });

      window.addEventListener('resize', () => {
        if (results.classList.contains('show')) {
          this.positionAutocompleteResults(results);
        }
      }, { signal });
    });
  }

  private showAutocompleteResults(query: string, resultsContainer: HTMLElement, setting: keyof HomeSettingsData) {
    const matches = entityCandidates(setting, query, this.tempSettings, this.catalog, this.hass.states);

    if (matches.length === 0) {
      if (query === '') {
        resultsContainer.classList.remove('show');
        return;
      }
      resultsContainer.innerHTML = `<div class="autocomplete-result"><div class="autocomplete-result-name">${escapeHtml(localize('settings.no_entities_found'))}</div></div>`;
      this.positionAutocompleteResults(resultsContainer);
      resultsContainer.classList.add('show');
      return;
    }

    resultsContainer.innerHTML = matches.map(entity => `
      <div class="autocomplete-result" data-entity-id="${escapeHtml(entity.entity_id)}">
        <div class="autocomplete-result-name">${escapeHtml(entity.friendly_name)}</div>
        <div class="autocomplete-result-id">${escapeHtml(entity.entity_id)}</div>
      </div>
    `).join('');

    resultsContainer.querySelectorAll('.autocomplete-result').forEach(result => {
      result.addEventListener('click', (e) => {
        const entityId = (e.currentTarget as HTMLElement).getAttribute('data-entity-id');
        if (entityId) {
          this.addEntityToSetting(entityId, setting);
          resultsContainer.classList.remove('show');
          const input = resultsContainer.parentElement?.querySelector('.autocomplete-input') as HTMLInputElement;
          if (input) input.value = '';
        }
      });
    });

    this.positionAutocompleteResults(resultsContainer);
    resultsContainer.classList.add('show');
  }

  private positionAutocompleteResults(resultsContainer: HTMLElement) {
    const input = resultsContainer.parentElement?.querySelector('.autocomplete-input') as HTMLInputElement;
    if (input) {
      const width = `${input.getBoundingClientRect().width}px`;
      if (resultsContainer.style.minWidth !== width) {
        resultsContainer.style.minWidth = width;
      }
    }
  }

  private refreshAutocompleteResults() {
    this.forEachSelector((_selector, input, results, setting) => {
      if (results.classList.contains('show')) {
        this.showAutocompleteResults(input.value.toLowerCase().trim(), results, setting);
      }
    });
  }

  private addEntityToSetting(entityId: string, setting: keyof HomeSettingsData) {
    if (setting === 'weatherEntity') {
      this.tempSettings.weatherEntity = entityId;
      this.updateSelectedEntitiesDisplay(setting);
      return;
    }
    const settingValue = this.tempSettings[setting];
    if (Array.isArray(settingValue) && !settingValue.includes(entityId)) {
      settingValue.push(entityId);
      this.updateSelectedEntitiesDisplay(setting);
    }
  }

  private removeEntityFromSetting(entityId: string, setting: keyof HomeSettingsData) {
    if (setting === 'weatherEntity') {
      this.tempSettings.weatherEntity = undefined;
      this.updateSelectedEntitiesDisplay(setting);
      return;
    }
    const settingValue = this.tempSettings[setting];
    if (Array.isArray(settingValue)) {
      const index = settingValue.indexOf(entityId);
      if (index > -1) {
        settingValue.splice(index, 1);
        this.updateSelectedEntitiesDisplay(setting);
      }
    }
  }

  private updateSelectedEntitiesDisplay(setting: keyof HomeSettingsData) {
    const selectedContainer = this.modal?.querySelector(`[data-setting="${setting}"] .selected-entities`);
    if (!selectedContainer) return;

    const chips = this.chipRenderers();
    if (setting === 'weatherEntity') {
      selectedContainer.innerHTML = chips.weather(this.tempSettings.weatherEntity);
      return;
    }
    const settingValue = this.tempSettings[setting];
    if (Array.isArray(settingValue)) {
      selectedContainer.innerHTML = setting === 'extraAccessories' ? chips.inclusion(settingValue) : chips.entities(settingValue);
    }
  }

  private handleRemoveClick(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.closest?.('.remove-entity')) return;

    const entityId = target.closest('.selected-entity-chip')?.getAttribute('data-entity-id');
    const setting = target.closest('.entity-selector')?.getAttribute('data-setting') as keyof HomeSettingsData;
    if (entityId && setting) {
      this.removeEntityFromSetting(entityId, setting);
    }
  }

  private setupBackgroundEventListeners() {
    if (!this.modal) return;

    this.modal.querySelectorAll('.wallpaper-option-row').forEach(row => {
      row.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        if (action === 'upload') {
          document.getElementById('background-file-input')?.click();
        } else if (action === 'presets') {
          openPresetsView(this.tempSettings, () => this.refreshWallpaperPreview());
        }
      });
    });

    this.modal.querySelector('#background-file-input')?.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file && (await applyUploadedWallpaper(file, this.tempSettings))) {
        this.refreshWallpaperPreview();
      }
      target.value = '';
    });

    TOGGLES.forEach(({ id, key }) => {
      this.modal?.querySelector(`#${id}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.tempSettings[key] = !this.tempSettings[key];
        this.updateUIToggle(id, this.tempSettings[key] || false);

        if (key === 'showSwitches') {
          const includedSwitchesSection = this.modal?.querySelector('#included-switches-section') as HTMLElement;
          if (includedSwitchesSection) {
            includedSwitchesSection.style.display = this.tempSettings.showSwitches ? 'none' : 'block';
          }
          this.refreshAutocompleteResults();
        }
      });
    });

    // Defer until the modal content is in the DOM and laid out.
    setTimeout(() => {
      this.refreshWallpaperPreview();
      this.initializeUIToggles();
    }, 100);
  }

  private refreshWallpaperPreview() {
    updateWallpaperPreview(this.modal, this.tempSettings);
  }

  private updateUIToggle(toggleId: string, isActive: boolean) {
    const toggle = this.modal?.querySelector(`#${toggleId}`);
    toggle?.classList.toggle('active', isActive);
    toggle?.setAttribute('aria-checked', String(isActive));
  }

  // Switches, wallpaper rows and chip remove icons are not native buttons.
  private handleActivationKey(e: KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const target = e.target as HTMLElement;
    if (target.matches('.ui-setting-toggle, .wallpaper-option-row, .remove-entity')) {
      e.preventDefault();
      target.click();
    }
  }

  private initializeUIToggles() {
    TOGGLES.forEach(({ id, key }) => {
      // showCost/showGas default to on when unset.
      const isDefaultOn = key === 'showCost' || key === 'showGas';
      this.updateUIToggle(id, isDefaultOn ? this.tempSettings[key] !== false : this.tempSettings[key] || false);
    });
  }

  private showModal() {
    if (!this.modal) return;

    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      this.modal?.classList.add('show');
    });
  }

  private closeModal() {
    if (!this.modal) return;

    document.body.style.overflow = '';
    this.modal.classList.remove('show');
    setTimeout(() => this.teardownModal(), MODAL_FADE_MS);
  }

  private teardownModal() {
    this.listenersAbort?.abort();
    this.listenersAbort = undefined;
    this.releaseModal?.();
    this.releaseModal = undefined;
    document.body.style.overflow = '';
    this.modal?.remove();
    this.modal = undefined;
  }

  private async saveAndClose() {
    this.modal?.classList.add('saving');

    const needsRender = requiresRender(this.settings, this.tempSettings);
    this.settings = cloneSettings(this.tempSettings);

    if (this.modal) {
      this.modal.style.transition = 'opacity 0.3s ease-out';
      this.modal.style.opacity = '0';
    }

    try {
      await this.saveSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
    }

    applySolidSurfaces(this.settings.solidSurfaces === true);
    this.applyVisualChanges();

    setTimeout(() => {
      this.teardownModal();

      if (this.onSaveCallback && needsRender) {
        this.onSaveCallback();
      }
    }, MODAL_FADE_MS);
  }

  private applyVisualChanges(): void {
    this.backgroundManager ??= new BackgroundManager(this.customizationManager);
    this.backgroundManager.applyBackgroundOnly({
      type: this.settings.backgroundType,
      backgroundImage: backgroundValue(this.settings),
    });

    HomeAssistantUIManager.initializeWithCustomizations(this.customizationManager).reapplyDashboardSettings();
  }

  private async saveSettings() {
    const sections = settingsToSections(
      this.settings,
      this.customizationManager.getCustomization('home') || {},
      this.customizationManager.getCustomization('ui') || {}
    );
    await this.customizationManager.batchSetCustomizations(sections);
  }

  public destroy() {
    this.closeModal();
    document.querySelector(`#${SETTINGS_STYLE_ID}`)?.remove();
  }
}
