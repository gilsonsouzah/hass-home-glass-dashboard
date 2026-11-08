import { injectLiquidGlassStyles } from '../LiquidGlassStyles';

export function injectSectionReorderStyles(): void {
  injectLiquidGlassStyles();

  if (document.querySelector('#apple-section-reorder-styles')) return;

  const style = document.createElement('style');
  style.id = 'apple-section-reorder-styles';
  style.textContent = `
      .apple-section-reorder-modal {
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
        width: 600px;
        max-width: 90vw;
        max-height: 80vh;
        background: var(--hg-glass-thick, rgba(28, 28, 30, 1));
        border-radius: var(--hg-radius-sheet, 28px);
        overflow-y: auto;
        overflow-x: hidden;
        box-shadow: var(--hg-shadow-sheet, 0 20px 40px rgba(0, 0, 0, 0.35));
        transform: scale(0.9);
        opacity: 0;
        transition: transform var(--hg-dur, 250ms) var(--hg-ease-spring, ease), opacity var(--hg-dur, 250ms) var(--hg-ease-standard, ease);
      }

      .apple-section-reorder-modal.show .modal-content {
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
        position: relative;
        z-index: 2;
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

      .sections-list {
        padding: 0;
        border-radius: var(--apple-input-radius, 10px) !important;
        overflow: hidden;
        margin: 15px;
      }

      .section-item {
        display: flex;
        align-items: center;
        padding: 6px 12px;
        border-bottom: 0.5px solid rgba(84, 84, 88, 0.8);
        background: rgb(39 39 39 / 80%);
        user-select: none;
        -webkit-user-select: none;
        transition: background 0.2s ease;
      }

      .section-item:last-child {
        border-bottom: none;
      }

      .section-item.dragging {
        background: rgba(44, 44, 46, 1);
        transform: scale(1.02);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1000;
      }

      .section-item.drag-over {
        border-top: 2px solid #ffaf00;
      }

      .section-drag-handle {
        color: #858585;
        cursor: grab;
        padding: 8px;
        margin: -8px;
        touch-action: none;
      }

      .section-drag-handle:active {
        cursor: grabbing;
      }

      .section-drag-handle * {
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
      }

      .section-info {
        flex: 1;
        min-width: 0;
      }

      .section-name {
        color: white;
        font-size: 14px;
        font-weight: 500;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .section-visibility-toggle {
        background: none;
        border: none;
        color: #ffffff;
        cursor: pointer;
        border-radius: 16px;
        transition: background-color var(--hg-dur-fast, 150ms) var(--hg-ease-standard, ease), color var(--hg-dur-fast, 150ms) var(--hg-ease-standard, ease), transform var(--hg-dur-fast, 150ms) var(--hg-ease-standard, ease);
        margin-right: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
      }

      .section-visibility-toggle * {
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
      }

      .section-visibility-toggle.hidden {
        color: #ffffff80;
      }

      .section-item.hidden {
        opacity: 0.6;
      }

      .section-item.hidden .section-name {
        color: #ffffff;
      }

      /* RTL Support - Only fix eye icon margin */
      .apple-section-reorder-modal.rtl .section-visibility-toggle {
        margin-right: 0;
        margin-left: 12px;
      }

      /* Sortable.js ghost (dragged item) */
      .sortable-ghost {
        opacity: 0 !important;
      }

      /* Sortable.js chosen class (when item is selected but not yet dragged) */
      .apple-section-reorder-modal .section-item.sortable-chosen,
      .sections-list .section-item.sortable-chosen {
        background: rgba(50, 50, 52, 1) !important;
      }

      /* Sortable.js drag class (actual dragged element) - use highly specific selector to override global styles from DragAndDropManager */
      .apple-section-reorder-modal .sections-list .section-item.sortable-drag,
      .apple-section-reorder-modal .section-item.sortable-drag,
      .sections-list .section-item.sortable-drag {
        opacity: 1 !important;
        visibility: visible !important;
        display: flex !important;
        background: rgba(58, 58, 60, 1) !important;
        transform: scale(1.02) !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
        z-index: 10000 !important;
        border-radius: 10px !important;
      }

      /* Sortable.js fallback class (fallback dragged element) */
      .apple-section-reorder-modal .section-item.sortable-fallback,
      .sortable-fallback {
        opacity: 1 !important;
        visibility: visible !important;
        display: flex !important;
      }

      @media (max-width: 480px) {
        .apple-section-reorder-modal {
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

        .apple-section-reorder-modal.show .modal-content {
          transform: translateY(0);
          opacity: 1;
        }

        .section-item {
          padding: 16px 20px;
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

        .section-item {
          padding: 14px 16px;
        }

        .section-name {
          font-size: 15px;
        }

        .section-visibility-toggle {
          width: 32px;
          height: 32px;
        }

        .section-visibility-toggle ha-icon {
          --mdc-icon-size: 20px;
        }
      }

      /* Reduce motion for accessibility */
      @media (prefers-reduced-motion: reduce) {
        .modal-content,
        .section-item,
        .sortable-drag,
        .save-spinner {
          transition: none !important;
          animation: none !important;
        }
      }

      /* Loading state styles */
      .apple-section-reorder-modal.saving .modal-content {
        pointer-events: none;
      }

      .apple-section-reorder-modal.saving .modal-done,
      .apple-section-reorder-modal.saving .modal-cancel {
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

      .apple-section-reorder-modal.saving .modal-done ha-icon {
        display: none;
      }

      .apple-section-reorder-modal.saving .modal-done .save-spinner {
        display: block;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
  `;
  document.head.appendChild(style);
}
