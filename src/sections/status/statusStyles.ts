import { liquidGlassCSS } from '../../utils/LiquidGlassStyles';

export const statusChipStyles = `
.apple-status-section {
  display: block;
  margin-top: 10px;
  width: 100%;
}

/* Use same structure as scenes carousel */
.status-carousel-container {
  overflow-x: auto;
  overflow-y: hidden;
  margin-inline-start: calc(-1 * var(--apple-page-padding, 22px));
  margin-inline-end: calc(-1 * var(--apple-page-padding, 22px));
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
  padding-inline-start: var(--apple-page-padding, 22px);
  padding-inline-end: var(--apple-page-padding, 22px);
  min-width: 100%;
  box-sizing: border-box;
  height: 48px;
}

.status-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  min-height: 32px;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-chip-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.status-chip-icon ha-icon {
  width: 20px;
  height: 20px;
  color: white;
}

.status-chip-content {
  display: flex;
  flex-direction: column;
  gap: 0px;
}

.status-chip-label {
  font-size: var(--apple-chip-name-size, 13px);
  font-weight: 600;
  color: white;
  line-height: 1.2;
  letter-spacing: -0.2px;
}

.status-chip-value {
  font-size: var(--apple-chip-status-size, 11px);
  font-weight: 500;
  color: white;
  line-height: 1.2;
  opacity: 0.9;
}
`;

export const statusModalStyles = `
.status-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.status-modal-backdrop.show {
  opacity: 1;
}

.status-modal-content {
  position: relative;
  width: 800px;
  max-width: 90vw;
  max-height: 80vh;
  background: rgba(28, 28, 30, 1);
  border-radius: var(--apple-modal-radius, 20px);
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  transform: scale(0.9);
  opacity: 0;
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.status-modal-backdrop.show .status-modal-content {
  transform: scale(1);
  opacity: 1;
}

/* Liquid Glass Button Styles */
${liquidGlassCSS}

.status-modal-header {
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.status-modal-header::before {
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

.status-modal-header h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: white;
  text-align: center;
  flex: 1;
}

.status-modal-header .modal-close {
  z-index: 2;
}

.status-modal-body {
  padding: 0 20px 20px 20px;
}

.status-modal-room-title {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
}

.status-modal-room-title:first-child {
  margin-top: 0;
}

.status-modal-cards {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: var(--apple-card-height, 70px);
  gap: var(--apple-card-gap, 10px);
  auto-rows: min-content;
  margin-bottom: var(--apple-section-gap, 20px);
  /* Enable container queries for modal */
  container-type: inline-size;
}

.status-modal-cards:last-child {
  margin-bottom: 0;
}

.entity-card-wrapper {
  display: flex;
  flex-direction: column;
  position: relative;
  grid-column: span var(--apple-card-span-desktop, 3);
  border-radius: var(--apple-card-radius, 22px);
  overflow: hidden;
}

.entity-card-wrapper.tall {
  grid-row: span 2;
}

.entity-card-wrapper home-glass-card {
  width: 100%;
  height: 100%;
  border-radius: var(--apple-card-radius, 22px);
}

/* Large modal (1100px+) - 4 columns */
@container (min-width: 900px) {
  .entity-card-wrapper {
    grid-column: span var(--apple-card-span-desktop, 3);
  }
}

/* Medium modal (600px - 899px) - 3 columns */
@container (min-width: 600px) and (max-width: 899px) {
  .entity-card-wrapper {
    grid-column: span var(--apple-card-span-mobile, 4);
  }
}

/* Small modal (400px - 599px) - 2 columns */
@container (min-width: 400px) and (max-width: 599px) {
  .entity-card-wrapper {
    grid-column: span var(--apple-card-span-small, 6);
  }

  .status-modal-cards {
    grid-auto-rows: 68px;
    gap: 10px;
  }
}

/* Extra small modal (< 400px) - single column */
@container (max-width: 399px) {
  .entity-card-wrapper {
    grid-column: span 12 !important;
  }

  .status-modal-cards {
    grid-auto-rows: 64px;
    gap: 8px;
  }
}

/* Fallback media queries for older browsers */
@media (max-width: 767px) {
  .entity-card-wrapper {
    grid-column: span 6;
  }

  .status-modal-cards {
    grid-auto-rows: 68px;
    gap: 10px;
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
    border-radius: var(--apple-modal-radius, 20px) var(--apple-modal-radius, 20px) 0 0;
    transform: translateY(100%);
  }

  .status-modal-backdrop.show .status-modal-content {
    transform: translateY(0);
  }
`;
