import { glassCSS } from '../../styles/glass';
import { GLYPH_ON_COLOR } from '../../config/colors';

// Active tiles are near-opaque in both schemes; darkening the system color toward the on-active label keeps large numbers readable on them.
const onTile = (color: string) => `color-mix(in srgb, var(--hg-color-${color}) 80%, var(--hg-label-on-active))`;

export function getCardStyles(): string {
  return `
    ${glassCSS}

    :host {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: var(--hg-radius-tile);
    }

    :host(.regular-design) {
      grid-row: span 1;
    }

    :host(.tall-design) {
      grid-row: span 2;
    }

    .home-glass-card {
      background: var(--card-bg-color);
      color: var(--card-text-color);
      font-family: var(--hg-font);
      border-radius: inherit;
      padding: var(--hg-tile-padding);
      display: flex;
      flex-direction: column;
      transition:
        transform var(--hg-dur-fast) var(--hg-ease-spring),
        background-color var(--hg-dur) var(--hg-ease-standard),
        box-shadow var(--hg-dur) var(--hg-ease-standard),
        color var(--hg-dur) var(--hg-ease-standard),
        opacity var(--hg-dur) var(--hg-ease-standard);
      border: none;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }

    /* The host clips overflow, so the ring sits inside the tile edge */
    .home-glass-card:focus-visible {
      outline-offset: calc(var(--hg-focus-offset) * -1);
    }

    .home-glass-card:has(.chevron-btn:active) {
      transform: none;
    }

    .home-glass-card.unavailable {
      opacity: 0.55;
      box-shadow: none;
    }

    .home-glass-card.unavailable::before {
      display: none;
    }

    @media (hover: hover) {
      .home-glass-card.unavailable:hover {
        box-shadow: none;
      }
    }

    :host(.regular-design) .home-glass-card {
      justify-content: space-between;
    }

    :host(.tall-design) .home-glass-card {
      justify-content: flex-start;
    }

    :host(.tall-design) .home-glass-card.camera-card {
      padding: 0;
    }

    .home-glass-card.edit-mode,
    .home-glass-card.edit-mode .info-icon {
      cursor: default;
    }

    .home-glass-card.edit-mode:active {
      transform: none;
    }

    .card-info {
      margin-top: 0;
      display: flex;
      height: 100%;
    }

    :host(.regular-design) .card-info {
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      gap: var(--hg-card-gap);
    }

    :host(.tall-design) .card-info {
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      gap: var(--hg-card-gap);
    }

    .info-icon {
      width: var(--hg-card-icon-size);
      height: var(--hg-card-icon-size);
      min-width: var(--hg-card-icon-size);
      color: var(--card-icon-color);
      background: var(--card-icon-bg);
      transition:
        color var(--hg-dur) var(--hg-ease-standard),
        background-color var(--hg-dur) var(--hg-ease-standard);
      cursor: pointer;
      flex-shrink: 0;
      border-radius: var(--hg-radius-icon-well);
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }

    .info-icon ha-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      --mdc-icon-size: var(--hg-card-icon-font-size);
    }

    .info-icon.scene-icon {
      background: transparent;
      color: var(--card-text-color);
    }

    .info-icon.scene-icon ha-icon {
      --mdc-icon-size: clamp(24px, 6vw, 32px);
    }

    :host(.regular-design) .info-icon .temperature-text {
      font-size: var(--hg-temp-font-size-regular);
      font-weight: 700;
      color: var(--card-icon-color);
      letter-spacing: -0.02em;
      line-height: 1;
    }

    :host(.tall-design) .info-icon .temperature-text {
      margin: 5px 0;
      font-size: var(--hg-temp-font-size-tall);
      font-weight: 700;
      color: var(--card-icon-color);
      letter-spacing: -0.012em;
      line-height: 1;
    }

    .info-icon.temperature-display {
      background: transparent;
    }

    :host(.tall-design) .info-icon.temperature-display {
      width: auto;
      height: auto;
    }

    .thermostat-top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
    }

    .thermostat-target-temp {
      font-size: var(--hg-temp-font-size-tall);
      font-weight: 700;
      letter-spacing: -0.012em;
      line-height: 1;
    }

    .thermostat-top-row.climate-active .thermostat-target-temp {
      color: ${onTile('blue')};
    }

    .thermostat-top-row.water-heater-active .thermostat-target-temp {
      color: ${onTile('orange')};
    }

    .thermostat-top-row.water-heater-inactive .thermostat-target-temp {
      color: var(--card-text-color);
    }

    .thermostat-controls {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    }

    .chevron-btn {
      position: relative;
      width: 32px;
      height: 32px;
      padding: 0;
      border-radius: var(--hg-radius-icon-well);
      border: none;
      background: var(--hg-fill);
      color: var(--card-text-color);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition:
        transform var(--hg-dur-fast) var(--hg-ease-spring),
        background-color var(--hg-dur) var(--hg-ease-standard);
      -webkit-tap-highlight-color: transparent;
    }

    /* Visual size stays 32px; the hit area grows to the minimum target */
    .chevron-btn::after {
      content: '';
      position: absolute;
      inset: calc((32px - var(--hg-hit-min)) / 2);
    }

    .chevron-btn:hover {
      background: color-mix(in srgb, var(--hg-fill), var(--card-text-color) 10%);
    }

    .chevron-btn:active {
      transform: scale(var(--hg-press-scale));
      background: color-mix(in srgb, var(--hg-fill), var(--card-text-color) 18%);
    }

    .chevron-btn:focus-visible {
      outline: var(--hg-focus-ring);
      outline-offset: var(--hg-focus-offset);
    }

    .chevron-btn ha-icon {
      --mdc-icon-size: 22px;
    }

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

    :host(.regular-design) .text-content {
      justify-content: center;
    }

    :host(.tall-design) .text-content {
      margin-top: auto;
      justify-content: flex-end;
    }

    .entity-name {
      font-size: var(--hg-text-subhead-size);
      font-weight: var(--hg-text-headline-weight);
      line-height: var(--hg-text-subhead-line);
      color: var(--card-text-color);
      margin: 0 0 2px 0;
      word-wrap: break-word;
      word-break: break-word;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      max-height: calc(var(--hg-text-subhead-line) * 2);
    }

    .entity-state {
      font-size: var(--hg-text-footnote-size);
      font-weight: var(--hg-text-footnote-weight);
      line-height: var(--hg-text-footnote-line);
      color: var(--card-state-color);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

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

    :host(.tall-design) .card-info {
      flex-direction: column;
      height: 100%;
      position: relative;
      gap: 0;
    }

    :host(.tall-design) .camera-container {
      flex: 1;
    }

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
      color: ${GLYPH_ON_COLOR};
      z-index: 10;
    }

    .camera-live-indicator {
      font-size: var(--hg-text-caption2-size);
      font-weight: 700;
      color: ${GLYPH_ON_COLOR};
      background: var(--hg-color-red);
      padding: 2px 6px;
      border-radius: var(--hg-radius-chip);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .home-glass-card.rtl .camera-overlay {
      left: auto;
      right: 10px;
    }

    .home-glass-card.rtl .camera-icon-unavailable,
    .home-glass-card.rtl .camera-icon-no-snapshot {
      left: auto;
      right: 10px;
    }

    .home-glass-card.rtl .text-content {
      text-align: right;
      direction: rtl;
    }

    .home-glass-card.rtl .entity-name,
    .home-glass-card.rtl .entity-state {
      text-align: right;
      direction: rtl;
    }

    .home-glass-card.rtl .camera-text {
      left: auto;
      right: 10px;
    }

    .camera-icon-unavailable,
    .camera-icon-no-snapshot,
    .camera-loading {
      color: var(--card-icon-color);
      background: transparent;
      transition:
        color var(--hg-dur) var(--hg-ease-standard),
        opacity var(--hg-dur) var(--hg-ease-standard);
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

    :host(.tall-design) .camera-text {
      margin-top: 0;
      flex: 0 0 auto;
      position: absolute;
      bottom: 10px;
      left: 10px;
      z-index: 2;
    }

    :host(.tall-design) .home-glass-card {
      padding: calc(var(--hg-tile-padding) * 1.1);
    }

    @media (max-width: 359px) {
      .entity-name {
        -webkit-line-clamp: 1;
        max-height: var(--hg-text-subhead-line);
      }
    }
  `;
}

