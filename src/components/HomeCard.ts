import { DashboardConfig } from '../config/DashboardConfig';
import { CardConfig } from '../types/types';
import { localize } from '../utils/LocalizationService';
import { RTLHelper } from '../utils/RTLHelper';
import { escapeHtml } from '../utils/html';
import { asNumber, parseCodeFormat, pickHvacOnMode, stepTemperature } from '../utils/thermostat';

const CAMERA_REFRESH_MS = 240000;
const TEMPERATURE_DEBOUNCE_MS = 600;
const ICON_TOGGLE_DOMAINS = ['humidifier', 'siren', 'valve'];

export class HomeCard extends HTMLElement {
  private _hass?: any;
  private entity?: string;
  private name?: string;
  private domain?: string;
  private isTall?: boolean;
  private defaultIcon?: string;
  private cameraView?: string;
  private queryTimer?: number;
  private pendingTarget?: number;
  private targetTimer?: number;
  private lastHvacMode?: string;
  private layoutKey?: string;
  private boundCardClick?: (e: Event) => void;
  private boundIconClick?: (e: Event) => void;
  private _hasRendered: boolean = false;

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
    this.stopCameraTimer();

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
    this.defaultIcon = (config as any).default_icon;
    this.cameraView = (config as any).camera_view;

    // Reset render flag if entity changed so next hass set does full render
    if (entityChanged) {
      this._hasRendered = false;
    }

    // Set design class based on configuration
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

    // Check if we're in a status section context (modal or status chips)
    const isInStatusContext = this.closest('.status-modal-cards') || this.closest('.status-chips-container');
    const forceWhiteIcons = Boolean(isInStatusContext);

