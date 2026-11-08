export const SETTINGS_STYLE_ID = 'hg-settings-styles';

const sheetCSS = (modal: string, content: string, zIndex: number) => `
${modal} {
  position: fixed;
  inset: 0;
  z-index: ${zIndex};
  font-family: var(--hg-font);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--hg-dur) var(--hg-ease-standard);
}

${modal}.show {
  opacity: 1;
}

${modal} .modal-backdrop {
  position: absolute;
  inset: 0;
  background: var(--hg-glass-dim);
  -webkit-backdrop-filter: var(--hg-backdrop-clear);
  backdrop-filter: var(--hg-backdrop-clear);
}

${content} {
  position: relative;
  width: 700px;
  max-width: 90vw;
  max-height: 85vh;
  border-radius: var(--hg-radius-sheet);
  overflow-y: auto;
  overflow-x: hidden;
  color: var(--hg-label);
  transform: scale(0.94);
  opacity: 0;
  transition:
    transform var(--hg-dur) var(--hg-ease-spring),
    opacity var(--hg-dur) var(--hg-ease-standard);
}

${modal}.show ${content} {
  transform: scale(1);
  opacity: 1;
}

${modal} .modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--hg-glass-thick);
  -webkit-backdrop-filter: var(--hg-backdrop-thick);
  backdrop-filter: var(--hg-backdrop-thick);
  border-bottom: 1px solid var(--hg-separator);
}

${modal} .modal-header h2 {
  margin: 0;
  font-size: var(--hg-text-headline-size);
  line-height: var(--hg-text-headline-line);
  font-weight: var(--hg-text-headline-weight);
  color: var(--hg-label);
  text-align: center;
  flex: 1;
}

${modal} .modal-header .modal-cancel,
${modal} .modal-header .modal-done {
  z-index: 2;
  width: var(--hg-hit-min) !important;
  height: var(--hg-hit-min) !important;
  min-width: var(--hg-hit-min) !important;
}

@media (max-width: 480px) {
  ${modal} {
    align-items: flex-end;
  }

  ${content} {
    width: 100vw;
    height: calc(100dvh - env(safe-area-inset-top) - 20px);
    max-width: 100vw;
    max-height: calc(100dvh - env(safe-area-inset-top) - 20px);
    border-radius: var(--hg-radius-sheet) var(--hg-radius-sheet) 0 0;
    transform: translateY(100%);
    opacity: 1;
  }

  ${modal}.show ${content} {
    transform: translateY(0);
  }
}
`;

