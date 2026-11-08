export const SETTINGS_STYLE_ID = 'hg-settings-styles';

export const SETTINGS_CSS = `
.hg-settings-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.hg-settings-modal.show {
  opacity: 1;
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.modal-content {
  position: relative;
  width: 700px;
  max-width: 90vw;
  max-height: 85vh;
  background: rgba(28, 28, 30, 1);
  border-radius: var(--apple-modal-radius, 20px);
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  transform: scale(0.9);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.hg-settings-modal.show .modal-content {
  transform: scale(1);
  opacity: 1;
}

.modal-header {
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.modal-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: -30px;
  background: linear-gradient(
    to bottom,
    rgba(28, 28, 30, 1) 0%,
    rgba(28, 28, 30, 0.95) 30%,
    rgba(28, 28, 30, 0.7) 60%,
    rgba(28, 28, 30, 0) 100%
  );
  z-index: -1;
  pointer-events: none;
}

.modal-header h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: white;
  text-align: center;
  flex: 1;
}

/* Modal-specific button positioning */
.modal-header .modal-cancel,
.modal-header .modal-done {
  z-index: 2;
}

.modal-body {
  padding: 0;
  padding-bottom: 20px;
}

.settings-section {
  padding: 10px 20px;
  position: relative;
  overflow: visible;
  min-width: 0;
  max-width: 100%;
}

.settings-section:last-child {
  border-bottom: none;
}

.settings-section-header {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
}
.settings-section-description {
  margin: 8px 0 0 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

.settings-card {
  background: rgba(44, 44, 46, 0.6);
  border-radius: var(--apple-input-radius, 10px);
  padding: 0 16px 16px 16px;
  position: relative;
  overflow: visible;
}

.settings-card.switch-card {
  padding: 0 16px;
}


.switch-setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
  min-height: 50px;
}


.settings-section-content {
  position: relative;
  overflow: visible;
}

.entity-selector {
  position: relative;
  overflow: visible;
  min-width: 0;
  max-width: 100%;
}

.autocomplete-container {
  position: relative;
  margin-bottom: 0;
  overflow: visible;
  min-width: 0;
  max-width: 100%;
}

.autocomplete-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 16px;
  background: rgba(39, 39, 39, 0.8);
  border: 1px solid rgba(84, 84, 88, 0.8);
  border-radius: var(--apple-input-radius, 10px);
  color: white;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;
  margin-top: 16px;
}

.autocomplete-input:focus {
  border-color: #ffaf00;
}

.autocomplete-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.autocomplete-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgba(44, 44, 46, 0.95);
  border: 1px solid rgba(84, 84, 88, 0.8);
  border-radius: var(--apple-input-radius, 10px);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  display: none;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  min-width: 200px;
}

.autocomplete-results.show {
  display: block;
}

.autocomplete-result {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 0.5px solid rgba(84, 84, 88, 0.2);
  transition: background 0.2s ease;
}

.autocomplete-result:last-child {
  border-bottom: none;
}

.autocomplete-result:hover {
  background: rgba(84, 84, 88, 0.3);
}

.autocomplete-result-name {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.autocomplete-result-id {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin-top: 2px;
}

.selected-entities {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 0;
  padding: 0;
  transition: all 0.3s ease;
}

.selected-entities:has(div) {
  margin-top: 16px;
}

.selected-entity-chip {
  display: flex;
  align-items: center;
  background: rgba(255, 175, 0, 0.2);
  border: 1px solid rgba(255, 175, 0, 0.4);
  border-radius: var(--apple-card-radius, 25px);
  padding: 6px 6px 6px 14px;
  gap: 8px;
  transition: all 0.2s ease;
}

.selected-entity-chip:hover {
  background: rgba(255, 175, 0, 0.3);
}

.entity-name {
  color: white;
  font-size: 13px;
  font-weight: 500;
}

.remove-entity {
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  width: 16px;
  height: 16px;
  --mdc-icon-size: 16px;
  transition: color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-entity:hover {
  color: white;
}

@media (max-width: 480px) {
  .hg-settings-modal {
    align-items: flex-end;
    justify-content: center;
  }

  .modal-content {
    width: 100vw;
    height: calc(100dvh - env(safe-area-inset-top) - 20px);
    max-width: 100vw;
    max-height: calc(100dvh - env(safe-area-inset-top) - 20px);
    border-radius: var(--apple-modal-radius, 20px) var(--apple-modal-radius, 20px) 0 0;
    transform: translateY(100%);
    opacity: 1;
    margin: 0;
  }

  .hg-settings-modal.show .modal-content {
    transform: translateY(0);
    opacity: 1;
  }

  .settings-section {
    padding: 16px;
  }
}

/* Extra small / accessibility screens */
@media (max-width: 359px) {
  .modal-content {
    height: calc(100dvh - env(safe-area-inset-top) - 10px);
  }

  .modal-header h2 {
    font-size: 16px;
  }

  .settings-section {
    padding: 12px;
  }

  .setting-item-description {
    font-size: 12px;
  }

  .option-text {
    font-size: 15px;
  }

  .wallpaper-preview-image {
    width: 100px;
    height: 160px;
  }
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .modal-content,
  .selected-entities,
  .selected-entity-chip,
  .ui-setting-toggle,
  .toggle-switch {
    transition: none !important;
  }
}

/* Background Settings Styles */
.wallpaper-options {
  margin-bottom: 24px;
}

.wallpaper-option-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(84, 84, 88, 0.8);
  cursor: pointer;
  transition: background-color 0.2s ease;
  height: 25px;
}
.wallpaper-option-row:last-child {
  margin-bottom: 0;
}

.option-text {
  font-size: 17px;
  font-weight: 400;
  color: #ffffff;
}

.upload-text {
  color: #FF9500;
}

.option-arrow {
  --mdc-icon-size: 30px;
  color: rgba(255, 255, 255, 0.5);
}

.current-wallpaper-preview {
  display: flex;
  justify-content: center;
}

.wallpaper-preview-image {
  width: 120px;
  height: 200px;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* iOS 26 Flat Toggle Switch */
.ui-setting-toggle {
  width: 51px;
  height: 22px;
  background: rgba(60, 60, 67, 0.45);
  border-radius: 11px;
  position: relative;
  transition: background-color 0.25s ease;
  cursor: pointer;
  border: none;
  outline: none;
}

.ui-setting-toggle.active {
  background: #30D158;
}

.toggle-switch {
  width: 27px;
  height: 18px;
  background: white;
  border-radius: 9px;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.ui-setting-toggle.active .toggle-switch {
  transform: translateX(20px);
}

/* Loading state styles */
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
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.hg-settings-modal.saving .modal-done ha-icon {
  display: none;
}

.hg-settings-modal.saving .modal-done .save-spinner {
  display: block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

export const PRESETS_STYLE_ID = 'presets-modal-styles';

export const PRESETS_CSS = `
.presets-selection-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10001;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.presets-selection-modal.show {
  opacity: 1;
}

