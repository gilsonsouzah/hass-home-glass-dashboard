import { BackgroundManager } from '../utils/BackgroundManager';
import { localize } from '../utils/LocalizationService';
import { LiquidGlassClasses } from '../utils/LiquidGlassStyles';
import type { HomeSettingsData } from './settingsData';
import { PRESETS_CSS, PRESETS_STYLE_ID } from './settingsStyles';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const formatPresetName = (presetName: string): string =>
  localize(`wallpaper_presets.${presetName}`, presetName.charAt(0).toUpperCase() + presetName.slice(1));

export function updateWallpaperPreview(modal: HTMLElement | undefined, temp: HomeSettingsData): void {
  const previewElement = modal?.querySelector('#current-wallpaper-preview') as HTMLElement;
  if (!previewElement) return;

  let backgroundStyle: string;
  if (temp.backgroundType === 'custom' && temp.customBackground) {
    backgroundStyle = temp.customBackground;
  } else if (temp.backgroundType === 'preset' && temp.presetBackground) {
    backgroundStyle = BackgroundManager.getPresetBackground(temp.presetBackground);
  } else {
    backgroundStyle = BackgroundManager.getDefaultBackground();
  }

  previewElement.style.removeProperty('background');
  previewElement.style.removeProperty('background-image');
  previewElement.style.setProperty(backgroundStyle.startsWith('url(') ? 'background-image' : 'background', backgroundStyle);
}

export async function applyUploadedWallpaper(file: File, temp: HomeSettingsData): Promise<boolean> {
  if (!file || !file.type.startsWith('image/')) {
    alert(localize('errors.invalid_image'));
    return false;
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    alert(localize('errors.file_size_limit'));
    return false;
  }

  try {
    temp.customBackground = await BackgroundManager.imageToDataUrl(file);
    temp.backgroundType = 'custom';
    return true;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    alert(localize('errors.image_processing'));
    return false;
  }
}

function ensurePresetStyles(): void {
  if (document.querySelector(`#${PRESETS_STYLE_ID}`)) return;

  const style = document.createElement('style');
  style.id = PRESETS_STYLE_ID;
  style.textContent = PRESETS_CSS;
  document.head.appendChild(style);
}

function closePresetsModal(presetsModal: HTMLElement): void {
  presetsModal.classList.remove('show');

  setTimeout(() => {
    presetsModal.parentNode?.removeChild(presetsModal);
    document.querySelector(`#${PRESETS_STYLE_ID}`)?.remove();
  }, 300);
}

/** Opens the preset grid. Selections write into `temp` right away; cancel restores the previous values. */
export function openPresetsView(temp: HomeSettingsData, onChange: () => void): void {
  const presetsModal = document.createElement('div');
  presetsModal.className = 'presets-selection-modal';

  presetsModal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content presets-content">
        <div class="modal-header">
          <button class="modal-cancel ${LiquidGlassClasses.modalCancel}">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
          <h2>${localize('ui_actions.choose_wallpaper')}</h2>
          <button class="modal-done ${LiquidGlassClasses.modalDone}">
            <ha-icon icon="mdi:check"></ha-icon>
          </button>
        </div>
        <div class="modal-body">
          <div class="presets-grid">
            ${BackgroundManager.getPresetNames().map(presetName => `
              <div class="preset-option ${temp.backgroundType === 'preset' && temp.presetBackground === presetName ? 'selected' : ''}"
                   data-preset="${presetName}">
                <div class="preset-preview" style="background: ${BackgroundManager.getPresetBackground(presetName)}"></div>
                <div class="preset-name">${formatPresetName(presetName)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

  ensurePresetStyles();
  document.body.appendChild(presetsModal);

  const original = {
    backgroundType: temp.backgroundType,
    presetBackground: temp.presetBackground,
    customBackground: temp.customBackground,
  };

  const revert = () => {
    Object.assign(temp, original);
    onChange();
    closePresetsModal(presetsModal);
  };

  presetsModal.querySelector('.modal-cancel')?.addEventListener('click', revert);
  presetsModal.querySelector('.modal-backdrop')?.addEventListener('click', revert);
  presetsModal.querySelector('.modal-done')?.addEventListener('click', () => {
    onChange();
    closePresetsModal(presetsModal);
  });

  // Selecting does not close: the checkmark confirms.
  presetsModal.querySelectorAll('.preset-option').forEach((option) => {
    option.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const preset = target.dataset.preset;
      if (!preset) return;

      temp.backgroundType = 'preset';
      temp.presetBackground = preset;

      presetsModal.querySelectorAll('.preset-option').forEach((opt) => opt.classList.remove('selected'));
      target.classList.add('selected');
      onChange();
    });
  });

  requestAnimationFrame(() => presetsModal.classList.add('show'));
}
