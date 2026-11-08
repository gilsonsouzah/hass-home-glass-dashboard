import { glassCSS } from '../../styles/glass';

// The host lives in document.body, so it inherits the --hg-* tokens from the document root.
export function getQuickControlsStyles(): string {
  return `
    ${glassCSS}

    :host { all: initial; }

    * { box-sizing: border-box; }

    button { font: inherit; color: inherit; }

    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: var(--hg-page-padding);
      background: var(--hg-glass-dim);
      -webkit-backdrop-filter: var(--hg-backdrop-clear);
      backdrop-filter: var(--hg-backdrop-clear);
      font-family: var(--hg-font);
      color: var(--hg-label);
      animation: qcFade var(--hg-dur) var(--hg-ease-standard);
    }

    @media (min-width: 600px) {
      .backdrop { align-items: center; }
    }

    @keyframes qcFade {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes qcRise {
      from { transform: translateY(24px) scale(0.96); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    .sheet {
      width: min(100%, 360px);
      max-height: calc(100dvh - 2 * var(--hg-page-padding));
      overflow-y: auto;
      border-radius: var(--hg-radius-sheet);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      animation: qcRise var(--hg-dur-slow) var(--hg-ease-spring);
    }

    .sheet-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .titles { flex: 1; min-width: 0; }

    h2 {
      margin: 0;
      font-size: var(--hg-text-title3-size);
      line-height: var(--hg-text-title3-line);
      font-weight: var(--hg-text-headline-weight);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sheet-state {
      color: var(--hg-label-secondary);
      font-size: var(--hg-text-subhead-size);
      line-height: var(--hg-text-subhead-line);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .pill, .close-btn, .action-btn, .step-btn, .transport-btn, .swatch, .segmented button, .toggle-row {
      border: none;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      transition:
        transform var(--hg-dur-fast) var(--hg-ease-spring),
        background-color var(--hg-dur) var(--hg-ease-standard),
        color var(--hg-dur) var(--hg-ease-standard),
        box-shadow var(--hg-dur) var(--hg-ease-standard);
    }

    .pill:active, .close-btn:active, .action-btn:active, .step-btn:active, .transport-btn:active, .swatch:active {
      transform: scale(var(--hg-press-scale));
    }

    button:focus-visible, .slider:has(input:focus-visible) {
      outline: var(--hg-focus-ring);
      outline-offset: var(--hg-focus-offset);
    }

    .pill {
      min-height: var(--hg-hit-min);
      padding: 0 16px;
      border-radius: var(--hg-radius-chip);
      background: var(--hg-fill);
      font-size: var(--hg-text-subhead-size);
      font-weight: var(--hg-text-headline-weight);
    }

    .wide-btn { width: 100%; }

    .close-btn {
      width: var(--hg-hit-min);
      height: var(--hg-hit-min);
      border-radius: var(--hg-radius-icon-well);
      background: var(--hg-fill);
      display: flex;
      align-items: center;
      justify-content: center;
      --mdc-icon-size: 20px;
    }

    @media (hover: hover) {
      .pill:hover, .close-btn:hover, .action-btn:hover, .step-btn:hover, .transport-btn:hover {
        background: color-mix(in srgb, var(--hg-fill), var(--hg-label) 12%);
      }
    }

    .sheet-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .slider-block { display: flex; flex-direction: column; gap: 8px; }

    .slider-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      color: var(--hg-label-secondary);
      font-size: var(--hg-text-footnote-size);
      line-height: var(--hg-text-footnote-line);
    }

    output { font-variant-numeric: tabular-nums; }

    .slider {
      --pct: 0%;
      position: relative;
      height: 56px;
      border-radius: var(--hg-radius-tile);
      background: var(--hg-fill);
      overflow: hidden;
      touch-action: none;
    }

    .slider-fill {
      position: absolute;
      inset: 0 auto 0 0;
      width: var(--pct);
      background: var(--hg-fill-active);
      transition: width var(--hg-dur-fast) var(--hg-ease-standard);
    }

    .slider-block.kelvin .slider {
      background: linear-gradient(90deg, var(--hg-color-orange), #ffffff 50%, var(--hg-color-cyan));
    }

    .slider-block.kelvin .slider-fill { background: transparent; }

    .slider input[type="range"] {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      opacity: 0;
      cursor: grab;
    }

    .slider-block.kelvin .slider::after {
      content: '';
      position: absolute;
      top: 6px;
      bottom: 6px;
      left: clamp(10px, var(--pct), calc(100% - 10px));
      width: 4px;
      margin-left: -2px;
      border-radius: var(--hg-radius-chip);
      background: var(--hg-label-on-active);
      box-shadow: 0 0 0 2px var(--hg-fill-active);
      pointer-events: none;
    }

    .slider-block.vertical {
      align-items: center;
    }

    .slider-block.vertical .slider {
      width: 120px;
      height: 220px;
    }

    .slider-block.vertical .slider-fill {
      inset: auto 0 0 0;
      width: auto;
      height: var(--pct);
      transition: height var(--hg-dur-fast) var(--hg-ease-standard);
    }

    .slider-block.vertical .slider input[type="range"] {
      width: 220px;
      height: 120px;
      inset: auto;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-90deg);
    }

    .slider-block.vertical .slider-head {
      gap: 12px;
      color: var(--hg-label);
      font-size: var(--hg-text-title2-size);
      line-height: var(--hg-text-title2-line);
      font-weight: var(--hg-text-headline-weight);
    }

    .slider-block.vertical .slider-head span {
      color: var(--hg-label-secondary);
      font-size: var(--hg-text-footnote-size);
      font-weight: var(--hg-text-footnote-weight);
    }

    .presets {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }

    .swatch {
      width: 32px;
      height: 32px;
      border-radius: var(--hg-radius-icon-well);
      background: var(--swatch);
      position: relative;
    }

    /* Visual size stays 32px; the hit area grows to the minimum target */
    .swatch::after {
      content: '';
      position: absolute;
      inset: calc((32px - var(--hg-hit-min)) / 2);
    }

    .swatch[aria-pressed="true"] {
      box-shadow: 0 0 0 2px var(--hg-glass-thick), 0 0 0 4px var(--hg-label);
    }

    .button-row, .transport {
      display: flex;
      justify-content: center;
      gap: 12px;
    }

    .action-btn {
      flex: 1;
      min-height: var(--hg-hit-min);
      border-radius: var(--hg-radius-control);
      background: var(--hg-fill);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 8px;
      font-size: var(--hg-text-footnote-size);
      --mdc-icon-size: 22px;
    }

    .toggle-row {
      width: 100%;
      min-height: var(--hg-hit-min);
      padding: 0 16px;
      border-radius: var(--hg-radius-control);
      background: var(--hg-fill);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: var(--hg-text-body-size);
      text-align: start;
    }

    .switch {
      position: relative;
      width: 51px;
      height: 31px;
      border-radius: var(--hg-radius-chip);
      background: var(--hg-fill);
      transition: background-color var(--hg-dur) var(--hg-ease-standard);
    }

    .switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 27px;
      height: 27px;
      border-radius: var(--hg-radius-icon-well);
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      transition: transform var(--hg-dur) var(--hg-ease-spring);
    }

    .toggle-row[aria-checked="true"] .switch { background: var(--hg-color-green); }
    .toggle-row[aria-checked="true"] .switch::after { transform: translateX(20px); }

    .stepper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .stepper-value {
      flex: 1;
      text-align: center;
      font-size: var(--hg-text-large-title-size);
      line-height: var(--hg-text-large-title-line);
      font-weight: var(--hg-text-large-title-weight);
      font-variant-numeric: tabular-nums;
    }

    .step-btn, .transport-btn {
      width: 56px;
      height: 56px;
      border-radius: var(--hg-radius-icon-well);
      background: var(--hg-fill);
      display: flex;
      align-items: center;
      justify-content: center;
      --mdc-icon-size: 26px;
    }

    .transport-btn.primary {
      background: var(--hg-fill-active);
      color: var(--hg-label-on-active);
    }

    .segmented {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
      padding: 2px;
      border-radius: var(--hg-radius-control);
      background: var(--hg-fill);
    }

    .segmented button {
      flex: 1 1 auto;
      min-height: 40px;
      padding: 0 10px;
      border-radius: calc(var(--hg-radius-control) - 2px);
      background: transparent;
      font-size: var(--hg-text-footnote-size);
      font-weight: var(--hg-text-headline-weight);
      color: var(--hg-label-secondary);
    }

    .segmented button[aria-pressed="true"] {
      background: var(--hg-fill-active);
      color: var(--hg-label-on-active);
    }
  `;
}