.presets-selection-modal .modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.presets-content {
  position: relative;
  width: 700px;
  max-width: 90vw;
  max-height: 85vh;
  background: rgba(28, 28, 30, 1);
  border-radius: var(--apple-modal-radius, 20px);
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  transform: scale(0.9);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.presets-selection-modal.show .presets-content {
  transform: scale(1);
  opacity: 1;
}

.presets-content .modal-header {
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.presets-content .modal-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: -30px;
  background: linear-gradient(
    to bottom,
    rgba(28, 28, 30, 1) 0%,
    rgba(28, 28, 30, 0.95) 30%,
    rgba(28, 28, 30, 0.7) 60%,
    rgba(28, 28, 30, 0) 100%
  );
  z-index: -1;
  pointer-events: none;
}

.presets-content .modal-header h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: white;
  text-align: center;
  flex: 1;
}

.presets-content .modal-body {
  padding: 20px;
  padding-bottom: 20px;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  padding: 0;
}

.preset-option {
  cursor: pointer;
  border-radius: var(--apple-card-radius, 25px);
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
  border: 2px solid transparent;
  position: relative;
}

.preset-option:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.preset-option.selected {
  border-color: #ffaf00;
  background: rgba(255, 175, 0, 0.1);
}

.preset-option.selected::after {
  content: '✓';
  position: absolute;
  top: 8px;
  right: 8px;
  background: #ffaf00;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.preset-preview {
  width: 100%;
  height: 100px;
  border-radius: var(--apple-input-radius, 10px);
  background-size: cover !important;
  background-position: center !important;
  margin-bottom: 8px;
  position: relative;
  overflow: hidden;
}

.preset-name {
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}

/* Presets modal button positioning */
.presets-content .modal-cancel,
.presets-content .modal-done {
  z-index: 2;
}

@media (max-width: 480px) {
  .presets-selection-modal {
    align-items: flex-end;
    justify-content: center;
  }

  .presets-content {
    width: 100vw;
    height: calc(100dvh - env(safe-area-inset-top) - 20px);
    max-width: 100vw;
    max-height: calc(100dvh - env(safe-area-inset-top) - 20px);
    border-radius: var(--apple-modal-radius, 20px) var(--apple-modal-radius, 20px) 0 0;
    transform: translateY(100%);
    opacity: 1;
    margin: 0;
  }

  .presets-selection-modal.show .presets-content {
    transform: translateY(0);
    opacity: 1;
  }
}
`;
