import { DashboardConfig } from '../config/DashboardConfig';
import { SnapshotManager } from '../utils/SnapshotManager';
import { CardConfig, EntityState } from '../types/types';
import { localize } from '../utils/LocalizationService';
import { RTLHelper } from '../utils/RTLHelper';

export class HomeCard extends HTMLElement {
  private config?: CardConfig;
  private _hass?: any;
  private entity?: string;
  private name?: string;
  private domain?: string;
  private isTall?: boolean;
  private defaultIcon?: string;
  private cameraView?: string;
  private refreshInterval?: number;
  private snapshotManager?: SnapshotManager;
  private cameraSnapshotFailed?: boolean = false;
  private cameraImages: HTMLImageElement[] = [];
  private visibleImageIndex: number = 0;
  private queryTimer?: number;
  private lastDisplayedTimestamp?: number;
  private boundCardClick?: (e: Event) => void;
  private boundIconClick?: (e: Event) => void;
  private _hasRendered: boolean = false;

  constructor() {
    super();
  }

  connectedCallback() {
    // CRITICAL FIX: Re-attach click handlers when card is reconnected to DOM
    // This fixes the issue where cards become unclickable after navigation
    // because disconnectedCallback removes the listeners but they weren't being re-added
    if (this.shadowRoot && this._hass && this.entity) {
      // Use setTimeout to ensure shadowRoot content is ready after potential re-render
      setTimeout(() => {
        // Check if click handlers need to be re-attached
        const card = this.shadowRoot?.querySelector('.home-glass-card') as HTMLElement;
        const isEditMode = this.closest('.entity-card-wrapper')?.classList.contains('edit-mode') || false;

        // Only setup handlers if not in edit mode and card exists
        if (card && !isEditMode && !this.boundCardClick) {
          this.setupClickHandlers();
        }
      }, 10);
    }

    // Camera cards now use direct entity_picture - no reinitialization needed
  }

  disconnectedCallback() {
    this.cleanup();
  }

  public cleanup() {
    // Clear query timer
    if (this.queryTimer) {
      clearInterval(this.queryTimer);
      this.queryTimer = undefined;
    }

    // Remove click event listeners and clear references
    // This allows connectedCallback to know handlers need to be re-attached
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

    // Clear the bound references so connectedCallback knows to re-attach
    this.boundCardClick = undefined;
    this.boundIconClick = undefined;

    // Clean up camera resources
    this.cameraImages.forEach((img) => {
      img.remove();
    });
    this.cameraImages = [];

    // Note: We don't unregister from SnapshotManager here because the camera
    // might still be valid and we want background fetching to continue
  }

  static getStubConfig() {
    return { entity: 'light.example' };
  }

  setConfig(config: CardConfig) {
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }
    const entityChanged = this.entity !== config.entity;
    this.config = config;
    this.entity = config.entity;
    this.name = config.name;
    this.domain = config.domain || config.entity.split('.')[0];
    this.isTall = config.is_tall || false;
    this.defaultIcon = (config as any).default_icon;
    this.cameraView = (config as any).camera_view;
    this.refreshInterval = (config as any).refresh_interval || 10000;

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

    // Update snapshot manager if it exists
    if (this.snapshotManager) {
      this.snapshotManager.setHass(hass);
    }

