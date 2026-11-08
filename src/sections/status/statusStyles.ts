import { liquidGlassCSS } from '../../utils/LiquidGlassStyles';

export const statusChipStyles = `
.apple-status-section {
  display: block;
  margin-top: 10px;
  width: 100%;
}

.status-carousel-container {
  overflow-x: auto;
  overflow-y: hidden;
  margin-inline-start: calc(-1 * var(--hg-page-padding));
  margin-inline-end: calc(-1 * var(--hg-page-padding));
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.status-carousel-container::-webkit-scrollbar {
  display: none;
}

.status-chips-grid {
  display: inline-flex;
  gap: 28px;
  align-items: center;
  padding-inline-start: var(--hg-page-padding);
  padding-inline-end: var(--hg-page-padding);
  min-width: 100%;
  box-sizing: border-box;
  height: 48px;
}

.status-chip {
  display: flex;
  align-items: center;
  gap: var(--hg-chip-gap);
  color: var(--hg-label);
  font-family: var(--hg-font);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  min-height: var(--hg-hit-min);
  white-space: nowrap;
  flex-shrink: 0;
  border-radius: var(--hg-radius-control);
  transition: transform var(--hg-dur-fast) var(--hg-ease-spring), opacity var(--hg-dur) var(--hg-ease-standard);
}

.status-chip:active {
  transform: scale(var(--hg-press-scale));
}

.status-chip:focus-visible {
  outline: var(--hg-focus-ring);
  outline-offset: var(--hg-focus-offset);
}

.status-chip-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--hg-label);
}

.status-chip-icon ha-icon {
  width: 20px;
  height: 20px;
  color: var(--hg-label);
}

.status-chip-content {
  display: flex;
  flex-direction: column;
}

.status-chip-label {
  font-size: var(--hg-text-footnote-size);
  font-weight: var(--hg-text-headline-weight);
  line-height: 1.2;
  letter-spacing: -0.2px;
}

.status-chip-value {
  font-size: var(--hg-text-caption2-size);
  font-weight: 500;
  line-height: 1.2;
  color: var(--hg-label-secondary);
  font-variant-numeric: tabular-nums;
}
`;

export const statusModalStyles = `
.status-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: var(--hg-glass-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--hg-dur) var(--hg-ease-standard);
}

.status-modal-backdrop.show {
  opacity: 1;
}

.status-modal-content {
  width: 800px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--hg-radius-sheet);
  color: var(--hg-label);
  font-family: var(--hg-font);
  transform: scale(0.94);
  opacity: 0;
  transition: transform var(--hg-dur) var(--hg-ease-spring), opacity var(--hg-dur) var(--hg-ease-standard);
}

.status-modal-backdrop.show .status-modal-content {
  transform: scale(1);
  opacity: 1;
}

${liquidGlassCSS}

/* The sheet already blurs the backdrop; a second backdrop-filter inside it only costs GPU. */
.status-modal-header .liquid-glass-btn {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}

.status-modal-header {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  z-index: 10;
}

.status-modal-header::before {
  content: '';
  position: absolute;
  inset: 0 0 -30px;
  background: linear-gradient(to bottom, var(--hg-glass-thick) 30%, transparent);
  z-index: -1;
  pointer-events: none;
}

.status-modal-header h2 {
  margin: 0;
  font-size: var(--hg-text-headline-size);
  font-weight: var(--hg-text-headline-weight);
  color: var(--hg-label);
  text-align: center;
  flex: 1;
}

.status-modal-header .modal-close {
  z-index: 2;
}

.status-modal-body {
  padding: 0 20px 20px 20px;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

.status-modal-room-title {
  margin: 0 0 8px 0;
  font-size: var(--hg-text-footnote-size);
  font-weight: var(--hg-text-body-weight);
  letter-spacing: 0.5px;
  color: var(--hg-label-secondary);
  text-transform: uppercase;
}

.status-modal-room-title:first-child {
  margin-top: 0;
}

.status-modal-cards {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: var(--hg-card-height);
  gap: var(--hg-card-gap);
  auto-rows: min-content;
  margin-bottom: var(--hg-section-gap);
  container-type: inline-size;
}

.status-modal-cards:last-child {
  margin-bottom: 0;
}

.entity-card-wrapper {
  display: flex;
  flex-direction: column;
  position: relative;
  grid-column: span var(--hg-card-span-desktop);
  border-radius: var(--hg-radius-tile);
  overflow: hidden;
}

.entity-card-wrapper.tall {
  grid-row: span 2;
}

.entity-card-wrapper home-glass-card {
  width: 100%;
  height: 100%;
  border-radius: var(--hg-radius-tile);
}

@container (min-width: 900px) {
  .entity-card-wrapper {
    grid-column: span var(--hg-card-span-desktop);
  }
}

@container (min-width: 600px) and (max-width: 899px) {
  .entity-card-wrapper {
    grid-column: span var(--hg-card-span-mobile);
  }
}

@container (min-width: 400px) and (max-width: 599px) {
  .entity-card-wrapper {
    grid-column: span var(--hg-card-span-small);
  }

  .status-modal-cards {
    grid-auto-rows: 68px;
    gap: var(--hg-card-gap);
  }
}

@container (max-width: 399px) {
  .entity-card-wrapper {
    grid-column: span 12 !important;
  }

  .status-modal-cards {
    grid-auto-rows: 64px;
    gap: 8px;
  }
}

@media (max-width: 767px) {
  .entity-card-wrapper {
    grid-column: span 6;
  }

  .status-modal-cards {
    grid-auto-rows: 68px;
    gap: var(--hg-card-gap);
  }
}

@media (max-width: 359px) {
  .entity-card-wrapper {
    grid-column: span 12 !important;
  }

  .status-modal-cards {
    grid-auto-rows: 64px;
  }
}

@media (max-width: 768px) {
  .status-modal-content {
    width: 100vw;
    max-width: 100vw;
    height: calc(100dvh - env(safe-area-inset-top) - 20px);
    max-height: calc(100dvh - env(safe-area-inset-top) - 20px);
    border-radius: var(--hg-radius-sheet) var(--hg-radius-sheet) 0 0;
    transform: translateY(100%);
  }

  .status-modal-backdrop.show .status-modal-content {
    transform: translateY(0);
  }
}
`;
