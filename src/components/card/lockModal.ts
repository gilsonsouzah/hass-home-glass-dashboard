import { localize } from '../../utils/LocalizationService';
import { escapeHtml } from '../../utils/html';
import { parseCodeFormat } from '../../utils/thermostat';
import { getLockModalStyles } from './styles';

type LockAction = 'lock' | 'unlock';

export function toggleLock(hass: any, entityId: string) {
  const state = hass.states[entityId];
  // Ignore if in transitional state (locking/unlocking)
  if (state?.state === 'locking' || state?.state === 'unlocking') return;

  const action = state?.state === 'locked' ? 'unlock' : 'lock';
  if (state?.attributes?.code_format) {
    showLockCodeModal(hass, entityId, action, state.attributes.code_format);
    return;
  }
  // Locks that require a code without advertising code_format fail here and open the modal
  tryLockAction(hass, entityId, action);
}

function showLockCodeModal(hass: any, entityId: string, action: LockAction, codeFormat: string) {
  const existingModal = document.querySelector('.lock-code-modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }

  const state = hass?.states[entityId];
  const friendlyName = state?.attributes?.friendly_name || entityId.split('.')[1].replace(/_/g, ' ');
  const format = parseCodeFormat(codeFormat);
  const actionText = action === 'unlock' ? localize('lock_modal.unlock') : localize('lock_modal.lock');
  const cancelText = localize('lock_modal.cancel');
  const actionColor = action === 'unlock' ? '#34c759' : '#ff9500';

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'lock-code-modal-overlay';
  modalOverlay.innerHTML = `
    <style>${getLockModalStyles(actionColor)}</style>
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
      await hass?.callService('lock', action, {
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

async function tryLockAction(hass: any, entityId: string, action: LockAction) {
  try {
    await hass?.callService('lock', action, { entity_id: entityId });
  } catch (err: any) {
    const errorStr = String(err?.message || err || '').toLowerCase();
    if (
      errorStr.includes('code') ||
      errorStr.includes('bytes') ||
      errorStr.includes('validation') ||
      errorStr.includes('mismatch')
    ) {
      showLockCodeModal(hass, entityId, action, '^\\d+$');
    } else {
      console.error('Lock action failed:', err);
    }
  }
}