    if (!oldHass) {
      this.render();
    } else if (this.entity && oldHass.states[this.entity] && hass.states[this.entity]) {
      const oldState = oldHass.states[this.entity];
      const newState = hass.states[this.entity];

      if (
        oldState.state !== newState.state ||
        oldState.attributes.brightness !== newState.attributes.brightness ||
          oldState.attributes.icon !== newState.attributes.icon ||
          oldState.attributes.friendly_name !== newState.attributes.friendly_name ||
          oldState.attributes.current_temperature !== newState.attributes.current_temperature ||
          oldState.attributes.temperature !== newState.attributes.temperature ||
          JSON.stringify(oldState.attributes.rgb_color) !== JSON.stringify(newState.attributes.rgb_color)) {
        // Use in-place update if card has already rendered (avoids full innerHTML rebuild)
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

    // For camera cards, clear the timer and image references before re-rendering
    // The innerHTML replacement will destroy the DOM elements, so we need fresh references
    if (this.domain === 'camera' && this.cameraView === 'snapshot') {
      if (this.queryTimer) {
        clearInterval(this.queryTimer);
        this.queryTimer = undefined;
      }
      this.cameraImages = [];
      this.lastDisplayedTimestamp = undefined;
    }

    // Check if we're in edit mode by looking at parent wrapper
    const isEditMode = this.closest('.entity-card-wrapper')?.classList.contains('edit-mode') || false;

    // Create icon or temperature display or camera snapshot
    let iconElement: string;
    let tempText = '';

    if ((this.domain === 'climate' || this.domain === 'water_heater') && typeof state.attributes.current_temperature === 'number') {
      tempText = `${state.attributes.current_temperature.toFixed(1)}°`;
    } else if (this.domain === 'water_heater' && state.attributes.current_temperature !== undefined) {
      tempText = `${state.attributes.current_temperature.toFixed(1)}°`;
    } else {
      tempText = `--.-°`;
    }

    // Climate and Water Heater share the same card layout:
    // - Large target temp on the left
    // - Chevron up/down on the right for adjusting
    // - Current temp shown in state text below
    if (this.domain === 'climate') {
      const isActive = state.state !== 'off';
      const targetTemp = state.attributes.temperature;
      // For modes like 'dry' or 'fan_only' that don't have target temp, show current temp
      const displayTemp =
        targetTemp !== undefined && targetTemp !== null
          ? `${targetTemp}°`
          : state.attributes.current_temperature !== undefined
            ? `${state.attributes.current_temperature.toFixed(0)}°`
            : '--°';
      const hasTargetTemp = targetTemp !== undefined && targetTemp !== null;
      iconElement = `
        ${
          isActive
            ? `
        <div class="thermostat-top-row climate-active">
          <div class="thermostat-target-temp" dir="ltr">${displayTemp}</div>
          ${
            hasTargetTemp
              ? `
          <div class="thermostat-controls">
            <button class="chevron-btn chevron-up" aria-label="Increase temperature">
              <ha-icon icon="mdi:chevron-up"></ha-icon>
            </button>
            <button class="chevron-btn chevron-down" aria-label="Decrease temperature">
              <ha-icon icon="mdi:chevron-down"></ha-icon>
            </button>
          </div>
          `
              : ''
          }
        </div>
        `
            : `
        <div class="info-icon temperature-display">
          <span class="temperature-text" dir="ltr">${tempText}</span>
        </div>
        `
        }
      `;
    } else if (this.domain === 'water_heater') {
      const isActive = state.state !== 'off';
      const targetTemp = state.attributes.temperature;
      // For water_heater, always show target temp (even when off - shows last set value)
      const displayTemp = targetTemp !== undefined && targetTemp !== null ? `${targetTemp}°` : tempText;
      iconElement = `
        <div class="thermostat-top-row ${isActive ? 'water-heater-active' : 'water-heater-inactive'}">
          <div class="thermostat-target-temp" dir="ltr">${displayTemp}</div>
          ${
            isActive && targetTemp !== undefined
              ? `
          <div class="thermostat-controls">
            <button class="chevron-btn chevron-up" aria-label="Increase temperature">
              <ha-icon icon="mdi:chevron-up"></ha-icon>
            </button>
            <button class="chevron-btn chevron-down" aria-label="Decrease temperature">
              <ha-icon icon="mdi:chevron-down"></ha-icon>
            </button>
          </div>
          `
              : ''
          }
        </div>
      `;
    } else if (this.domain === 'camera' && this.cameraView === 'snapshot') {
      const state = this._hass.states[this.entity!];
      const cameraState = state?.state;

      // Check if camera entity is unavailable
      if (!cameraState || cameraState === 'unavailable' || cameraState === 'unknown' || cameraState === 'off') {
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
      const icon = this.defaultIcon || entityData.icon;

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
                  const state = this._hass.states[this.entity!];
                  const cameraState = state?.state;
                  const entityPicture = state?.attributes?.entity_picture;

                  // Show text content for unavailable cameras
                  if (
                    !cameraState ||
                    cameraState === 'unavailable' ||
                    cameraState === 'unknown' ||
                    cameraState === 'off'
                  ) {
                    return `
                <div class="text-content camera-text">
                  <div class="entity-name">${name}</div>
                  <div class="entity-state camera-status">${localize('status_messages.unavailable')}</div>
                </div>
              `;
                  } else if (!entityPicture) {
                    return `
                <div class="text-content camera-text">
                  <div class="entity-name">${name}</div>
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
            <div class="entity-name">${name}</div>
            ${this.domain === 'scene' || this.domain === 'script' || this.domain === 'button' || this.domain === 'input_button' ? '' : `<div class="entity-state">${entityData.stateText}</div>`}
          </div>
          `
          }
        </div>
      </div>
    `;

    // Apply CSS custom properties for dynamic values
    this.updateCSSVariables(entityData);
    this._hasRendered = true;

    // Add click handlers only if not in edit mode
    if (!isEditMode) {
      this.setupClickHandlers();
    }

    // Initialize camera with signed URL if this is a camera card
    if (this.domain === 'camera' && this.cameraView === 'snapshot' && !isEditMode) {
      this.initializeCameraWithSignedUrl();
    }
  }

  // Initialize camera using signed URL from HA API
  private async initializeCameraWithSignedUrl(): Promise<void> {
    if (!this._hass || !this.entity) return;

    const state = this._hass.states[this.entity];
    if (!state || state.state === 'unavailable' || state.state === 'unknown' || state.state === 'off') {
      return;
    }

    try {
      // Use HA's signPath API to get a signed URL for the camera
      const result = await this._hass.callWS({
        type: 'auth/sign_path',
        path: `/api/camera_proxy/${this.entity}`,
        expires: 300, // 5 minutes
      });

      if (result && result.path) {
        const signedUrl = result.path;
        const container = this.shadowRoot?.querySelector('.camera-container');
        if (container) {
          // Remove loading icon
          const loading = container.querySelector('.camera-loading');
          if (loading) {
            loading.remove();
          }

          // Create image element with signed URL
          const img = document.createElement('img');
          img.className = 'camera-stream-img';
          img.src = signedUrl;
          img.alt = 'Camera';
          img.onerror = () => {
            // On error, show camera icon
            img.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = 'camera-icon-no-snapshot';
            fallback.innerHTML = '<ha-icon icon="mdi:camera-off"></ha-icon>';
            container.insertBefore(fallback, container.firstChild);
          };

          container.insertBefore(img, container.firstChild);

          // Refresh the signed URL periodically (every 4 minutes)
          if (this.queryTimer) {
            clearInterval(this.queryTimer);
          }
          this.queryTimer = window.setInterval(() => {
            this.refreshCameraSignedUrl();
          }, 240000); // 4 minutes
        }
      }
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

    // Update CSS custom properties - browser handles all visual changes efficiently
    this.updateCSSVariables(entityData);

    // Update entity name
    const nameEl = this.shadowRoot.querySelector('.entity-name');
    if (nameEl) {
      nameEl.textContent = name;
    }

    // Update state text
    const stateEl = this.shadowRoot.querySelector('.entity-state');
    if (stateEl) {
      stateEl.textContent = entityData.stateText;
    }

    // Update temperature for climate/water_heater entities
    if (this.domain === 'climate' || this.domain === 'water_heater') {
      const tempEl = this.shadowRoot.querySelector('.temperature-text');
      if (tempEl && typeof state.attributes.current_temperature === 'number') {
        tempEl.textContent = `${state.attributes.current_temperature.toFixed(1)}°`;
      }
    }

    // Update icon if domain uses dynamic icons
    if (this.domain !== 'camera' && this.domain !== 'climate' && this.domain !== 'water_heater') {
      const icon = this.defaultIcon || entityData.icon;
      const iconEl = this.shadowRoot.querySelector('.info-icon ha-icon');
      if (iconEl) {
        iconEl.setAttribute('icon', icon);
      }
    }

    // For camera cards, only do full render if availability state changed
    if (this.domain === 'camera') {
      const cameraState = state?.state;
      const hasUnavailableIcon = !!this.shadowRoot.querySelector('.camera-icon-unavailable');
      const isNowUnavailable = !cameraState || cameraState === 'unavailable' || cameraState === 'unknown' || cameraState === 'off';

      if (hasUnavailableIcon !== isNowUnavailable) {
        this.render();
      }
    }
  }

  // Refresh the signed URL for camera
  private async refreshCameraSignedUrl(): Promise<void> {
    if (!this._hass || !this.entity) return;

    try {
      const result = await this._hass.callWS({
        type: 'auth/sign_path',
        path: `/api/camera_proxy/${this.entity}`,
        expires: 300,
      });

      if (result && result.path) {
        const img = this.shadowRoot?.querySelector('.camera-stream-img') as HTMLImageElement;
        if (img) {
          img.src = result.path;
        }
      }
    } catch (error) {
      console.error('Error refreshing signed camera URL:', error);
    }
  }

  private queryAndUpdateSnapshot(): void {
    if (!this.snapshotManager || !this.entity) {
      return;
    }

    const snapshotData = this.snapshotManager.getSnapshot(this.entity);
    if (!snapshotData) {
      return;
    }

    // Check if we have a new snapshot to display
    if (snapshotData.base64Data && snapshotData.timestamp !== this.lastDisplayedTimestamp) {
      this.handleSnapshotReceived(snapshotData.base64Data);
      this.lastDisplayedTimestamp = snapshotData.timestamp;
      this.cameraSnapshotFailed = false;
    } else if (snapshotData.hasError) {
      this.handleCameraSnapshotFailed();
    }

    // Update timestamp display
    this.updateCameraTimestamp();
  }

  private setupCameraImages(container: HTMLElement): void {
    // Create exactly 2 image elements stacked on top of each other
    for (let i = 0; i < 2; i++) {
      const img = document.createElement('img');
      img.className = 'camera-snapshot';
      img.draggable = false; // Prevent native image dragging
      img.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: inherit;
        transition: opacity 0.3s ease;
        border: none;
        outline: none;
        box-shadow: none;
        pointer-events: none;
        -webkit-user-drag: none;
        user-select: none;
      `;

      // Both images start hidden until we have content to show
      img.style.opacity = '0';
      img.style.zIndex = i === 0 ? '2' : '1';

      container.appendChild(img);
      this.cameraImages.push(img);
    }
  }

  private handleSnapshotReceived(base64Data: string): void {
    if (!this.cameraImages || this.cameraImages.length < 2) {
      return;
    }

    this.cameraSnapshotFailed = false;

    // Update the visible image
    const hiddenImageIndex = this.visibleImageIndex === 0 ? 1 : 0;
    const hiddenImage = this.cameraImages[hiddenImageIndex];
    const visibleImage = this.cameraImages[this.visibleImageIndex];

    if (!hiddenImage || !visibleImage) {
      return;
    }

    const onLoad = () => {
      hiddenImage.style.opacity = '1';
      hiddenImage.style.zIndex = '2';
      visibleImage.style.opacity = '0';
      visibleImage.style.zIndex = '1';

      this.visibleImageIndex = hiddenImageIndex;

      hiddenImage.removeEventListener('load', onLoad);
      hiddenImage.removeEventListener('error', onError);
    };

    const onError = () => {
      hiddenImage.removeEventListener('load', onLoad);
      hiddenImage.removeEventListener('error', onError);
    };

    hiddenImage.addEventListener('load', onLoad);
    hiddenImage.addEventListener('error', onError);

    hiddenImage.src = base64Data;
  }

  private cleanupCamera(): void {
    // Clear query timer
    if (this.queryTimer) {
      clearInterval(this.queryTimer);
      this.queryTimer = undefined;
    }

    // Remove camera images from DOM
    this.cameraImages.forEach((img) => {
      img.remove();
    });
    this.cameraImages = [];

    // Reset display state
    this.lastDisplayedTimestamp = undefined;

    // Only unregister from SnapshotManager if camera is actually unavailable
    // Don't unregister during navigation - preserve the background fetching
    if (this._hass && this.entity) {
      const state = this._hass.states[this.entity];
      const cameraState = state?.state;

      if (!cameraState || cameraState === 'unavailable' || cameraState === 'unknown' || cameraState === 'off') {
        // Camera is truly unavailable - unregister it
        if (this.snapshotManager) {
          this.snapshotManager.unregisterCamera(this.entity);
        }
        this.snapshotManager = undefined;
      }
    } else {
      // No hass or entity - safe to fully cleanup
      if (this.snapshotManager && this.entity) {
        this.snapshotManager.unregisterCamera(this.entity);
      }
      this.snapshotManager = undefined;
    }
  }

  private setupClickHandlers() {
    const card = this.shadowRoot!.querySelector('.home-glass-card') as HTMLElement;
    const icon = this.shadowRoot!.querySelector('.info-icon') as HTMLElement;
    const chevronUpBtn = this.shadowRoot!.querySelector('.chevron-up') as HTMLElement;
    const chevronDownBtn = this.shadowRoot!.querySelector('.chevron-down') as HTMLElement;

    // Store bound references for cleanup
    this.boundCardClick = this.handleCardClick.bind(this);
    this.boundIconClick = this.handleIconClick.bind(this);

    if (card) {
      card.addEventListener('click', this.boundCardClick);
    }

    if (icon) {
      icon.addEventListener('click', this.boundIconClick);
    }

    // Add temperature control handlers for climate and water_heater
    if (chevronUpBtn) {
      chevronUpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.adjustTemperature(1);
      });
    }

    if (chevronDownBtn) {
      chevronDownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.adjustTemperature(-1);
      });
    }
  }

  private adjustTemperature(delta: number) {
    if (!this._hass || !this.entity) return;

    const domain = this.entity.split('.')[0];
    const state = this._hass.states[this.entity];
    if (!state) return;

    const currentTarget = state.attributes.temperature;
    if (currentTarget === undefined || currentTarget === null) return;

    const minTemp = state.attributes.min_temp || 7;
    const maxTemp = state.attributes.max_temp || 35;
    const step = state.attributes.target_temp_step || 1;

    const newTemp = Math.min(maxTemp, Math.max(minTemp, currentTarget + delta * step));

    // Optimistic UI update - update display immediately before server response
    const tempDisplay = this.shadowRoot?.querySelector('.thermostat-target-temp');
    if (tempDisplay) {
      tempDisplay.textContent = `${newTemp}°`;
    }

    if (domain === 'climate') {
      this._hass.callService('climate', 'set_temperature', {
        entity_id: this.entity,
        temperature: newTemp,
      });
    } else if (domain === 'water_heater') {
      this._hass.callService('water_heater', 'set_temperature', {
        entity_id: this.entity,
        temperature: newTemp,
      });
    }
  }

  // Public method to force re-render when edit mode changes
  public refreshEditMode() {
    const isEditMode = this.closest('.entity-card-wrapper')?.classList.contains('edit-mode') || false;
      const card = this.shadowRoot?.querySelector('.home-glass-card');
      if (card) {
        if (isEditMode) {
          card.classList.add('edit-mode');
        } else {
          card.classList.remove('edit-mode');
        }
      }
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
        <div class="error-text">${message}</div>
        <div class="entity-text">${this.entity}</div>
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

      /* Show simple temperature for regular design water heater */
      :host(.regular-design) .water-heater-display {
        display: flex;
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

      .camera-snapshot {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: opacity 0.3s ease;
        border: none;
        outline: none;
        -webkit-user-drag: none;
        user-select: none;
        pointer-events: none;
        -webkit-touch-callout: none;
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

      .camera-fallback {
        display: none;
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

      .camera-timestamp {
        font-size: clamp(10px, 2.5vw, 12px);
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
        color: white;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
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

      /* Camera icon when unavailable - positioned 10px from top and left */
      .camera-icon-unavailable {
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

      .camera-icon-unavailable ha-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        --mdc-icon-size: clamp(24px, 6vw, 32px);
      }

      /* Camera icon when no snapshot available - positioned 10px from top and left */
      .camera-icon-no-snapshot {
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

      .camera-icon-no-snapshot ha-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        --mdc-icon-size: clamp(24px, 6vw, 32px);
      }

      /* Camera loading state - matches camera error states */
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

  private handleCardClick(event: Event) {
    if (!this._hass || !this.entity) return;

    // Check if the click was on the icon or thermostat controls - if so, don't handle it here
    const target = event.target as HTMLElement;
    if (target.closest('.info-icon') || target.closest('.thermostat-controls')) {
      return;
    }

    const domain = this.entity.split('.')[0];

    // For lights, toggle directly on card click
    if (domain === 'light') {
      this._hass.callService('light', 'toggle', { entity_id: this.entity });
      return;
    }

    // For climate, toggle on/off - always use 'cool' mode
    if (domain === 'climate') {
      const state = this._hass.states[this.entity];
      if (state?.state === 'off') {
        // Turn on - always use 'cool' mode
        this._hass.callService('climate', 'set_hvac_mode', {
          entity_id: this.entity,
          hvac_mode: 'cool',
        });
      } else {
        // Turn off
        this._hass.callService('climate', 'set_hvac_mode', {
          entity_id: this.entity,
          hvac_mode: 'off',
        });
      }
      return;
    }

    // For water_heater, toggle on/off using operation_mode
    if (domain === 'water_heater') {
      const state = this._hass.states[this.entity];
      const operationList = state?.attributes?.operation_list || [];
      const currentMode = state?.attributes?.operation_mode;

      if (currentMode === 'off' || state?.state === 'off') {
        // Turn on - use first available mode that is not 'off'
        const availableModes = operationList.filter((mode: string) => mode !== 'off');
        const targetMode = availableModes.length > 0 ? availableModes[0] : 'gas';
        this._hass.callService('water_heater', 'set_operation_mode', {
          entity_id: this.entity,
          operation_mode: targetMode,
        });
      } else {
        // Turn off
        this._hass.callService('water_heater', 'set_operation_mode', {
          entity_id: this.entity,
          operation_mode: 'off',
        });
      }
      return;
    }

    // For locks, toggle lock/unlock on card click
    if (domain === 'lock') {
      const state = this._hass.states[this.entity];
      const lockState = state?.state;
      // Ignore if in transitional state (locking/unlocking)
      if (lockState === 'locking' || lockState === 'unlocking') {
        return;
      }
      // Determine the action based on current state
      const action = lockState === 'locked' ? 'unlock' : 'lock';
      // If lock requires a code, show modal to enter code
      if (state?.attributes?.code_format) {
        this.showLockCodeModal(this.entity, action, state.attributes.code_format);
        return;
      }
      // Toggle based on current state - if locked, unlock; otherwise lock
      // Use try/catch to handle locks that require code but don't have code_format
      this.tryLockAction(this.entity, action);
      return;
    }

    // For scenes, activate on card click
    if (domain === 'scene') {
      this._hass.callService('scene', 'turn_on', { entity_id: this.entity });
      return;
    }

    // For scripts, run on card click
    if (domain === 'script') {
      this._hass.callService('script', 'turn_on', { entity_id: this.entity });
      return;
    }

    // Open more-info dialog for other domains
    this.dispatchEvent(
      new CustomEvent('hass-more-info', {
        bubbles: true,
        composed: true,
        detail: { entityId: this.entity },
      })
    );
  }

  private handleIconClick(event: Event) {
    if (!this._hass || !this.entity) return;

    // Prevent the card click from firing
    event.stopPropagation();

    const domain = this.entity.split('.')[0];
    const entityId = this.entity;

    // Handle different domains for icon clicks (toggle behavior)
    switch (domain) {
      case 'light':
      case 'switch':
      case 'fan':
        this._hass.callService(domain, 'toggle', { entity_id: entityId });
        break;
      case 'cover':
        const coverState = this._hass.states[entityId]?.state;
        if (coverState === 'open') {
          this._hass.callService('cover', 'close_cover', { entity_id: entityId });
        } else {
          this._hass.callService('cover', 'open_cover', { entity_id: entityId });
        }
        break;
      case 'lock':
        const lockState = this._hass.states[entityId]?.state;
        const lockAttrs = this._hass.states[entityId]?.attributes;
        // Ignore if in transitional state (locking/unlocking)
        if (lockState === 'locking' || lockState === 'unlocking') {
          break;
        }
        // Determine the action based on current state
        const lockAction = lockState === 'locked' ? 'unlock' : 'lock';
        // If lock requires a code, show modal to enter code
        if (lockAttrs?.code_format) {
          this.showLockCodeModal(entityId, lockAction, lockAttrs.code_format);
          break;
        }
        // Toggle based on current state - if locked, unlock; otherwise lock
        // Use try/catch to handle locks that require code but don't have code_format
        this.tryLockAction(entityId, lockAction);
        break;
      case 'climate':
        // For climate, icon click opens more-info (since it's just showing temperature)
        this.dispatchEvent(
          new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId },
          })
        );
        break;
      case 'water_heater':
        // For water heater, icon click opens more-info (since it's just showing temperature)
        this.dispatchEvent(
          new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId },
          })
        );
        break;
      case 'media_player':
        const mediaState = this._hass.states[entityId]?.state;
        if (mediaState === 'playing') {
          this._hass.callService('media_player', 'media_pause', { entity_id: entityId });
        } else if (mediaState === 'paused') {
          this._hass.callService('media_player', 'media_play', { entity_id: entityId });
        } else {
          this._hass.callService('media_player', 'turn_on', { entity_id: entityId });
        }
        break;
      case 'scene':
        this._hass.callService('scene', 'turn_on', { entity_id: entityId });
        break;
      case 'script':
        this._hass.callService('script', 'turn_on', { entity_id: entityId });
        break;
      case 'button':
        this._hass.callService('button', 'press', { entity_id: entityId });
        break;
      case 'input_button':
        this._hass.callService('input_button', 'press', { entity_id: entityId });
        break;
      case 'input_boolean':
        this._hass.callService('input_boolean', 'toggle', { entity_id: entityId });
        break;
      case 'camera':
        // For cameras, open more-info to show live feed
        this.dispatchEvent(
          new CustomEvent('hass-more-info', {
            bubbles: true,
            composed: true,
            detail: { entityId },
          })
        );
        break;
      default:
        // For unknown domains, icon click toggles if possible, otherwise opens more-info
        if (['binary_sensor', 'sensor'].includes(domain)) {
          // Read-only entities open more-info
          this.dispatchEvent(
            new CustomEvent('hass-more-info', {
              bubbles: true,
              composed: true,
              detail: { entityId },
            })
          );
        } else {
          // Try to toggle
          this._hass.callService('homeassistant', 'toggle', { entity_id: entityId });
        }
    }
  }

  private updateCameraTimestamp() {
    const timestampElement = this.shadowRoot?.querySelector('.camera-timestamp') as HTMLElement;
    if (timestampElement && this.snapshotManager && this.entity) {
      const snapshotData = this.snapshotManager.getSnapshot(this.entity);

      // Only show timestamp if we have actual snapshot data
      if (snapshotData && snapshotData.base64Data && snapshotData.timestamp > 0) {
        const secondsAgo = this.snapshotManager.getSecondsAgo(this.entity);
        timestampElement.textContent = this.formatTimeAgo(secondsAgo);
        timestampElement.style.display = '';
      } else {
        // Hide timestamp until we have real data
        timestampElement.style.display = 'none';
      }
    }
  }

  private formatTimeAgo(secondsAgo: number): string {
    const diffMins = Math.floor(secondsAgo / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (secondsAgo <= 0) {
      return 'now';
    } else if (secondsAgo < 60) {
      return `${secondsAgo}s`;
    } else if (diffMins < 60) {
      return `${diffMins}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else {
      return `${diffDays}d`;
    }
  }

  getCardSize() {
    return 1;
  }

  private handleCameraSnapshotFailed() {
    if (this.cameraSnapshotFailed) return;
    this.cameraSnapshotFailed = true;
    // Clear the query timer to stop retries
    if (this.queryTimer) {
      clearInterval(this.queryTimer);
      this.queryTimer = undefined;
    }
    // Re-render to show "No snapshot available" state
    this.render();
  }

  public pauseCamera() {
    if (this.domain !== 'camera') return;
    if (this.queryTimer) {
      clearInterval(this.queryTimer);
      this.queryTimer = undefined;
    }
  }

  public resumeCamera() {
    if (this.domain !== 'camera' || !this._hass || this.cameraSnapshotFailed) return;
    if (this.queryTimer) return; // already running
    this.refreshCameraSignedUrl();
    this.queryTimer = window.setInterval(() => this.refreshCameraSignedUrl(), 240000);
  }

  public reloadCameraImage() {
    if (this.domain === 'camera' && this.cameraView === 'snapshot' && this._hass) {
      // Clean up existing setup
      this.cleanupCamera();

      // Reinitialize camera with signed URL
      this.initializeCameraWithSignedUrl();
    }
  }

  private showLockCodeModal(entityId: string, action: 'lock' | 'unlock', _codeFormat: string) {
    // Remove any existing modal
    const existingModal = document.querySelector('.lock-code-modal-overlay');
    if (existingModal) {
      existingModal.remove();
    }

    const state = this._hass?.states[entityId];
    const friendlyName = state?.attributes?.friendly_name || entityId.split('.')[1].replace(/_/g, ' ');
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
          <div class="lock-code-title">${friendlyName}</div>
          <div class="lock-code-subtitle">${actionText}</div>
        </div>
        <div class="lock-code-display">
          <div class="lock-code-dot"></div>
          <div class="lock-code-dot"></div>
          <div class="lock-code-dot"></div>
          <div class="lock-code-dot"></div>
          <div class="lock-code-dot"></div>
          <div class="lock-code-dot"></div>
        </div>
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
          <button class="lock-code-key action cancel" data-key="cancel">${cancelText}</button>
          <button class="lock-code-key" data-key="0">0</button>
          <button class="lock-code-key backspace" data-key="backspace">
            <svg viewBox="0 0 24 24"><path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z"/></svg>
          </button>
        </div>
        <div class="lock-code-actions">
          <button class="lock-code-btn lock-code-btn-confirm" disabled>${actionText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    let code = '';
    const maxLength = 6;
    const dots = modalOverlay.querySelectorAll('.lock-code-dot');
    const errorDiv = modalOverlay.querySelector('.lock-code-error') as HTMLElement;
    const confirmBtn = modalOverlay.querySelector('.lock-code-btn-confirm') as HTMLButtonElement;

    const updateDisplay = () => {
      dots.forEach((dot, i) => {
        dot.classList.toggle('filled', i < code.length);
      });
      confirmBtn.disabled = code.length === 0;
    };

    // Close modal function
    const closeModal = () => {
      modalOverlay.style.animation = 'lockModalFadeIn 0.2s ease-out reverse';
      setTimeout(() => modalOverlay.remove(), 150);
    };

    // Handle keypad clicks
    modalOverlay.querySelectorAll('.lock-code-key').forEach((key) => {
      key.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const keyValue = target.dataset.key;
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
      } else if (e.key === 'Backspace') {
        code = code.slice(0, -1);
        updateDisplay();
      } else if (e.key === 'Enter' && code.length > 0) {
        handleConfirm();
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
