import { localize } from '../utils/LocalizationService';
import { escapeHtml } from '../utils/html';
import { LiquidGlassClasses } from '../utils/LiquidGlassStyles';
import type { HomeSettingsData } from './settingsData';
import type { Catalog } from './entityCandidates';

const chip = (entityId: string, label: string) => `
        <div class="selected-entity-chip" data-entity-id="${escapeHtml(entityId)}">
          <span class="entity-name">${escapeHtml(label)}</span>
          <ha-icon icon="mdi:close" class="remove-entity" role="button" tabindex="0" aria-label="${escapeHtml(localize('ui_actions.remove'))}: ${escapeHtml(label)}"></ha-icon>
        </div>
      `;

const findEntity = (catalog: Catalog, entityId: string, lists: Array<keyof Catalog>) => {
  for (const list of lists) {
    const entity = catalog[list].find((e) => e.entity_id === entityId);
    if (entity) return entity;
  }
  return undefined;
};

export function selectedEntitiesHtml(catalog: Catalog, entityIds: string[]): string {
  return entityIds
    .map((entityId) => {
      const entity = findEntity(catalog, entityId, ['available', 'additional']);
      return entity ? chip(entityId, entity.friendly_name) : '';
    })
    .join('');
}

/** Saved extra accessories whose entity no longer exists still show, by id, so they can be removed. */
export function selectedInclusionHtml(catalog: Catalog, entityIds: string[]): string {
  return entityIds
    .map((entityId) => {
      const entity = findEntity(catalog, entityId, ['additional', 'available']);
      return chip(entityId, entity ? entity.friendly_name : entityId);
    })
    .join('');
}

export function selectedWeatherHtml(hass: any, entityId?: string): string {
  if (!entityId) return '';
  return chip(entityId, hass?.states?.[entityId]?.attributes?.friendly_name || entityId);
}

export interface ChipRenderers {
  entities(ids: string[]): string;
  inclusion(ids: string[]): string;
  weather(id?: string): string;
}

function switchCard(id: string, label: string, cardAttrs = ''): string {
  return `<div class="settings-card switch-card"${cardAttrs}>
          <div class="switch-setting-row">
            <span class="option-text" id="${id}-label">${label}</span>
            <div class="ui-setting-toggle" id="${id}" role="switch" tabindex="0" aria-checked="false" aria-labelledby="${id}-label">
              <div class="toggle-switch"></div>
            </div>
          </div>
        </div>`;
}

export function modalHtml(temp: HomeSettingsData, chips: ChipRenderers): string {
  return `
      <div class="modal-backdrop" aria-hidden="true"></div>
      <div class="modal-content hg-glass--thick" role="dialog" aria-modal="true" aria-labelledby="hg-settings-title">
        <div class="modal-header">
          <button class="modal-cancel ${LiquidGlassClasses.modalCancel}" aria-label="${localize('ui_actions.cancel')}">
            <ha-icon icon="mdi:close" aria-hidden="true"></ha-icon>
          </button>
          <h2 id="hg-settings-title">${localize('settings.title')}</h2>
          <button class="modal-done ${LiquidGlassClasses.modalDone}" aria-label="${localize('ui_actions.done')}">
            <ha-icon icon="mdi:check" aria-hidden="true"></ha-icon>
            <div class="save-spinner"></div>
          </button>
        </div>
        <div class="modal-body">
          ${settingsContentHtml(temp, chips)}
        </div>
      </div>
    `;
}

