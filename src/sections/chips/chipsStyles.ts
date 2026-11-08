export const chipsStyles = (mediaActiveIconColor: string) => `
:host {
  --media-active-icon-color: ${mediaActiveIconColor};
  --chip-background-color: var(--apple-chip-bg-inactive, rgba(56, 56, 56, 0.46));
}

/* Match StatusSection structure exactly */
.apple-chips-section {
  display: block;
  margin-top: 8px;
  width: 100%;
}

/* Use identical structure as status-carousel-container */
.chips-carousel-container {
  overflow-x: auto;
  overflow-y: hidden;
  margin-inline-start: calc(-1 * var(--apple-page-padding, 22px));
  margin-inline-end: calc(-1 * var(--apple-page-padding, 22px));
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chips-carousel-container::-webkit-scrollbar {
  display: none;
}

.chips-grid {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  padding-inline-start: var(--apple-page-padding, 22px);
  padding-inline-end: var(--apple-page-padding, 22px);
  min-width: 100%;
  box-sizing: border-box;
  height: 44px;
}

/* RTL support */
.chips-carousel-container.rtl {
  direction: rtl;
}

.chips-carousel-container.ltr {
  direction: ltr;
}

/* Chip drag placeholder styling */

.chip-wrapper {
  flex-shrink: 0;
  position: relative;
}

.chip-wrapper.edit-mode {
  animation: hg-shake 1.3s ease-in-out infinite;
  touch-action: none;
}

/* Drag placeholder for chip wrappers */
.chip-wrapper.drag-placeholder {
  background: transparent !important;
  border: none !important;
  opacity: 1;
  pointer-events: none;
  /* Keep the same size as the original chip to maintain layout */
  display: flex;
  align-items: center;
  min-height: var(--apple-chip-height, 32px);
}

.chip {
  display: flex;
  align-items: center;
  gap: var(--apple-chip-gap, 6px);
  padding: var(--apple-chip-padding, 3px 16px 3px 8px);
  border-radius: 50px;
  background: var(--chip-background-color);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  cursor: pointer;
  transition: background-color 0.2s ease, opacity 0.2s ease;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  min-height: var(--apple-chip-height, 32px);
  white-space: nowrap;
  position: relative; /* Ensure proper positioning during drag */
}

/* RTL chips - swap left/right padding */
.chips-carousel-container.rtl .chip {
  padding: 3px 8px 3px 16px;
}

/* Ensure chips maintain their position during drag operations */
.chip-wrapper:not(.dragging) {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chip-wrapper.dragging {
  /* Dragging styles are applied via inline styles in DragAndDropManager */
  animation: none !important; /* Disable shake animation during drag */
}

.chip.active {
  background: var(--apple-chip-bg-active, rgba(255, 255, 255, 0.9)) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.chip.active .chip-group-name {
  color: var(--apple-text-active, #1f1f1f) !important;
}

.chip.active .chip-status {
  color: rgba(31, 31, 31, 0.7) !important;
}

/* Active media chip icon color */
.chip.active[data-group="media"] .chip-icon {
  color: var(--media-active-icon-color) !important;
}

.chip.active[data-group="media"] .chip-icon ha-icon {
  color: var(--media-active-icon-color) !important;
}

.chip-icon {
  width: var(--apple-chip-icon-size, 24px);
  height: var(--apple-chip-icon-size, 24px);
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  color: var(--chip-icon-color);
  flex-shrink: 0;
}

.chip-icon ha-icon {
  width: var(--apple-chip-icon-size, 24px);
  height: var(--apple-chip-icon-size, 24px);
  --mdc-icon-size: var(--apple-chip-icon-size, 24px);
  color: var(--chip-icon-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chip-content {
  display: flex;
  flex-direction: column;
  gap: 0px;
}

.chip-group-name {
  font-size: var(--apple-chip-name-size, 13px);
  font-weight: 600;
  color: white;
  line-height: 1.2;
  letter-spacing: -0.2px;
}

.chip-status {
  font-size: var(--apple-chip-status-size, 11px);
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.2;
}

/* Responsive chip sizing - uses CSS variables from LiquidGlassStyles.ts */
@media (max-width: 479px) {
  .chips-grid {
    gap: var(--apple-chip-gap, 8px);
  }

  .chip {
    padding: var(--apple-chip-padding, 4px 14px 4px 8px);
    min-height: var(--apple-chip-height, 32px);
  }

  .chip-icon {
    width: var(--apple-chip-icon-size, 20px);
    height: var(--apple-chip-icon-size, 20px);
  }

  .chip-icon ha-icon {
    width: var(--apple-chip-icon-size, 20px);
    height: var(--apple-chip-icon-size, 20px);
    --mdc-icon-size: var(--apple-chip-icon-size, 20px);
  }

  .chip-group-name {
    font-size: var(--apple-chip-name-size, 13px);
  }

  .chip-status {
    font-size: var(--apple-chip-status-size, 11px);
  }
}

/* Extra small screens */
@media (max-width: 359px) {
  .chips-grid {
    gap: 6px;
  }

  .chip {
    padding: 3px 12px 3px 6px;
    min-height: 30px;
    gap: 6px;
  }

  .chip-icon {
    width: var(--apple-chip-icon-size, 18px);
    height: var(--apple-chip-icon-size, 18px);
  }

  .chip-icon ha-icon {
    width: var(--apple-chip-icon-size, 18px);
    height: var(--apple-chip-icon-size, 18px);
    --mdc-icon-size: var(--apple-chip-icon-size, 18px);
  }

  .chip-group-name {
    font-size: var(--apple-chip-name-size, 12px);
  }

  .chip-status {
    font-size: 10px;
  }
}

/* RTL chips on small screens */
@media (max-width: 479px) {
  .chips-carousel-container.rtl .chip {
    padding: 4px 8px 4px 14px;
  }
}

@media (max-width: 359px) {
  .chips-carousel-container.rtl .chip {
    padding: 3px 6px 3px 12px;
  }
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .chip-wrapper.edit-mode {
    animation: none !important;
  }
  .chip, .chip-wrapper {
    transition: none !important;
  }
}

@keyframes hg-shake {
  0%, 100% { transform: translateX(0px) rotate(0deg); }
  10% { transform: translateX(-1px) rotate(-0.6deg); }
  20% { transform: translateX(1px) rotate(0.6deg); }
  30% { transform: translateX(-1px) rotate(-0.6deg); }
  40% { transform: translateX(1px) rotate(0.6deg); }
  50% { transform: translateX(-1px) rotate(-0.6deg); }
  60% { transform: translateX(1px) rotate(0.6deg); }
  70% { transform: translateX(-1px) rotate(-0.6deg); }
  80% { transform: translateX(1px) rotate(0.6deg); }
  90% { transform: translateX(-1px) rotate(-0.6deg); }
}
`;