    const entityData = DashboardConfig.getEntityData(state, this.domain!, this.isTall, forceWhiteIcons, this._hass);

    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }

    if (this.domain === 'camera' && this.cameraView === 'snapshot') {
      this.stopCameraTimer();
    }

    const isEditMode = this.isEditMode();

    let iconElement: string;
    const thermostat = this.thermostatLayout(state, entityData);
    this.layoutKey = thermostat.key;
    this.trackHvacMode(state);
    const currentTemp = asNumber(state.attributes.current_temperature);

    // Climate and Water Heater share the same card layout:
    // - Large target temp on the left
    // - Chevron up/down on the right for adjusting
    // - Current temp shown in state text below
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
      if (this.isCameraUnavailable(state)) {
        // Camera entity unavailable - show camera-off icon
        iconElement = `
          <div class="camera-icon-unavailable">
            <ha-icon icon="mdi:camera-off"></ha-icon>
          </div>
        `;
      } else {
        // Camera available - use ha-camera-stream component
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
      // Use default icon if specified, otherwise use entity icon
      const icon = escapeHtml(this.defaultIcon || entityData.icon);

      // For scenes, scripts, and buttons, use a button-style icon without circle
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
        ${this.getCardStyles(entityData, isEditMode)}
      </style>
      <div class="home-glass-card ${isEditMode ? 'edit-mode' : ''} ${this.domain === 'camera' && this.cameraView === 'snapshot' ? 'camera-card' : ''} ${RTLHelper.isRTL() ? 'rtl' : 'ltr'}">
        <div class="card-info">
          ${iconElement}
          ${
            this.domain === 'camera' && this.cameraView === 'snapshot'
              ? (() => {
                  const entityPicture = state.attributes?.entity_picture;

                  if (this.isCameraUnavailable(state)) {
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

    // Apply CSS custom properties for dynamic values
    this.updateCSSVariables(entityData);
    this._hasRendered = true;

    this.setupClickHandlers();

    if (this.domain === 'camera' && this.cameraView === 'snapshot' && !isEditMode) {
      this.initializeCameraWithSignedUrl();
    }
  }

  private isEditMode(): boolean {
    return this.closest('.entity-card-wrapper')?.classList.contains('edit-mode') || false;
  }

  private isCameraUnavailable(state: any): boolean {
    return !state?.state || ['unavailable', 'unknown', 'off'].includes(state.state);
  }

  private async signCameraPath(): Promise<string | null> {
    const result = await this._hass.callWS({
      type: 'auth/sign_path',
      path: `/api/camera_proxy/${this.entity}`,
      expires: 300,
    });
    return result?.path ?? null;
  }

  private startCameraTimer() {
    this.stopCameraTimer();
    this.queryTimer = window.setInterval(() => this.refreshCameraSignedUrl(), CAMERA_REFRESH_MS);
  }

  private stopCameraTimer() {
    if (this.queryTimer) {
      clearInterval(this.queryTimer);
      this.queryTimer = undefined;
    }
  }

  private async initializeCameraWithSignedUrl(): Promise<void> {
    if (!this._hass || !this.entity || this.isCameraUnavailable(this._hass.states[this.entity])) return;

    try {
      const signedUrl = await this.signCameraPath();
      // The card may have been detached while the signing request was pending
      if (!signedUrl || !this.isConnected) return;
      const container = this.shadowRoot?.querySelector('.camera-container');
      if (!container) return;

      container.querySelector('.camera-loading')?.remove();
      container.querySelector('.camera-stream-img')?.remove();
      container.querySelector('.camera-icon-no-snapshot')?.remove();

      const img = document.createElement('img');
      img.className = 'camera-stream-img';
      img.src = signedUrl;
      img.alt = 'Camera';
      img.onload = () => {
        img.style.display = '';
        container.querySelector('.camera-icon-no-snapshot')?.remove();
      };
      img.onerror = () => {
        img.style.display = 'none';
        if (container.querySelector('.camera-icon-no-snapshot')) return;
        const fallback = document.createElement('div');
        fallback.className = 'camera-icon-no-snapshot';
        fallback.innerHTML = '<ha-icon icon="mdi:camera-off"></ha-icon>';
        container.insertBefore(fallback, container.firstChild);
      };

      container.insertBefore(img, container.firstChild);
      this.startCameraTimer();
    } catch (error) {
      console.error('Error getting signed camera URL:', error);
    }
  }

  private updateCSSVariables(entityData: any) {
    this.style.setProperty('--card-bg-color', entityData.backgroundColor);
    this.style.setProperty('--card-icon-color', entityData.iconColor);
    this.style.setProperty('--card-icon-bg', entityData.iconBackgroundColor);
    this.style.setProperty('--card-text-color', entityData.textColor);
    this.style.setProperty('--card-state-color',
        entityData.isActive ? 'rgba(29, 29, 31, 0.6)' : 'rgba(255, 255, 255, 0.6)');
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
      if (hasUnavailableIcon !== this.isCameraUnavailable(state)) {
        this.render();
      }
    }
  }

  private async refreshCameraSignedUrl(): Promise<void> {
    if (!this._hass || !this.entity) return;

    try {
      const signedUrl = await this.signCameraPath();
      const img = this.shadowRoot?.querySelector('.camera-stream-img') as HTMLImageElement | null;
      if (signedUrl && img) {
        img.src = signedUrl;
      }
    } catch (error) {
      console.error('Error refreshing signed camera URL:', error);
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
    const fallbackTemp =
      current === null ? (isClimate ? '--°' : '--.-°') : `${current.toFixed(isClimate ? 0 : 1)}°`;
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
    if (this.domain === 'climate' && state.state !== 'off' && state.state !== 'unavailable' && state.state !== 'unknown') {
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

  // Public method to force re-render when edit mode changes
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

  private getCardStyles(entityData: any, isEditMode: boolean = false): string {
    return `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      /* Reduce motion for accessibility */
      @media (prefers-reduced-motion: reduce) {
        :host * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* Regular Design - side by side layout */
      :host(.regular-design) {
        grid-row: span 1;
      }

      /* Tall Design - stacked layout */
      :host(.tall-design) {
        grid-row: span 2;
      }

      .home-glass-card {
        background: var(--card-bg-color);
        padding: var(--apple-card-padding, 10px);
        display: flex;
        flex-direction: column;
        cursor: pointer;
        transition: background-color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        border: none;
        position: relative;
        overflow: hidden;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }

      /* Regular Design Card Layout */
      :host(.regular-design) .home-glass-card {
        justify-content: space-between;
      }

      /* Tall Design Card Layout */
      :host(.tall-design) .home-glass-card {
        justify-content: flex-start;
      }

      /* Camera cards - no padding to allow full background */
      :host(.tall-design) .home-glass-card.camera-card {
        padding: 0;
      }

      /* Edit mode - disable interactions */
      .home-glass-card.edit-mode {
        cursor: default !important;
      }

      .home-glass-card.edit-mode .info-icon {
        cursor: default !important;
      }

      .card-info {
        margin-top: 0;
        display: flex;
        height: 100%;
      }

      /* Regular Design - Icon and text side by side */
      :host(.regular-design) .card-info {
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        gap: var(--apple-card-gap, 10px);
      }

      /* Tall Design - Icon and text stacked vertically */
      :host(.tall-design) .card-info {
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        gap: var(--apple-card-gap, 10px);
      }

      .info-icon {
        width: var(--apple-card-icon-size, 38px);
        height: var(--apple-card-icon-size, 38px);
        min-width: var(--apple-card-icon-size, 38px);
        color: var(--card-icon-color);
        background: var(--card-icon-bg);
        transition: color 0.2s ease, background-color 0.2s ease;
        cursor: pointer;
        flex-shrink: 0;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
      }

      .info-icon ha-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        --mdc-icon-size: var(--apple-card-icon-font-size, 20px);
      }

      /* Scene/Script icon - no circle background */
      .info-icon.scene-icon {
        background: transparent !important;
        color: white !important;
      }

      .info-icon.scene-icon ha-icon {
        --mdc-icon-size: clamp(24px, 6vw, 32px);
        color: white !important;
      }

      /* Regular Design - Small temperature display */
      :host(.regular-design) .info-icon .temperature-text {
        font-size: var(--apple-temp-font-size-regular, 13px);
        font-weight: 700;
        color: var(--card-icon-color);
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
        letter-spacing: -0.3px;
        line-height: 1;
      }

      /* Tall Design - Large temperature display */
      :host(.tall-design) .info-icon .temperature-text {
        margin: 5px 0;
        font-size: var(--apple-temp-font-size-tall, 38px);
        font-weight: 700;
        color: var(--card-icon-color);
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
        letter-spacing: -0.5px;
        line-height: 1;
      }

      /* For all climate cards, make the temperature icon transparent */
      .info-icon.temperature-display {
        background: transparent !important;
      }

      /* For tall design, make the temperature icon bigger */
      :host(.tall-design) .info-icon.temperature-display {
        width: auto;
        height: auto;
      }

      /* Thermostat layout for climate and water_heater */
      .thermostat-top-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        width: 100%;
      }

      .thermostat-target-temp {
        font-size: var(--apple-temp-font-size-tall, 42px);
        font-weight: 700;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
        letter-spacing: -0.5px;
        line-height: 1;
      }

      /* Climate active = blue */
      .thermostat-top-row.climate-active .thermostat-target-temp {
        color: #007AFF;
      }

      /* Water heater active = orange */
      .thermostat-top-row.water-heater-active .thermostat-target-temp {
        color: #FF9500;
      }

      /* Water heater inactive = white (same as other inactive elements) */
      .thermostat-top-row.water-heater-inactive .thermostat-target-temp {
        color: ${entityData.textColor};
      }

      .thermostat-controls {
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: center;
      }

      .chevron-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: none;
        background: rgba(0, 0, 0, 0.08);
        color: ${entityData.textColor};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        -webkit-tap-highlight-color: transparent;
      }

      .chevron-btn:hover {
        background: rgba(0, 0, 0, 0.12);
      }

      .chevron-btn:active {
        transform: scale(0.95);
        background: rgba(0, 0, 0, 0.18);
      }

      .chevron-btn ha-icon {
        --mdc-icon-size: 22px;
      }

      /* Hide thermostat top row on regular (small) cards */
      :host(.regular-design) .thermostat-top-row {
        display: none;
      }

      .text-content {
        flex: 1;
        min-width: 0;
        margin-top: 2px;
        display: flex;
        flex-direction: column;
      }

      /* Regular Design - Text centered vertically */
      :host(.regular-design) .text-content {
        justify-content: center;
      }

      /* Tall Design - Text at bottom */
      :host(.tall-design) .text-content {
        margin-top: auto;
        justify-content: flex-end;
      }

      .entity-name {
        font-size: var(--apple-card-name-size, 15px);
        font-weight: 500;
        color: var(--card-text-color);
        margin: 0 0 2px 0;
        line-height: 1.3;
        letter-spacing: -0.4px;
        word-wrap: break-word;
        word-break: break-word;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        max-height: calc(1.3em * 2);
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
      }

      .entity-state {
        font-size: var(--apple-card-state-size, 13px);
        font-weight: 500;
        color: var(--card-state-color);
        margin: 0;
        line-height: 1.3;
        letter-spacing: -0.2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
      }

      /* Camera-specific styles */
      .camera-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        outline: none;
        -webkit-user-drag: none;
        user-select: none;
        -webkit-touch-callout: none;
      }

      /* Camera container takes full card space */
      :host(.tall-design) .card-info {
        flex-direction: column;
        height: 100%;
        position: relative;
        gap: 0;
      }

      :host(.tall-design) .camera-container {
        flex: 1;
      }

      /* Direct camera stream image */
      .camera-stream-img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: inherit;
        border: none;
        outline: none;
        -webkit-user-drag: none;
        user-select: none;
        pointer-events: none;
      }

      .camera-overlay {
        position: absolute;
        bottom: 10px;
        left: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        z-index: 10;
      }

      .camera-live-indicator {
        font-size: 10px;
        font-weight: 700;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
        color: white;
        background: rgba(255, 59, 48, 0.9);
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* RTL Support for camera overlay positioning */
      .home-glass-card.rtl .camera-overlay {
        left: auto;
        right: 10px;
      }

      /* RTL Support for camera icons positioning */
      .home-glass-card.rtl .camera-icon-unavailable,
      .home-glass-card.rtl .camera-icon-no-snapshot {
        left: auto;
        right: 10px;
      }

      /* RTL Support for text content alignment */
      .home-glass-card.rtl .text-content {
        text-align: right;
        direction: rtl;
      }

      .home-glass-card.rtl .entity-name,
      .home-glass-card.rtl .entity-state {
        text-align: right;
        direction: rtl;
      }

      /* RTL Support for camera text positioning */
      .home-glass-card.rtl .camera-text {
        left: auto;
        right: 10px;
      }

      /* Camera status icons (unavailable, no snapshot, loading) - positioned 10px from top and left */
      .camera-icon-unavailable,
      .camera-icon-no-snapshot,
      .camera-loading {
        color: var(--card-icon-color);
        background: transparent;
        transition: color 0.2s ease, opacity 0.2s ease;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 2;
      }

      .camera-icon-unavailable ha-icon,
      .camera-icon-no-snapshot ha-icon,
      .camera-loading ha-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        --mdc-icon-size: clamp(24px, 6vw, 32px);
      }

      /* Camera text content uses standard card styling */
      :host(.tall-design) .camera-text {
        margin-top: 0;
        flex: 0 0 auto;
        position: absolute;
        bottom: 10px;
        left: 10px;
        z-index: 2;
      }

      /* Adjust card layout for cameras */
      :host(.tall-design) .home-glass-card {
        padding: calc(var(--apple-card-padding, 10px) * 1.1);
      }

      /* Mobile adjustments for card layout */
      @media (max-width: 768px) {
        :host(.regular-design) .card-info {
            gap: var(--apple-card-gap, 10px) !important;
        }
      }

      /* Extra small screens - single column */
      @media (max-width: 359px) {
        :host(.regular-design) .card-info {
          gap: var(--apple-card-gap, 10px) !important;
        }

        .entity-name {
          -webkit-line-clamp: 1;
          max-height: 1.3em;
        }
      }
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

  private toggleLock(entityId: string) {
    const state = this._hass.states[entityId];
    // Ignore if in transitional state (locking/unlocking)
    if (state?.state === 'locking' || state?.state === 'unlocking') return;

    const action = state?.state === 'locked' ? 'unlock' : 'lock';
    if (state?.attributes?.code_format) {
      this.showLockCodeModal(entityId, action, state.attributes.code_format);
      return;
    }
    // Locks that require a code without advertising code_format fail here and open the modal
    this.tryLockAction(entityId, action);
  }

  private toggleClimate(entityId: string) {
    const state = this._hass.states[entityId];
    if (!state || state.state === 'unavailable' || state.state === 'unknown') return;

    if (state.state !== 'off') {
      this._hass.callService('climate', 'set_hvac_mode', { entity_id: entityId, hvac_mode: 'off' });
      return;
    }
    const mode = pickHvacOnMode(this.lastHvacMode, state.attributes.hvac_modes);
    if (mode) {
      this._hass.callService('climate', 'set_hvac_mode', { entity_id: entityId, hvac_mode: mode });
    } else {
      this._hass.callService('climate', 'turn_on', { entity_id: entityId });
    }
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

    const domain = this.entity.split('.')[0];

    switch (domain) {
      case 'light':
        this._hass.callService('light', 'toggle', { entity_id: this.entity });
        return;
      case 'climate':
        this.toggleClimate(this.entity);
        return;
      case 'water_heater': {
        const state = this._hass.states[this.entity];
        if (state?.attributes?.operation_mode === 'off' || state?.state === 'off') {
          // Turn on - use first available mode that is not 'off'
          const availableModes = (state?.attributes?.operation_list || []).filter((mode: string) => mode !== 'off');
          this._hass.callService('water_heater', 'set_operation_mode', {
            entity_id: this.entity,
            operation_mode: availableModes.length > 0 ? availableModes[0] : 'gas',
          });
        } else {
          this._hass.callService('water_heater', 'set_operation_mode', {
            entity_id: this.entity,
            operation_mode: 'off',
          });
        }
        return;
      }
      case 'lock':
        this.toggleLock(this.entity);
        return;
      case 'scene':
      case 'script':
        this._hass.callService(domain, 'turn_on', { entity_id: this.entity });
        return;
    }
    this.openMoreInfo();
  }

  private handleIconClick(event: Event) {
    if (!this._hass || !this.entity) return;

    // Prevent the card click from firing
    event.stopPropagation();
    if (this.isEditMode()) return;

    const domain = this.entity.split('.')[0];
    const entityId = this.entity;

    switch (domain) {
      case 'light':
      case 'switch':
      case 'fan':
      case 'input_boolean':
        this._hass.callService(domain, 'toggle', { entity_id: entityId });
        break;
      case 'cover':
        this._hass.callService('cover', this._hass.states[entityId]?.state === 'open' ? 'close_cover' : 'open_cover', {
          entity_id: entityId,
        });
        break;
      case 'lock':
        this.toggleLock(entityId);
        break;
      case 'media_player': {
        const mediaState = this._hass.states[entityId]?.state;
        if (mediaState === 'playing') {
          this._hass.callService('media_player', 'media_pause', { entity_id: entityId });
        } else if (mediaState === 'paused') {
          this._hass.callService('media_player', 'media_play', { entity_id: entityId });
        } else {
          this._hass.callService('media_player', 'turn_on', { entity_id: entityId });
        }
        break;
      }
      case 'scene':
      case 'script':
        this._hass.callService(domain, 'turn_on', { entity_id: entityId });
        break;
      case 'button':
      case 'input_button':
        this._hass.callService(domain, 'press', { entity_id: entityId });
        break;
      default:
        // Only domains with a plain toggle service are toggled; everything else (climate, camera,
        // sensors, alarm panels, vacuums, selects...) has no meaningful toggle and opens more-info
        if (ICON_TOGGLE_DOMAINS.includes(domain)) {
          this._hass.callService('homeassistant', 'toggle', { entity_id: entityId });
        } else {
          this.openMoreInfo();
        }
    }
  }

  getCardSize() {
    return 1;
  }

  public pauseCamera() {
    if (this.domain !== 'camera') return;
    this.stopCameraTimer();
  }

  public resumeCamera() {
    if (this.domain !== 'camera' || !this._hass || this.queryTimer) return;
    if (!this.shadowRoot?.querySelector('.camera-stream-img')) return;
    this.refreshCameraSignedUrl();
    this.startCameraTimer();
  }

  public reloadCameraImage() {
    if (this.domain === 'camera' && this.cameraView === 'snapshot' && this._hass) {
      this.stopCameraTimer();
      this.initializeCameraWithSignedUrl();
    }
  }

  private showLockCodeModal(entityId: string, action: 'lock' | 'unlock', codeFormat: string) {
    // Remove any existing modal
    const existingModal = document.querySelector('.lock-code-modal-overlay');
    if (existingModal) {
      existingModal.remove();
    }

    const state = this._hass?.states[entityId];
    const friendlyName = state?.attributes?.friendly_name || entityId.split('.')[1].replace(/_/g, ' ');
    const format = parseCodeFormat(codeFormat);
    const actionText = action === 'unlock' ? localize('lock_modal.unlock') : localize('lock_modal.lock');
    const cancelText = localize('lock_modal.cancel');
    const actionColor = action === 'unlock' ? '#34c759' : '#ff9500';

    // Create modal HTML with PIN pad
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'lock-code-modal-overlay';
    modalOverlay.innerHTML = `
      <style>
        .lock-code-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          animation: lockModalFadeIn 0.2s ease-out;
        }
        @keyframes lockModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lockModalSlideUp {
          from { transform: translateY(30px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .lock-code-modal {
          background: rgba(28, 28, 30, 0.98);
          border-radius: 24px;
          padding: 28px 24px;
          width: 320px;
          max-width: 90vw;
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
          animation: lockModalSlideUp 0.3s ease-out;
        }
        .lock-code-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .lock-code-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: ${actionColor};
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
        }
        .lock-code-icon svg {
          width: 28px;
          height: 28px;
          fill: #ffffff;
        }
        .lock-code-title {
          color: #ffffff;
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .lock-code-subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }
        .lock-code-display {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 8px;
          min-height: 48px;
          align-items: center;
        }
        .lock-code-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transition: all 0.15s ease;
        }
        .lock-code-dot.filled {
          background: ${actionColor};
          transform: scale(1.1);
        }
        .lock-code-input {
          width: 100%;
          box-sizing: border-box;
          padding: 14px 16px;
          margin-bottom: 8px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-size: 18px;
          text-align: center;
        }
        .lock-code-error {
          color: #ff453a;
          font-size: 13px;
          text-align: center;
          min-height: 20px;
          margin-bottom: 16px;
        }
        .lock-code-keypad {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .lock-code-key {
          aspect-ratio: 1;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-size: 28px;
          font-weight: 400;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.1s ease;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        .lock-code-key:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .lock-code-key:active {
          background: rgba(255, 255, 255, 0.25);
          transform: scale(0.95);
        }
        .lock-code-key.action {
          background: transparent;
          font-size: 14px;
          font-weight: 500;
        }
        .lock-code-key.action:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .lock-code-key.action.confirm {
          color: ${actionColor};
        }
        .lock-code-key.action.cancel {
          color: rgba(255, 255, 255, 0.6);
        }
        .lock-code-key.backspace svg {
          width: 24px;
          height: 24px;
          fill: #ffffff;
        }
        .lock-code-key:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .lock-code-actions {
          display: flex;
          gap: 12px;
        }
        .lock-code-btn {
          flex: 1;
          padding: 16px;
          border-radius: 14px;
          font-size: 17px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;
        }
        .lock-code-btn-cancel {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
        .lock-code-btn-cancel:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .lock-code-btn-confirm {
          background: ${actionColor};
          color: #ffffff;
        }
        .lock-code-btn-confirm:hover {
          filter: brightness(1.1);
        }
        .lock-code-btn-confirm:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .lock-code-btn:active {
          transform: scale(0.98);
        }
      </style>
      <div class="lock-code-modal">
        <div class="lock-code-header">
          <div class="lock-code-icon">
            <svg viewBox="0 0 24 24">
              ${action === 'unlock' ? '<path d="M12 17a2 2 0 0 0 2-2 2 2 0 0 0-2-2 2 2 0 0 0-2 2 2 2 0 0 0 2 2m6-9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h9V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3H7a5 5 0 0 1 5-5 5 5 0 0 1 5 5v2h1z"/>' : '<path d="M12 17a2 2 0 0 0 2-2 2 2 0 0 0-2-2 2 2 0 0 0-2 2 2 2 0 0 0 2 2m6-9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h1V6a5 5 0 0 1 5-5 5 5 0 0 1 5 5v2h1m-6-5a3 3 0 0 0-3 3v2h6V6a3 3 0 0 0-3-3z"/>'}
            </svg>
          </div>
          <div class="lock-code-title">${escapeHtml(friendlyName)}</div>
          <div class="lock-code-subtitle">${escapeHtml(actionText)}</div>
        </div>
        ${
          format.numeric
            ? `<div class="lock-code-display"></div>
        <div class="lock-code-error"></div>
        <div class="lock-code-keypad">
          <button class="lock-code-key" data-key="1">1</button>
          <button class="lock-code-key" data-key="2">2</button>
          <button class="lock-code-key" data-key="3">3</button>
          <button class="lock-code-key" data-key="4">4</button>
          <button class="lock-code-key" data-key="5">5</button>
          <button class="lock-code-key" data-key="6">6</button>
          <button class="lock-code-key" data-key="7">7</button>
          <button class="lock-code-key" data-key="8">8</button>
          <button class="lock-code-key" data-key="9">9</button>
          <button class="lock-code-key action cancel" data-key="cancel">${escapeHtml(cancelText)}</button>
          <button class="lock-code-key" data-key="0">0</button>
          <button class="lock-code-key backspace" data-key="backspace" aria-label="Backspace">
            <svg viewBox="0 0 24 24"><path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z"/></svg>
          </button>
        </div>`
            : `<input class="lock-code-input" type="password" autocomplete="off" aria-label="${escapeHtml(localize('lock_modal.enter_code'))}">
        <div class="lock-code-error"></div>`
        }
        <div class="lock-code-actions">
          ${format.numeric ? '' : `<button class="lock-code-btn lock-code-btn-cancel" data-key="cancel">${escapeHtml(cancelText)}</button>`}
          <button class="lock-code-btn lock-code-btn-confirm" disabled>${escapeHtml(actionText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    let code = '';
    const maxLength = format.length ?? Infinity;
    const display = modalOverlay.querySelector('.lock-code-display');
    const input = modalOverlay.querySelector('.lock-code-input') as HTMLInputElement | null;
    const errorDiv = modalOverlay.querySelector('.lock-code-error') as HTMLElement;
    const confirmBtn = modalOverlay.querySelector('.lock-code-btn-confirm') as HTMLButtonElement;

    const updateDisplay = () => {
      if (display) {
        const dots = Math.max(format.length ?? 0, code.length);
        display.innerHTML = Array.from(
          { length: dots },
          (_, i) => `<div class="lock-code-dot${i < code.length ? ' filled' : ''}"></div>`
        ).join('');
      }
      confirmBtn.disabled = code.length === 0;
    };
    updateDisplay();
    input?.focus();
    input?.addEventListener('input', () => {
      code = input.value;
      errorDiv.textContent = '';
      updateDisplay();
    });

    const closeModal = () => {
      modalOverlay.style.animation = 'lockModalFadeIn 0.2s ease-out reverse';
      setTimeout(() => modalOverlay.remove(), 150);
    };

    modalOverlay.querySelectorAll('[data-key]').forEach((key) => {
      key.addEventListener('click', (e) => {
        const keyValue = (e.currentTarget as HTMLElement).dataset.key;
        errorDiv.textContent = '';

        if (keyValue === 'cancel') {
          closeModal();
        } else if (keyValue === 'backspace') {
          code = code.slice(0, -1);
          updateDisplay();
        } else if (keyValue && code.length < maxLength) {
          code += keyValue;
          updateDisplay();
        }
      });
    });

    // Handle confirm
    const handleConfirm = async () => {
      if (!code) {
        errorDiv.textContent = localize('lock_modal.code_required');
        return;
      }

      if (format.pattern && !format.pattern.test(code)) {
        errorDiv.textContent = localize('lock_modal.invalid_code');
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.textContent = '...';
      errorDiv.textContent = '';

      try {
        await this._hass?.callService('lock', action, {
          entity_id: entityId,
          code: code,
        });
        closeModal();
      } catch (err: any) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = actionText;
        // Clear code on error
        code = '';
        if (input) input.value = '';
        updateDisplay();
        errorDiv.textContent = err?.message || localize('lock_modal.error');
      }
    };

    confirmBtn.addEventListener('click', handleConfirm);

    // Handle clicking outside
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    // Handle keyboard input
    document.addEventListener('keydown', function handler(e) {
      if (!document.body.contains(modalOverlay)) {
        document.removeEventListener('keydown', handler);
        return;
      }
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'Enter' && code.length > 0) {
        handleConfirm();
      } else if (!format.numeric) {
        // the text input handles its own typing
      } else if (e.key === 'Backspace') {
        code = code.slice(0, -1);
        updateDisplay();
      } else if (/^\d$/.test(e.key) && code.length < maxLength) {
        code += e.key;
        updateDisplay();
      }
    });
  }

  private async tryLockAction(entityId: string, action: 'lock' | 'unlock') {
    try {
      await this._hass?.callService('lock', action, { entity_id: entityId });
    } catch (err: any) {
      // If error indicates code is required, show modal
      const errorStr = String(err?.message || err || '').toLowerCase();
      if (
        errorStr.includes('code') ||
        errorStr.includes('bytes') ||
        errorStr.includes('validation') ||
        errorStr.includes('mismatch')
      ) {
        // Show modal with default numeric code format
        this.showLockCodeModal(entityId, action, '^\\d+$');
      } else {
        // Re-throw other errors
        console.error('Lock action failed:', err);
      }
    }
  }
}
