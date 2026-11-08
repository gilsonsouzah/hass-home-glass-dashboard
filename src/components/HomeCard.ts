import { DashboardConfig } from '../config/DashboardConfig';
import { CardConfig } from '../types/types';
import { localize } from '../utils/LocalizationService';
import { RTLHelper } from '../utils/RTLHelper';
import { escapeHtml } from '../utils/html';
import { asNumber, pickHvacOnMode, stepTemperature } from '../utils/thermostat';
import { runCardAction, runIconAction } from './card/actions';
import { CameraController, isCameraUnavailable } from './card/camera';
import { toggleLock } from './card/lockModal';
import { getCardStyles } from './card/styles';

const TEMPERATURE_DEBOUNCE_MS = 600;

export class HomeCard extends HTMLElement {
  private _hass?: any;
  private entity?: string;
  private name?: string;
  private domain?: string;
  private isTall?: boolean;
  private defaultIcon?: string;
  private cameraView?: string;
  private pendingTarget?: number;
  private targetTimer?: number;
  private lastHvacMode?: string;
  private layoutKey?: string;
  private boundCardClick?: (e: Event) => void;
  private boundIconClick?: (e: Event) => void;
  private _hasRendered: boolean = false;
  private readonly camera = new CameraController(
    this,
    () => this._hass,
    () => this.entity
  );

  constructor() {
    super();
  }

  connectedCallback() {
    // cleanup() drops the listeners on disconnect; re-attach them when the node is moved back in
    if (this.shadowRoot?.querySelector('.home-glass-card') && !this.boundCardClick) {
      this.setupClickHandlers();
    }
    this.resumeCamera();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  public cleanup() {
    this.camera.stop();

    if (this.shadowRoot) {
      const card = this.shadowRoot.querySelector('.home-glass-card');
      const icon = this.shadowRoot.querySelector('.info-icon');

      if (card && this.boundCardClick) {
        card.removeEventListener('click', this.boundCardClick);
      }
      if (icon && this.boundIconClick) {
        icon.removeEventListener('click', this.boundIconClick);
      }
    }

    this.boundCardClick = undefined;
    this.boundIconClick = undefined;
  }

  static getStubConfig() {
    return { entity: 'light.example' };
  }

  setConfig(config: CardConfig) {
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }
    const entityChanged = this.entity !== config.entity;
    this.entity = config.entity;
    this.name = config.name;
    this.domain = config.domain || config.entity.split('.')[0];
    this.isTall = config.is_tall || false;
    this.defaultIcon = config.default_icon;
    this.cameraView = config.camera_view;

    if (entityChanged) {
      this._hasRendered = false;
    }

    this.className = this.isTall ? 'tall-design' : 'regular-design';
  }

  set hass(hass: any) {
    const oldHass = this._hass;
    this._hass = hass;

    if (!oldHass) {
      this.render();
    } else if (this.entity && oldHass.states[this.entity] && hass.states[this.entity]) {
      // HA replaces the state object on every state or attribute change
      if (oldHass.states[this.entity] !== hass.states[this.entity]) {
        if (this._hasRendered) {
          this.updateCardInPlace();
        } else {
          this.render();
        }
      }
    } else if (this.entity && (!oldHass.states[this.entity] || !hass.states[this.entity])) {
      this.render();
    }
  }

  get hass() {
    return this._hass;
  }

  /**
   * The single entity_id this card renders. Public accessor over the private
   * `entity` field so HomeView can index cards by entity without reflection.
   */
  get entityId(): string | undefined {
    return this.entity;
  }

  /**
   * True for cards that must receive every hass update regardless of their own
   * entity's state changing. Camera cards fetch snapshots on a timer using the
   * latest hass (connection/signed paths), so they cannot be routed only on
   * state-object changes without going stale.
   */
  get needsContinuousHass(): boolean {
    return this.domain === 'camera';
  }

  private render() {
    if (!this._hass || !this.entity) {
      return;
    }

    const state = this._hass.states[this.entity];
    if (!state) {
      this.renderErrorState(localize('errors.entity_not_found'));
      return;
    }

    const name = this.name || state.attributes.friendly_name || this.entity.split('.')[1].replace(/_/g, ' ');

    const isInStatusContext = this.closest('.status-modal-cards') || this.closest('.status-chips-container');
    const forceWhiteIcons = Boolean(isInStatusContext);

    const entityData = DashboardConfig.getEntityData(state, this.domain!, this.isTall, forceWhiteIcons, this._hass);

    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }

    if (this.domain === 'camera' && this.cameraView === 'snapshot') {
      this.camera.stop();
    }

    const isEditMode = this.isEditMode();

    let iconElement: string;
    const thermostat = this.thermostatLayout(state, entityData);
    this.layoutKey = thermostat.key;
    this.trackHvacMode(state);
    const currentTemp = asNumber(state.attributes.current_temperature);

    if (this.domain === 'climate') {
      const tempText = currentTemp !== null ? `${currentTemp.toFixed(1)}°` : '--.-°';
      iconElement = thermostat.isActive
        ? `
        <div class="thermostat-top-row climate-active">
          <div class="thermostat-target-temp" dir="ltr">${thermostat.displayTemp}</div>
          ${thermostat.showControls ? this.thermostatControlsHtml() : ''}
        </div>
        `
        : `
        <div class="info-icon temperature-display">
          <span class="temperature-text" dir="ltr">${tempText}</span>
        </div>
        `;
    } else if (this.domain === 'water_heater') {
      iconElement = `
        <div class="thermostat-top-row ${thermostat.isActive ? 'water-heater-active' : 'water-heater-inactive'}">
          <div class="thermostat-target-temp" dir="ltr">${thermostat.displayTemp}</div>
          ${thermostat.showControls ? this.thermostatControlsHtml() : ''}
        </div>
      `;
    } else if (this.domain === 'camera' && this.cameraView === 'snapshot') {
      if (isCameraUnavailable(state)) {
        iconElement = `
          <div class="camera-icon-unavailable">
            <ha-icon icon="mdi:camera-off"></ha-icon>
          </div>
        `;
      } else {
        iconElement = `
          <div class="camera-container" id="camera-container-${this.entity!.replace(/\./g, '-')}">
            <div class="camera-loading">
              <ha-icon icon="mdi:camera"></ha-icon>
            </div>
            <div class="camera-overlay">
              <span class="camera-live-indicator">LIVE</span>
            </div>
          </div>
        `;
      }
    } else {
      const icon = escapeHtml(this.defaultIcon || entityData.icon);

      if (
        this.domain === 'scene' ||
        this.domain === 'script' ||
        this.domain === 'button' ||
        this.domain === 'input_button'
      ) {
        iconElement = `
          <div class="info-icon scene-icon">
            <ha-icon icon="${icon}"></ha-icon>
          </div>
        `;
      } else {
        iconElement = `
          <div class="info-icon">
            <ha-icon icon="${icon}"></ha-icon>
          </div>
        `;
      }
    }

    this.shadowRoot!.innerHTML = `
      <style>
        ${getCardStyles(entityData)}
      </style>
      <div class="home-glass-card ${isEditMode ? 'edit-mode' : ''} ${this.domain === 'camera' && this.cameraView === 'snapshot' ? 'camera-card' : ''} ${RTLHelper.isRTL() ? 'rtl' : 'ltr'}">
        <div class="card-info">
          ${iconElement}
          ${
            this.domain === 'camera' && this.cameraView === 'snapshot'
              ? (() => {
                  const entityPicture = state.attributes?.entity_picture;

                  if (isCameraUnavailable(state)) {
                    return `
                <div class="text-content camera-text">
                  <div class="entity-name">${escapeHtml(name)}</div>
                  <div class="entity-state camera-status">${localize('status_messages.unavailable')}</div>
                </div>
              `;
                  } else if (!entityPicture) {
                    return `
                <div class="text-content camera-text">
                  <div class="entity-name">${escapeHtml(name)}</div>
                  <div class="entity-state camera-status">${localize('camera.no_snapshot_available')}</div>
                </div>
              `;
                  }
                  return ''; // No text content for working cameras
                })()
              : this.domain === 'camera'
                ? ''
                : `
          <div class="text-content">
            <div class="entity-name">${escapeHtml(name)}</div>
            ${this.domain === 'scene' || this.domain === 'script' || this.domain === 'button' || this.domain === 'input_button' ? '' : `<div class="entity-state">${escapeHtml(entityData.stateText)}</div>`}
          </div>
          `
          }
        </div>
      </div>
    `;

    this.updateCSSVariables(entityData);
    this._hasRendered = true;

    this.setupClickHandlers();

