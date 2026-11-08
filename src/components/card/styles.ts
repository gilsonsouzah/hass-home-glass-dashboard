export function getCardStyles(entityData: { textColor: string }): string {
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

export function getLockModalStyles(actionColor: string): string {
  return `
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
  `;
}
