import { glassCSS } from '../../styles/glass';

export const chipsStyles = (mediaActiveIconColor: string) => `
${glassCSS}

:host {
  --media-active-icon-color: ${mediaActiveIconColor};
}

.apple-chips-section {
  display: block;
  margin-top: 8px;
  width: 100%;
}

.chips-carousel-container {
  overflow-x: auto;
  overflow-y: hidden;
  margin-inline-start: calc(-1 * var(--hg-page-padding));
  margin-inline-end: calc(-1 * var(--hg-page-padding));
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chips-carousel-container::-webkit-scrollbar {
  display: none;
}

.chips-grid {
  display: inline-flex;
  gap: var(--hg-card-gap);
  align-items: center;
  padding-inline-start: var(--hg-page-padding);
  padding-inline-end: var(--hg-page-padding);
  min-width: 100%;
  box-sizing: border-box;
  height: var(--hg-hit-min);
}

.chips-carousel-container.rtl {
  direction: rtl;
}

.chips-carousel-container.ltr {
  direction: ltr;
}

.chip-wrapper {
  flex-shrink: 0;
  position: relative;
}

.chip-wrapper.edit-mode {
  animation: hg-shake 1.3s ease-in-out infinite;
  touch-action: none;
}

.chip-wrapper.drag-placeholder {
  background: transparent !important;
  border: none !important;
  opacity: 1;
  pointer-events: none;
  display: flex;
  align-items: center;
  min-height: var(--hg-chip-height);
}

.chip {
  display: flex;
  align-items: center;
  gap: var(--hg-chip-gap);
  padding: var(--hg-chip-padding);
  min-height: var(--hg-chip-height);
  border-radius: var(--hg-radius-chip);
  color: var(--hg-label);
  font-family: var(--hg-font);
  user-select: none;
  -webkit-user-select: none;
  white-space: nowrap;
}

/* Keeps the compact look while the tap target reaches --hg-hit-min. */
.chip::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block: min(0px, calc((100% - var(--hg-hit-min)) / 2));
}

.chips-carousel-container.rtl .chip {
  padding: 3px 8px 3px 16px;
}

.chip-wrapper:not(.dragging) {
  transition: transform var(--hg-dur-slow) var(--hg-ease-standard);
}

.chip-wrapper.dragging {
  animation: none !important;
}

.chip.hg-glass, .chip.hg-pressable:hover {
  box-shadow: var(--hg-edge-inner);
}

.chip.active {
  background: var(--hg-fill-active);
  color: var(--hg-label-on-active);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

.chip-status {
  color: var(--hg-label-secondary);
}

.chip.active .chip-status {
  color: color-mix(in srgb, var(--hg-label-on-active) 70%, transparent);
}

.chip.active[data-group="media"] .chip-icon,
.chip.active[data-group="media"] .chip-icon ha-icon {
  color: var(--media-active-icon-color) !important;
}

.chip-icon {
  width: var(--hg-chip-icon-size);
  height: var(--hg-chip-icon-size);
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  color: var(--chip-icon-color);
  flex-shrink: 0;
}

.chip-icon ha-icon {
  width: var(--hg-chip-icon-size);
  height: var(--hg-chip-icon-size);
  --mdc-icon-size: var(--hg-chip-icon-size);
  color: var(--chip-icon-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chip-content {
  display: flex;
  flex-direction: column;
}

.chip-group-name {
  font-size: var(--hg-text-footnote-size);
  font-weight: var(--hg-text-headline-weight);
  line-height: 1.2;
  letter-spacing: -0.2px;
}

.chip-status {
  font-size: var(--hg-text-caption2-size);
  font-weight: 500;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 359px) {
  .chip {
    padding: 3px 12px 3px 6px;
    min-height: 30px;
  }

  .chips-carousel-container.rtl .chip {
    padding: 3px 6px 3px 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chip-wrapper.edit-mode {
    animation: none !important;
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