    if (this.domain === 'camera' && this.cameraView === 'snapshot' && !isEditMode) {
      this.camera.initialize();
    }
  }

  private isEditMode(): boolean {
    return this.closest('.entity-card-wrapper')?.classList.contains('edit-mode') || false;
  }

  private updateCSSVariables(entityData: any) {
    this.style.setProperty('--card-bg-color', entityData.backgroundColor);
    this.style.setProperty('--card-icon-color', entityData.iconColor);
    this.style.setProperty('--card-icon-bg', entityData.iconBackgroundColor);
    this.style.setProperty('--card-text-color', entityData.textColor);
    this.style.setProperty(
      '--card-state-color',
      entityData.isActive ? 'rgba(29, 29, 31, 0.6)' : 'rgba(255, 255, 255, 0.6)'
    );
  }

  private updateCardInPlace() {
    if (!this._hass || !this.entity || !this.shadowRoot) return;

    const state = this._hass.states[this.entity];
    if (!state) return;

    const name = this.name || state.attributes.friendly_name || this.entity.split('.')[1].replace(/_/g, ' ');
    const isInStatusContext = this.closest('.status-modal-cards') || this.closest('.status-chips-container');
    const forceWhiteIcons = Boolean(isInStatusContext);
    const entityData = DashboardConfig.getEntityData(state, this.domain!, this.isTall, forceWhiteIcons, this._hass);

    this.updateCSSVariables(entityData);

    const nameEl = this.shadowRoot.querySelector('.entity-name');
    if (nameEl) {
      nameEl.textContent = name;
    }

    const stateEl = this.shadowRoot.querySelector('.entity-state');
    if (stateEl) {
      stateEl.textContent = entityData.stateText;
    }

    if (this.domain === 'climate' || this.domain === 'water_heater') {
      this.trackHvacMode(state);
      const thermostat = this.thermostatLayout(state, entityData);
      // on/off or target-temperature availability changed: the markup differs, rebuild it
      if (thermostat.key !== this.layoutKey) {
        this.render();
        return;
      }
      const currentTemp = asNumber(state.attributes.current_temperature);
      const tempEl = this.shadowRoot.querySelector('.temperature-text');
      if (tempEl) {
        tempEl.textContent = currentTemp !== null ? `${currentTemp.toFixed(1)}°` : '--.-°';
      }
      this.showTargetTemp(thermostat.displayTemp);
    } else if (this.domain !== 'camera') {
      const icon = this.defaultIcon || entityData.icon;
      const iconEl = this.shadowRoot.querySelector('.info-icon ha-icon');
      if (iconEl) {
        iconEl.setAttribute('icon', icon);
      }
    }

    if (this.domain === 'camera') {
      const hasUnavailableIcon = !!this.shadowRoot.querySelector('.camera-icon-unavailable');
      if (hasUnavailableIcon !== isCameraUnavailable(state)) {
        this.render();
      }
    }
  }

  private setupClickHandlers() {
    const card = this.shadowRoot!.querySelector('.home-glass-card') as HTMLElement;
    const icon = this.shadowRoot!.querySelector('.info-icon') as HTMLElement;

    this.boundCardClick = this.handleCardClick.bind(this);
    this.boundIconClick = this.handleIconClick.bind(this);

    card?.addEventListener('click', this.boundCardClick);
    icon?.addEventListener('click', this.boundIconClick);
  }

  private thermostatLayout(state: any, entityData: { isActive: boolean }) {
    const target = asNumber(state.attributes.temperature);
    const current = asNumber(state.attributes.current_temperature);
    const isClimate = this.domain === 'climate';
    const fallbackTemp = current === null ? (isClimate ? '--°' : '--.-°') : `${current.toFixed(isClimate ? 0 : 1)}°`;
    const isActive = entityData.isActive;
    const showControls = isActive && target !== null;
    return {
      isActive,
      showControls,
      displayTemp: target !== null ? `${target}°` : fallbackTemp,
      key: `${isActive}|${showControls}`,
    };
  }

  private thermostatControlsHtml(): string {
    return `
          <div class="thermostat-controls">
            <button class="chevron-btn chevron-up" aria-label="Increase temperature">
              <ha-icon icon="mdi:chevron-up"></ha-icon>
            </button>
            <button class="chevron-btn chevron-down" aria-label="Decrease temperature">
              <ha-icon icon="mdi:chevron-down"></ha-icon>
            </button>
          </div>
          `;
  }

  /** A target the user just tapped is shown until it is sent, so incoming state must not overwrite it. */
  private showTargetTemp(text: string) {
    if (this.pendingTarget !== undefined) return;
    const el = this.shadowRoot?.querySelector('.thermostat-target-temp');
    if (el) el.textContent = text;
  }

  private trackHvacMode(state: any) {
    if (
      this.domain === 'climate' &&
      state.state !== 'off' &&
      state.state !== 'unavailable' &&
      state.state !== 'unknown'
    ) {
      this.lastHvacMode = state.state;
    }
  }

  private adjustTemperature(delta: number) {
    if (!this._hass || !this.entity) return;
    const state = this._hass.states[this.entity];
    if (!state) return;

    const base = this.pendingTarget ?? asNumber(state.attributes.temperature);
    if (base === null) return;

    const { target_temp_step, min_temp, max_temp } = state.attributes;
    this.pendingTarget = stepTemperature(base, delta, target_temp_step, min_temp, max_temp);

    const tempDisplay = this.shadowRoot?.querySelector('.thermostat-target-temp');
    if (tempDisplay) {
      tempDisplay.textContent = `${this.pendingTarget}°`;
    }

    window.clearTimeout(this.targetTimer);
    this.targetTimer = window.setTimeout(() => this.commitTemperature(), TEMPERATURE_DEBOUNCE_MS);
  }

  private async commitTemperature() {
    const temperature = this.pendingTarget;
    this.targetTimer = undefined;
    if (temperature === undefined || !this._hass || !this.entity) return;

    try {
      await this._hass.callService(this.entity.split('.')[0], 'set_temperature', {
        entity_id: this.entity,
        temperature,
      });
    } catch (error) {
      console.error('Failed to set temperature:', error);
    } finally {
      // A tap made while the call was in flight owns pendingTarget now; its own commit will clear it
      if (this.pendingTarget === temperature) {
        this.pendingTarget = undefined;
        // On success HA's state update already matches; on failure this restores the real target
        this.updateCardInPlace();
      }
    }
  }

  public refreshEditMode() {
    this.shadowRoot?.querySelector('.home-glass-card')?.classList.toggle('edit-mode', this.isEditMode());
  }

  private renderErrorState(message: string) {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }

    this.shadowRoot!.innerHTML = `
      <style>
        .error-card {
          background: rgba(255, 59, 48, 0.1);
          border: 1px solid rgba(255, 59, 48, 0.3);
          border-radius: var(--apple-card-radius, 25px);
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          box-sizing: border-box;
        }
        .error-text {
          color: #ff3b30;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 4px;
        }
        .entity-text {
          color: rgba(255, 59, 48, 0.6);
          font-size: 12px;
        }
      </style>
      <div class="error-card">
        <div class="error-text">${escapeHtml(message)}</div>
        <div class="entity-text">${escapeHtml(this.entity)}</div>
      </div>
    `;
  }

  private openMoreInfo() {
    this.dispatchEvent(
      new CustomEvent('hass-more-info', {
        bubbles: true,
        composed: true,
        detail: { entityId: this.entity },
      })
    );
  }

  private handleCardClick(event: Event) {
    if (!this._hass || !this.entity || this.isEditMode()) return;

    const target = event.target as HTMLElement;
    const chevron = target.closest('.chevron-btn');
    if (chevron) {
      this.adjustTemperature(chevron.classList.contains('chevron-up') ? 1 : -1);
      return;
    }
    // The icon has its own handler
    if (target.closest('.info-icon')) {
      return;
    }

    runCardAction(this.actionContext());
  }

  private handleIconClick(event: Event) {
    if (!this._hass || !this.entity) return;

    // Prevent the card click from firing
    event.stopPropagation();
    if (this.isEditMode()) return;

    runIconAction(this.actionContext());
  }

  private actionContext() {
    return {
      hass: this._hass,
      entityId: this.entity!,
      climateOnMode: pickHvacOnMode(this.lastHvacMode, this._hass.states[this.entity!]?.attributes?.hvac_modes),
      openMoreInfo: () => this.openMoreInfo(),
      toggleLock: (entityId: string) => toggleLock(this._hass, entityId),
    };
  }

  getCardSize() {
    return 1;
  }

  public pauseCamera() {
    if (this.domain !== 'camera') return;
    this.camera.stop();
  }

  public resumeCamera() {
    if (this.domain !== 'camera') return;
    this.camera.resume();
  }

  public reloadCameraImage() {
    if (this.domain === 'camera' && this.cameraView === 'snapshot' && this._hass) {
      this.camera.stop();
      this.camera.initialize();
    }
  }
}