export const SETTINGS_CSS = `${sheetCSS('.hg-settings-modal', '.hg-settings-modal .modal-content', 10000)}
.hg-settings-modal .modal-body {
  padding: 0 0 20px;
}

.settings-section {
  padding: 10px 20px;
  position: relative;
  min-width: 0;
  max-width: 100%;
}

.settings-section-header {
  margin: 0 0 6px;
  padding-inline: 16px;
  font-size: var(--hg-text-footnote-size);
  line-height: var(--hg-text-footnote-line);
  font-weight: var(--hg-text-footnote-weight);
  text-transform: uppercase;
  color: var(--hg-label-secondary);
}

.settings-section-description {
  margin: 6px 0 0;
  padding-inline: 16px;
  font-size: var(--hg-text-footnote-size);
  line-height: var(--hg-text-footnote-line);
  color: var(--hg-label-secondary);
}

.settings-card {
  background: var(--hg-fill);
  border-radius: var(--hg-radius-control);
  padding: 0 16px 16px;
  position: relative;
}

.settings-card.switch-card {
  padding: 0 16px;
}

.switch-setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: var(--hg-hit-min);
}

.entity-selector,
.autocomplete-container {
  position: relative;
  min-width: 0;
  max-width: 100%;
}

.autocomplete-input {
  width: 100%;
  box-sizing: border-box;
  min-height: var(--hg-hit-min);
  padding: 0 16px;
  margin-top: 16px;
  background: var(--hg-fill);
  border: 1px solid var(--hg-separator);
  border-radius: var(--hg-radius-control);
  color: var(--hg-label);
  font: inherit;
  font-size: var(--hg-text-body-size);
  outline: none;
  transition: border-color var(--hg-dur-fast) var(--hg-ease-standard);
}

.autocomplete-input:focus-visible {
  border-color: var(--hg-color-blue);
  outline: var(--hg-focus-ring);
  outline-offset: calc(-1 * var(--hg-focus-offset));
}

.autocomplete-input::placeholder {
  color: var(--hg-label-tertiary);
}

.autocomplete-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--hg-glass-thick);
  border: 1px solid var(--hg-separator);
  border-radius: var(--hg-radius-control);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  display: none;
  box-shadow: var(--hg-shadow-float);
  -webkit-backdrop-filter: var(--hg-backdrop-thick);
  backdrop-filter: var(--hg-backdrop-thick);
  min-width: 200px;
}

.autocomplete-results.show {
  display: block;
}

.autocomplete-result {
  padding: 10px 16px;
  min-height: var(--hg-hit-min);
  box-sizing: border-box;
  cursor: pointer;
  border-bottom: 1px solid var(--hg-separator);
  transition: background-color var(--hg-dur-fast) var(--hg-ease-standard);
}

.autocomplete-result:last-child {
  border-bottom: none;
}

@media (hover: hover) {
  .autocomplete-result:hover {
    background: var(--hg-fill);
  }
}

.autocomplete-result-name {
  color: var(--hg-label);
  font-size: var(--hg-text-subhead-size);
  line-height: var(--hg-text-subhead-line);
}

.autocomplete-result-id {
  color: var(--hg-label-secondary);
  font-size: var(--hg-text-caption1-size);
  line-height: var(--hg-text-caption1-line);
  margin-top: 2px;
}

.selected-entities {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-entities:has(div) {
  margin-top: 16px;
}

.selected-entity-chip {
  display: flex;
  align-items: center;
  background: var(--hg-fill);
  border-radius: var(--hg-radius-chip);
  padding: 4px 4px 4px 14px;
  gap: 4px;
  transition: background-color var(--hg-dur-fast) var(--hg-ease-standard);
}

.entity-name {
  color: var(--hg-label);
  font-size: var(--hg-text-footnote-size);
  line-height: var(--hg-text-footnote-line);
  font-weight: 600;
}

.remove-entity {
  color: var(--hg-label-secondary);
  cursor: pointer;
  width: var(--hg-hit-min);
  height: 32px;
  margin-block: -4px;
  --mdc-icon-size: 16px;
  transition: color var(--hg-dur-fast) var(--hg-ease-standard);
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-entity:hover {
  color: var(--hg-label);
}

.remove-entity:focus-visible,
.wallpaper-option-row:focus-visible,
.ui-setting-toggle:focus-visible,
.preset-option:focus-visible {
  outline: var(--hg-focus-ring);
  outline-offset: var(--hg-focus-offset);
}

.wallpaper-options {
  margin-bottom: 16px;
}

.wallpaper-option-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: var(--hg-hit-min);
  border-bottom: 1px solid var(--hg-separator);
  cursor: pointer;
}

.wallpaper-option-row:last-child {
  border-bottom: none;
}

.option-text {
  font-size: var(--hg-text-body-size);
  line-height: var(--hg-text-body-line);
  color: var(--hg-label);
}

.upload-text {
  color: var(--hg-color-blue);
}

.option-arrow {
  --mdc-icon-size: 24px;
  color: var(--hg-label-tertiary);
}

.current-wallpaper-preview {
  display: flex;
  justify-content: center;
}

.wallpaper-preview-image {
  width: 120px;
  height: 200px;
  border-radius: var(--hg-radius-control);
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  box-shadow: inset 0 0 0 1px var(--hg-separator);
}

.ui-setting-toggle {
  flex: none;
  width: 51px;
  height: 31px;
  background: var(--hg-fill);
  border-radius: 999px;
  position: relative;
  cursor: pointer;
  transition: background-color var(--hg-dur) var(--hg-ease-standard);
}

.ui-setting-toggle.active {
  background: var(--hg-color-green);
}

.toggle-switch {
  width: 27px;
  height: 27px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform var(--hg-dur) var(--hg-ease-spring);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
}

.ui-setting-toggle:active .toggle-switch {
  width: 33px;
}

.ui-setting-toggle.active .toggle-switch {
  transform: translateX(20px);
}

.ui-setting-toggle.active:active .toggle-switch {
  transform: translateX(14px);
}

.hg-settings-modal.saving .modal-content {
  pointer-events: none;
}

.hg-settings-modal.saving .modal-done,
.hg-settings-modal.saving .modal-cancel {
  pointer-events: none;
  opacity: 0.5;
}

.modal-done .save-spinner {
  display: none;
  width: 18px;
  height: 18px;
  border: 2px solid var(--hg-fill);
  border-top-color: var(--hg-label-on-active);
  border-radius: 50%;
  animation: hg-spin 0.8s linear infinite;
}

.hg-settings-modal.saving .modal-done ha-icon {
  display: none;
}

.hg-settings-modal.saving .modal-done .save-spinner {
  display: block;
}

@keyframes hg-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 480px) {
  .settings-section {
    padding: 16px;
  }
}

@media (max-width: 359px) {
  .settings-section {
    padding: 12px;
  }

  .wallpaper-preview-image {
    width: 100px;
    height: 160px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hg-settings-modal.saving .modal-done .save-spinner {
    animation: none;
  }
}
`;

export const PRESETS_STYLE_ID = 'presets-modal-styles';

export const PRESETS_CSS = `${sheetCSS('.presets-selection-modal', '.presets-selection-modal .presets-content', 10001)}
.presets-content .modal-body {
  padding: 20px;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.preset-option {
  cursor: pointer;
  border-radius: var(--hg-radius-control);
  padding: var(--hg-tile-padding);
  background: var(--hg-fill);
  box-shadow: inset 0 0 0 2px transparent;
  position: relative;
  transition:
    transform var(--hg-dur-fast) var(--hg-ease-spring),
    background-color var(--hg-dur) var(--hg-ease-standard),
    box-shadow var(--hg-dur) var(--hg-ease-standard);
}

.preset-option:active {
  transform: scale(var(--hg-press-scale));
}

.preset-option.selected {
  box-shadow: inset 0 0 0 2px var(--hg-color-blue);
}

.preset-option.selected::after {
  content: '✓';
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--hg-color-blue);
  color: #fff;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--hg-text-caption1-size);
  font-weight: 700;
}

.preset-preview {
  width: 100%;
  height: 100px;
  border-radius: var(--hg-radius-inner);
  background-size: cover !important;
  background-position: center !important;
  margin-bottom: 8px;
  position: relative;
  overflow: hidden;
}

.preset-name {
  text-align: center;
  font-size: var(--hg-text-subhead-size);
  line-height: var(--hg-text-subhead-line);
  font-weight: 600;
  color: var(--hg-label);
}

.preset-phase {
  text-align: center;
  font-size: var(--hg-text-caption1-size);
  line-height: var(--hg-text-caption1-line);
  color: var(--hg-label-secondary);
}
`;