export function getLockModalStyles(actionColor: string): string {
  const keyFill = (mix: number) => `color-mix(in srgb, var(--hg-fill), var(--hg-label) ${mix}%)`;
  return `
  .lock-code-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--hg-glass-dim);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    -webkit-backdrop-filter: var(--hg-backdrop-regular);
    backdrop-filter: var(--hg-backdrop-regular);
    animation: lockModalFadeIn var(--hg-dur) var(--hg-ease-standard);
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
    border-radius: var(--hg-radius-sheet);
    padding: 28px 24px;
    width: 320px;
    max-width: 90vw;
    font-family: var(--hg-font);
    color: var(--hg-label);
    animation: lockModalSlideUp var(--hg-dur-slow) var(--hg-ease-spring);
  }
  .lock-code-header {
    text-align: center;
    margin-bottom: 24px;
  }
  .lock-code-icon {
    width: 56px;
    height: 56px;
    border-radius: var(--hg-radius-icon-well);
    background: ${actionColor};
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
  }
  .lock-code-icon svg {
    width: 28px;
    height: 28px;
    fill: ${GLYPH_ON_COLOR};
  }
  .lock-code-title {
    color: var(--hg-label);
    font-size: var(--hg-text-title3-size);
    line-height: var(--hg-text-title3-line);
    font-weight: var(--hg-text-headline-weight);
    margin-bottom: 4px;
  }
  .lock-code-subtitle {
    color: var(--hg-label-secondary);
    font-size: var(--hg-text-subhead-size);
    line-height: var(--hg-text-subhead-line);
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
    border-radius: var(--hg-radius-icon-well);
    background: var(--hg-label-tertiary);
    transition:
      transform var(--hg-dur-fast) var(--hg-ease-spring),
      background-color var(--hg-dur-fast) var(--hg-ease-standard);
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
    border-radius: var(--hg-radius-control);
    border: 1px solid var(--hg-separator);
    background: var(--hg-fill);
    color: var(--hg-label);
    font-family: inherit;
    font-size: var(--hg-text-body-size);
    text-align: center;
  }
  .lock-code-input:focus-visible {
    outline: var(--hg-focus-ring);
    outline-offset: var(--hg-focus-offset);
  }
  .lock-code-error {
    color: var(--hg-color-red);
    font-size: var(--hg-text-footnote-size);
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
    border-radius: var(--hg-radius-icon-well);
    border: none;
    background: var(--hg-fill);
    color: var(--hg-label);
    font-family: inherit;
    font-size: var(--hg-text-title1-size);
    font-weight: var(--hg-text-title1-weight);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      transform var(--hg-dur-fast) var(--hg-ease-spring),
      background-color var(--hg-dur-fast) var(--hg-ease-standard);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }
  .lock-code-key:hover {
    background: ${keyFill(10)};
  }
  .lock-code-key:active {
    background: ${keyFill(18)};
    transform: scale(var(--hg-press-scale));
  }
  .lock-code-key:focus-visible,
  .lock-code-btn:focus-visible {
    outline: var(--hg-focus-ring);
    outline-offset: var(--hg-focus-offset);
  }
  .lock-code-key.action {
    background: transparent;
    font-size: var(--hg-text-callout-size);
    font-weight: var(--hg-text-headline-weight);
  }
  .lock-code-key.action:hover {
    background: var(--hg-fill);
  }
  .lock-code-key.action.cancel {
    color: var(--hg-label-secondary);
  }
  .lock-code-key.backspace svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
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
    border-radius: var(--hg-radius-chip);
    font-family: inherit;
    font-size: var(--hg-text-headline-size);
    font-weight: var(--hg-text-headline-weight);
    cursor: pointer;
    border: none;
    transition:
      transform var(--hg-dur-fast) var(--hg-ease-spring),
      background-color var(--hg-dur) var(--hg-ease-standard),
      filter var(--hg-dur) var(--hg-ease-standard),
      opacity var(--hg-dur) var(--hg-ease-standard);
  }
  .lock-code-btn-cancel {
    background: var(--hg-fill);
    color: var(--hg-label);
  }
  .lock-code-btn-cancel:hover {
    background: ${keyFill(10)};
  }
  .lock-code-btn-confirm {
    background: ${actionColor};
    color: ${GLYPH_ON_COLOR};
  }
  .lock-code-btn-confirm:hover {
    filter: brightness(1.1);
  }
  .lock-code-btn-confirm:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .lock-code-btn:active {
    transform: scale(var(--hg-press-scale));
  }
  `;
}