function settingsContentHtml(temp: HomeSettingsData, chips: ChipRenderers): string {
  return `
      <div class="settings-section">
        <h3 class="settings-section-header">${localize('settings.favorite_accessories')}</h3>
        <div class="settings-card">
          <div class="entity-selector" data-setting="favoriteAccessories">
            <div class="autocomplete-container">
              <input type="text" class="autocomplete-input" placeholder="${localize('settings.search_accessories')}" aria-label="${localize('settings.search_accessories')}" autocomplete="off" />
              <div class="autocomplete-results"></div>
            </div>
            <div class="selected-entities">
              ${chips.entities(temp.favoriteAccessories)}
            </div>
          </div>
        </div>
        <p class="settings-section-description">${localize('settings.favorite_accessories_description')}</p>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-header">${localize('settings.exclude_from_home')}</h3>
        <div class="settings-card">
          <div class="entity-selector" data-setting="excludedFromHome">
            <div class="autocomplete-container">
              <input type="text" class="autocomplete-input" placeholder="${localize('settings.search_accessories')}" aria-label="${localize('settings.search_accessories')}" autocomplete="off" />
              <div class="autocomplete-results"></div>
            </div>
            <div class="selected-entities">
              ${chips.entities(temp.excludedFromHome)}
            </div>
          </div>
        </div>
        <p class="settings-section-description">${localize('settings.exclude_from_home_description')}</p>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-header">${localize('settings.exclude_from_dashboard')}</h3>
        <div class="settings-card">
          <div class="entity-selector" data-setting="excludedFromDashboard">
            <div class="autocomplete-container">
              <input type="text" class="autocomplete-input" placeholder="${localize('settings.search_accessories')}" aria-label="${localize('settings.search_accessories')}" autocomplete="off" />
              <div class="autocomplete-results"></div>
            </div>
            <div class="selected-entities">
              ${chips.entities(temp.excludedFromDashboard)}
            </div>
          </div>
        </div>
        <p class="settings-section-description">${localize('settings.exclude_from_dashboard_description')}</p>
      </div>

      <div class="settings-section">
        ${switchCard('switches-toggle', localize('settings.show_switches_cards'))}
        <p class="settings-section-description">${localize('settings.show_switches_cards_description')}</p>
      </div>

      <div class="settings-section">
        ${switchCard('energy-toggle', localize('settings.show_energy'))}
        <p class="settings-section-description">${localize('settings.show_energy_description')}</p>
      </div>

      <div class="settings-section">
        ${switchCard('cost-toggle', localize('settings.show_cost'))}
        <p class="settings-section-description">${localize('settings.show_cost_description')}</p>
      </div>

      <div class="settings-section">
        ${switchCard('gas-toggle', localize('settings.show_gas'))}
        <p class="settings-section-description">${localize('settings.show_gas_description')}</p>
      </div>

      <div class="settings-section" id="included-switches-section" style="display: ${temp.showSwitches ? 'none' : 'block'};">
        <h3 class="settings-section-header">${localize('settings.include_specific_switches')}</h3>
        <div class="settings-card">
          <div class="entity-selector" data-setting="includedSwitches">
            <div class="autocomplete-container">
              <input type="text" class="autocomplete-input" placeholder="${localize('settings.search_switches')}" aria-label="${localize('settings.search_switches')}" autocomplete="off" />
              <div class="autocomplete-results"></div>
            </div>
            <div class="selected-entities">
              ${chips.entities(temp.includedSwitches)}
            </div>
          </div>
        </div>
        <p class="settings-section-description">${localize('settings.include_switches_description')}</p>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-header">${localize('settings.extra_accessories')}</h3>
        <div class="settings-card">
          <div class="entity-selector" data-setting="extraAccessories">
            <div class="autocomplete-container">
              <input type="text" class="autocomplete-input" placeholder="${localize('settings.search_entities')}" aria-label="${localize('settings.search_entities')}" autocomplete="off" />
              <div class="autocomplete-results"></div>
            </div>
            <div class="selected-entities">
              ${chips.inclusion(temp.extraAccessories)}
            </div>
          </div>
        </div>
        <p class="settings-section-description">${localize('settings.extra_accessories_description')}</p>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-header">${localize('settings.weather_entity')}</h3>
        <div class="settings-card">
          <div class="entity-selector" data-setting="weatherEntity">
            <div class="autocomplete-container">
              <input type="text" class="autocomplete-input" placeholder="${localize('settings.search_weather_entity')}" aria-label="${localize('settings.search_weather_entity')}" autocomplete="off" />
              <div class="autocomplete-results"></div>
            </div>
            <div class="selected-entities">
              ${chips.weather(temp.weatherEntity)}
            </div>
          </div>
        </div>
        <p class="settings-section-description">${localize('settings.weather_entity_description')}</p>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-header">${localize('settings.home_wallpaper')}</h3>
        <div class="settings-card">
          <div class="wallpaper-options">
            <div class="wallpaper-option-row" data-action="upload" role="button" tabindex="0">
              <span class="option-text upload-text">${localize('settings.take_photo')}</span>
            </div>
            <div class="wallpaper-option-row" data-action="presets" role="button" tabindex="0">
              <span class="option-text">${localize('settings.choose_from_existing')}</span>
              <ha-icon icon="mdi:chevron-right" class="option-arrow" aria-hidden="true"></ha-icon>
            </div>
          </div>

          <div class="current-wallpaper-preview">
            <div class="wallpaper-preview-image" id="current-wallpaper-preview" role="img" aria-label="${localize('settings.home_wallpaper')}"></div>
          </div>

          <input type="file" id="background-file-input" accept="image/*" style="display: none;">
        </div>
      </div>

      <div class="settings-section">
        ${switchCard('header-toggle', localize('settings.hide_ha_header'))}
      </div>

      <div class="settings-section">
        ${switchCard('sidebar-toggle', localize('settings.hide_ha_sidebar'), ' data-setting="sidebar"')}
      </div>

      <div class="settings-section">
        ${switchCard('solid-toggle', localize('settings.solid_surfaces'))}
        <p class="settings-section-description">${localize('settings.solid_surfaces_description')}</p>
      </div>
    `;
}
