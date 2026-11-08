export const VIEW_STYLES = `
/* ============================================
   Responsive Design System
   ============================================
   Breakpoints:
   - Desktop: > 1199px (4 columns)
   - Tablet: 768px - 1199px (3 columns)
   - Mobile: 480px - 767px (2 columns)
   - Small Mobile: 360px - 479px (2 columns, smaller)
   - Extra Small / Accessibility: < 360px (1 column)
   
   Accessibility considerations:
   - Respects prefers-reduced-motion
   - Scales with user font-size preferences
   - Single column for accessibility enlarged displays
   ============================================ */

:host {
  display: block;
  padding: 0 var(--hg-page-padding) var(--hg-page-padding-bottom) var(--hg-page-padding);
  box-sizing: border-box;
  width: 100%;
  background: transparent;
  position: relative;
  /* Enable container queries - responds to available space, not screen */
  container-type: inline-size;
  container-name: home-glass-view;
  /* Local variables - only for values that need container-specific overrides */
  --card-gap: var(--hg-card-gap, 10px);
  --section-margin: var(--hg-section-gap, 20px);
  font-family: var(--hg-font);
  color: var(--hg-label);
}

@media (prefers-reduced-motion: reduce) {
  :host * {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
  }
}

.wrapper-content {
  width: 100%;
  max-width: none;
}

.permanent-chips {
  display: block;
  width: 100%;
  position: relative;
}

/* Page title (big title below header) */
.apple-page-title {
  font-size: var(--hg-text-large-title-size);
  line-height: var(--hg-text-large-title-line);
  font-weight: var(--hg-text-large-title-weight);
  color: var(--hg-label);
  text-shadow: var(--hg-title-shadow, none);
  margin: 10px 0 15px 0;
  letter-spacing: 0.4px;
  display: block;
  visibility: visible;
}

.hg-state-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin: 40px auto;
  max-width: 360px;
  padding: 24px 20px;
  border-radius: var(--hg-radius-tile);
  text-align: center;
  color: var(--hg-label);
}
.hg-state-message ha-icon {
  --mdc-icon-size: 40px;
  color: var(--hg-label-secondary);
}
.hg-state-title {
  font-size: var(--hg-text-headline-size);
  line-height: var(--hg-text-headline-line);
  font-weight: 600;
}
.hg-state-detail {
  font-size: var(--hg-text-footnote-size);
  line-height: var(--hg-text-footnote-line);
  color: var(--hg-label-secondary);
  overflow-wrap: anywhere;
}

.area-section {
  margin-bottom: var(--section-margin);
}
.area-title {
  font-weight: 600;
  font-size: var(--hg-text-title3-size);
  line-height: var(--hg-text-title3-line);
  color: var(--hg-label);
  text-shadow: var(--hg-title-shadow, none);
  margin: 20px 0 6px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Special section titles (Scenes, Cameras) */
.hg-section-title {
  font-size: var(--hg-text-title3-size);
  line-height: var(--hg-text-title3-line);
  font-weight: 600;
  color: var(--hg-label);
  text-shadow: var(--hg-title-shadow, none);
  margin: 20px 0 6px;
  padding: 0;
}

/* Clickable section titles with arrows */
.clickable-section-title {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
  transition: opacity var(--hg-dur) var(--hg-ease-standard);
  user-select: none;
  font-size: inherit;
  font-weight: inherit;
  color: inherit;
}

.clickable-section-title .section-arrow {
  color: var(--hg-label-secondary);
  --mdc-icon-size: 22px;
  transition: color var(--hg-dur) var(--hg-ease-standard);
}

/* Special section titles (Scenes, Cameras) */
.permanent-chips + .hg-section-title, .permanent-chips + .area-title,
.apple-status-section + .hg-section-title,
.apple-status-section + .area-title {
  margin: 12px 0 6px;
}

/* Carousel grid styles - extends to screen edge like Apple Home */
.carousel-container {
  overflow-x: auto;
  overflow-y: hidden;
  margin-bottom: var(--section-margin);
  contain: layout style;
  margin-inline-start: calc(-1 * var(--hg-page-padding));
  margin-inline-end: calc(-1 * var(--hg-page-padding));
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  user-select: none;
}

.carousel-container::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.carousel-grid {
  display: inline-flex;
  gap: var(--card-gap);
  padding-inline-start: var(--hg-page-padding);
  padding-inline-end: var(--hg-page-padding);
  min-width: 100%;
  box-sizing: border-box;
}

/* Scenes carousel - cards about 90% of regular card width like Apple Home */
.carousel-grid.scenes {
  gap: var(--card-gap);
}

.carousel-grid.scenes .entity-card-wrapper {
  /* Scene cards are 90% of regular card width and height */
  /* 4 columns: (100cqw - 3 gaps) / 4 * 0.9 */
  flex: 0 0 calc((100cqw - 3 * var(--card-gap, 10px)) / 4 * 0.9);
  height: calc(var(--apple-card-height, 70px) * 0.9);
}

/* Camera carousel - Apple-style tight grid */
.carousel-grid.cameras {
  gap: 2px; /* Very tight spacing like Apple Home */
  /* Remove end padding as we'll use a spacer approach for percentage-based widths */
  padding-inline-end: 0;
}

/* Camera carousel: add spacer at end to maintain edge padding */
.carousel-grid.cameras::after {
  content: '';
  flex-shrink: 0;
  width: var(--hg-page-padding);
  min-width: var(--hg-page-padding);
}

.carousel-grid .entity-card-wrapper {
  flex: 0 0 auto;
  width: calc(23% - 9px); /* Match regular grid sizing (span 3 of 12) */
  height: var(--apple-card-height, 70px);
  display: flex;
  flex-direction: column;
  position: relative;
  grid-column: unset; /* Override grid column for carousel */
}

.carousel-grid.cameras .entity-card-wrapper {
  height: var(--apple-camera-height, 180px); /* Taller for cameras */
  /* Camera cards are 120% of regular card width on desktop */
  /* 4 columns: (100cqw - 3 gaps) / 4 * 1.2 */
  flex: 0 0 calc((100cqw - 3 * var(--card-gap, 10px)) / 4 * 1.2);
}

/* Ensure camera cards are always tall in carousel */
.carousel-grid.cameras .entity-card-wrapper {
  grid-row: unset; /* Override grid row */
}

/* Apple-style camera card border radius - handled at element level */
.carousel-grid.cameras .entity-card-wrapper home-glass-card {
  overflow: hidden;
}

/* Default border radius for all home-glass-card elements */
home-glass-card {
  border-radius: var(--apple-card-radius, 25px);
  overflow: hidden;
}

/* Camera carousel: remove border radius from middle cards */
.carousel-grid.cameras .entity-card-wrapper home-glass-card {
  border-radius: 0;
}

/* Camera carousel: first card gets left rounded corners */
.carousel-grid.cameras .entity-card-wrapper:first-child home-glass-card {
  border-radius: var(--apple-card-radius, 25px) 0 0 var(--apple-card-radius, 25px);
}

/* Camera carousel: last card gets right rounded corners */
.carousel-grid.cameras .entity-card-wrapper:last-child home-glass-card {
  border-radius: 0 var(--apple-card-radius, 25px) var(--apple-card-radius, 25px) 0;
}

/* Camera carousel: single card gets full rounded corners */
.carousel-grid.cameras .entity-card-wrapper:first-child:last-child home-glass-card {
  border-radius: var(--apple-card-radius, 25px);
}

/* RTL Support for camera carousel border-radius */
.wrapper-content.rtl .carousel-grid.cameras .entity-card-wrapper:first-child home-glass-card {
  border-radius: 0 var(--apple-card-radius, 25px) var(--apple-card-radius, 25px) 0; /* Right rounded corners in RTL */
}

.wrapper-content.rtl .carousel-grid.cameras .entity-card-wrapper:last-child home-glass-card {
  border-radius: var(--apple-card-radius, 25px) 0 0 var(--apple-card-radius, 25px); /* Left rounded corners in RTL */
}

/* Ensure edit mode works properly with carousels */
.carousel-grid .entity-card-wrapper.edit-mode {
  transition: transform 0.2s ease, opacity 0.2s ease;
  animation: hg-shake 1.3s ease-in-out infinite;
  touch-action: none;
}

/* Weather + Energy side-by-side row */
.weather-energy-row {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  align-items: stretch;
}
.weather-energy-row .apple-weather-card,
.weather-energy-row .apple-energy-card {
  flex: 1;
  margin-top: 0;
  width: auto;
  min-width: 0;
  overflow: hidden;
}
.weather-energy-row .apple-weather-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
/* Force weather card to stack its inner layout when in the row at medium widths */
@container home-glass-view (max-width: 1100px) {
  .weather-energy-row .weather-card-inner {
    flex-direction: column;
    gap: 10px;
  }
  .weather-energy-row .weather-clock-side {
    padding-right: 0;
    border-right: none;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}
@container home-glass-view (max-width: 755px) {
  .weather-energy-row {
    flex-direction: column;
  }
  .weather-energy-row .apple-weather-card,
  .weather-energy-row .apple-energy-card {
    width: 100%;
  }
  /* Restore weather card's row layout when stacked vertically (has full width) */
  .weather-energy-row .weather-card-inner {
    flex-direction: row;
    gap: 24px;
  }
  .weather-energy-row .weather-clock-side {
    padding-right: 24px;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0;
    border-bottom: none;
  }
}
@container home-glass-view (max-width: 555px) {
  .weather-energy-row .weather-card-inner {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
  .weather-energy-row .weather-clock-side {
    padding-right: 0;
    border-right: none;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    align-items: center;
  }
}

/* Grid layouts for special pages (non-carousel) */
.room-group-grid, .scenes-grid, .cameras-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: var(--apple-card-height, 70px);
  gap: var(--card-gap);
  margin-bottom: var(--section-margin);
  contain: layout style;
}

.room-group-grid .entity-card-wrapper,
.scenes-grid .entity-card-wrapper,
.cameras-grid .entity-card-wrapper {
  grid-column: span 3; /* Default: 4 columns */
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Cameras should be tall by default in grid view */
.cameras-grid .entity-card-wrapper {
  grid-row: span 2;
}

/* Room group section titles */
.room-group-title {
  font-size: var(--hg-text-title3-size);
  line-height: var(--hg-text-title3-line);
  font-weight: 600;
  color: var(--hg-label);
  text-shadow: var(--hg-title-shadow, none);
  margin: 30px 0 16px;
  padding: 0;
}

/* Group section spacing */
.room-group-section {
  margin-bottom: var(--section-margin);
}

.room-group-section:last-child {
  margin-bottom: 16px;
}

.area-entities {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: var(--apple-card-height, 70px);
  gap: var(--card-gap);
  margin-bottom: 24px;
}

.entity-card-wrapper {
  grid-column: span 3; /* Default: 4 columns */
  display: flex;
  flex-direction: column;
  position: relative;
}

.entity-card-wrapper.edit-mode {
  transition: transform 0.2s ease, opacity 0.2s ease;
  animation: hg-shake 1.3s ease-in-out infinite;
  touch-action: none; /* Prevent default touch behaviors for drag */
}

/* Mobile: Better touch feedback */
@media (hover: none) and (pointer: coarse) {
  .entity-card-wrapper.edit-mode {
    /* Stronger visual feedback for touch */
    animation: hg-shake 1.8s ease-in-out infinite;
    touch-action: none;
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

/* Drag and drop styles */
.drag-placeholder {
  background: transparent !important;
  border: none !important;
  transition: opacity 0.2s ease !important;
  pointer-events: none !important;
  min-height: 70px !important;
  position: relative !important;
}

/* SortableJS ghost element - the placeholder left behind (empty space indicator) */
.sortable-ghost {
  opacity: 0.2 !important;
  background: rgba(255, 255, 255, 0.05) !important;
  border-radius: var(--apple-card-radius, 25px) !important;
  box-shadow: none !important;
}

.sortable-ghost > * {
  opacity: 0 !important;
}

/* SortableJS chosen element - the original element being dragged */
.sortable-chosen {
  /* Keep original appearance but disable animations */
  animation: none !important;
}

/* SortableJS drag element - during native drag (not used with forceFallback) */
.sortable-drag {
  opacity: 1 !important;
}

/* SortableJS fallback element - the floating clone that follows cursor/touch */
.sortable-fallback {
  position: fixed !important;
  opacity: 1 !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5) !important;
  transform: scale(1.05) rotate(2deg) !important;
  border-radius: var(--apple-card-radius, 25px) !important;
  z-index: 100000 !important;
  pointer-events: none !important;
  transition: none !important;
}

/* Smooth transitions for cards making room during drag operations */
.entity-card-wrapper:not(.dragging):not(.sortable-ghost) {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.entity-card-wrapper.dragging,
.entity-card-wrapper.sortable-chosen {
  /* Dragging styles */
  animation: none !important; /* Disable shake animation during drag */
}

.entity-card-wrapper.animating {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* Chip wrapper sortable styles */
/* Ghost placeholder - hide completely, we just show the gap */
.chip-wrapper.sortable-ghost {
  opacity: 0 !important;
  visibility: hidden !important;
}

.chip-wrapper.sortable-ghost > * {
  opacity: 0 !important;
  visibility: hidden !important;
}

/* Hide the original chip being dragged (matches scene card behavior) */
.chip-wrapper.sortable-drag {
  opacity: 0 !important;
  visibility: hidden !important;
  transition: none !important;
}

/* Chip sortable fallback - the floating clone that follows cursor/touch */
.chip-wrapper.sortable-fallback {
  position: fixed !important;
  opacity: 1 !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5) !important;
  transform: scale(1.05) rotate(2deg) !important;
  border-radius: var(--apple-chip-radius, 50px) !important;
  z-index: 100000 !important;
  pointer-events: none !important;
  transition: none !important;
}

/* Ensure the chip inside fallback is properly styled */
.chip-wrapper.sortable-fallback .chip {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 4px 20px 4px 10px !important;
  border-radius: var(--apple-chip-radius, 50px) !important;
  background: rgba(255, 255, 255, 0.25) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
}

/* Smooth transitions for chips making room during drag */
.chip-wrapper:not(.dragging):not(.sortable-ghost) {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.chip-wrapper.sortable-chosen,
.chip-wrapper.dragging {
  animation: none !important; /* Disable shake animation during drag */
}

.entity-controls {
  position: absolute;
  top: -8px;
  right: -8px;
  display: none;
  gap: 4px;
  z-index: 10;
  opacity: 0.99;
  transform: scaleX(-1);
}

:host(.edit-mode) .entity-controls,
.edit-mode .entity-controls,
.entity-card-wrapper.edit-mode .entity-controls {
  display: flex !important;
}

.entity-control-btn {
  background: rgb(234 234 234 / 90%);
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  color: #666;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.entity-control-btn.tall-toggle {
  background: #dfdfdfe6;
  color: #3d3d3d;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
}

.entity-control-btn.tall-toggle ha-icon {
  --mdc-icon-size: 18px;
}

.entity-control-btn.tall-toggle.active {
  background: rgba(255, 255, 255, 0.9);
  color: #666;
}

.entity-card-wrapper.tall {
  grid-row: span 2;
}

/* ============================================
   EXTRA LARGE CONTAINER (1356px+ container = 1400px+ viewport)
   6 columns layout - like Apple Home on large screens
   Uses container query - responds to available space!
   ============================================ */
@container home-glass-view (min-width: 1356px) {
  .entity-card-wrapper,
  .room-group-grid .entity-card-wrapper,
  .scenes-grid .entity-card-wrapper,
  .cameras-grid .entity-card-wrapper {
    grid-column: span var(--apple-card-span-xl, 2); /* 6 columns */
  }

  /* Carousel adjustments for XL */
  .carousel-grid .entity-card-wrapper {
    width: calc(16.666% - 8px); /* 6 columns */
  }

  /* Scene carousel - 90% of 6-column card width */
  .carousel-grid.scenes .entity-card-wrapper {
    /* 6 columns: (100cqw - 5 gaps) / 6 * 0.9 */
    flex: 0 0 calc((100cqw - 5 * var(--card-gap, 10px)) / 6 * 0.9);
  }

  /* Camera carousel - 120% of 6-column card width */
  .carousel-grid.cameras .entity-card-wrapper {
    height: var(--apple-camera-height, 180px);
    /* 6 columns: (100cqw - 5 gaps) / 6 * 1.2 */
    flex: 0 0 calc((100cqw - 5 * var(--card-gap, 10px)) / 6 * 1.2);
  }
}

/* ============================================
   LARGE CONTAINER (1056-1355px container = 1100-1399px viewport)
   4 columns layout
   ============================================ */
@container home-glass-view (min-width: 1056px) and (max-width: 1355px) {
  .entity-card-wrapper,
  .room-group-grid .entity-card-wrapper,
  .scenes-grid .entity-card-wrapper,
  .cameras-grid .entity-card-wrapper {
    grid-column: span var(--apple-card-span-desktop, 3); /* 4 columns */
  }

  /* Carousel adjustments */
  .carousel-grid .entity-card-wrapper {
    width: calc(25% - 8px); /* 4 columns */
  }

  /* Scene carousel - 90% of 4-column card width */
  .carousel-grid.scenes .entity-card-wrapper {
    /* 4 columns: (100cqw - 3 gaps) / 4 * 0.9 */
    flex: 0 0 calc((100cqw - 3 * var(--card-gap, 10px)) / 4 * 0.9);
  }

  /* Camera carousel - 120% of 4-column card width */
  .carousel-grid.cameras .entity-card-wrapper {
    height: var(--apple-camera-height, 180px);
    /* 4 columns: (100cqw - 3 gaps) / 4 * 1.2 */
    flex: 0 0 calc((100cqw - 3 * var(--card-gap, 10px)) / 4 * 1.2);
  }
}

/* ============================================
   MEDIUM CONTAINER (756-1055px container = 800-1099px viewport)
   4 columns layout - good for tablet landscape
   ============================================ */
@container home-glass-view (min-width: 756px) and (max-width: 1055px) {
  .wrapper-content {
    --card-gap: 10px;
  }
  
  .entity-card-wrapper,
  .room-group-grid .entity-card-wrapper,
  .scenes-grid .entity-card-wrapper,
  .cameras-grid .entity-card-wrapper {
    grid-column: span var(--apple-card-span-desktop, 3); /* 4 columns */
  }

  /* Carousel adjustments for medium */
  .carousel-grid .entity-card-wrapper {
    width: calc(25% - 8px); /* 4 columns */
  }

  /* Scene carousel - 90% of 4-column card width */
  .carousel-grid.scenes .entity-card-wrapper {
    /* 4 columns: (100cqw - 3 gaps) / 4 * 0.9 */
    flex: 0 0 calc((100cqw - 3 * var(--card-gap, 10px)) / 4 * 0.9);
  }

  /* Camera carousel - 120% of 4-column card width */
  .carousel-grid.cameras .entity-card-wrapper {
    height: var(--apple-camera-height, 220px);
    /* 4 columns: (100cqw - 3 gaps) / 4 * 1.2 */
    flex: 0 0 calc((100cqw - 3 * var(--card-gap, 10px)) / 4 * 1.2);
  }
}

/* ============================================
   TABLET CONTAINER (556-755px container = 600-799px viewport)
   3 columns layout
   ============================================ */
@container home-glass-view (min-width: 556px) and (max-width: 755px) {
  .wrapper-content {
    --card-gap: 10px;
  }
  
  .entity-card-wrapper,
  .room-group-grid .entity-card-wrapper,
  .scenes-grid .entity-card-wrapper,
  .cameras-grid .entity-card-wrapper {
    grid-column: span var(--apple-card-span-tablet, 4); /* 3 columns */
  }

  /* Carousel adjustments for tablet */
  .carousel-grid .entity-card-wrapper {
    width: calc(33.333% - 8px); /* 3 columns */
  }

  /* Scene carousel - 90% of 3-column card width */
  .carousel-grid.scenes .entity-card-wrapper {
    /* 3 columns: (100cqw - 2 gaps) / 3 * 0.9 */
    flex: 0 0 calc((100cqw - 2 * var(--card-gap, 10px)) / 3 * 0.9);
  }

  /* Camera carousel - 120% of 3-column card width */
  .carousel-grid.cameras .entity-card-wrapper {
    height: var(--apple-camera-height, 220px);
    /* 3 columns: (100cqw - 2 gaps) / 3 * 1.2 */
    flex: 0 0 calc((100cqw - 2 * var(--card-gap, 10px)) / 3 * 1.2);
  }
}

/* ============================================
   MOBILE CONTAINER (356-555px container = 400-599px viewport)
   2 columns layout
   ============================================ */
@container home-glass-view (min-width: 356px) and (max-width: 555px) {
  .wrapper-content {
    --card-gap: 10px;
    --section-margin: 18px;
  }
  
  .apple-page-title {
    font-size: var(--hg-text-title1-size);
    line-height: var(--hg-text-title1-line);
    margin-bottom: 20px;
  }
  
  .entity-card-wrapper,
  .room-group-grid .entity-card-wrapper,
  .scenes-grid .entity-card-wrapper,
  .cameras-grid .entity-card-wrapper {
    grid-column: span var(--apple-card-span-mobile, 6); /* 2 columns */
  }
  
  .entity-card-wrapper.tall {
    grid-row: span 2;
  }

  /* Cameras still tall on mobile */
  .cameras-grid .entity-card-wrapper {
    grid-row: span 2;
  }

  /* Carousel adjustments for mobile */
  .carousel-grid .entity-card-wrapper {
    width: calc(46% - 6px); /* 2 columns */
  }

  /* Scene carousel - 90% of 2-column card width */
  .carousel-grid.scenes .entity-card-wrapper {
    /* 2 columns: (100cqw - 1 gap) / 2 * 0.9 */
    flex: 0 0 calc((100cqw - var(--card-gap, 10px)) / 2 * 0.9);
  }

  /* Camera carousel - 110% of 2-column card width */
  .carousel-grid.cameras .entity-card-wrapper {
    height: var(--apple-camera-height, 220px);
    /* 2 columns: (100cqw - 1 gap) / 2 * 1.1 */
    flex: 0 0 calc((100cqw - var(--card-gap, 10px)) / 2 * 1.1);
  }
  
  /* Touch-friendly controls for mobile */
  .entity-controls {
    top: -10px;
    right: -10px;
    gap: 6px;
  }
  
  .entity-control-btn {
    font-size: 14px;
    padding: 0;
  }
}

/* ============================================
   SMALL CONTAINER (316-355px container = 360-399px viewport)
   2 columns but smaller cards
   ============================================ */
@container home-glass-view (min-width: 316px) and (max-width: 355px) {
  .wrapper-content {
    --card-gap: 8px;
    --section-margin: 16px;
  }
  
  .apple-page-title {
    font-size: var(--hg-text-title2-size);
    line-height: var(--hg-text-title2-line);
  }
  
  .area-title,
  .hg-section-title,
  .room-group-title {
    font-size: var(--hg-text-headline-size);
    line-height: var(--hg-text-headline-line);
    margin-top: 16px;
  }
  
  .entity-card-wrapper,
  .room-group-grid .entity-card-wrapper,
  .scenes-grid .entity-card-wrapper {
    grid-column: span var(--apple-card-span-mobile, 6); /* 2 columns */
  }

  /* Cameras go full width on small container */
  .cameras-grid .entity-card-wrapper {
    grid-column: span 12;
    grid-row: span 2;
  }

  /* Scene carousel - 90% of 2-column card width */
  .carousel-grid.scenes .entity-card-wrapper {
    /* 2 columns: (100cqw - 1 gap) / 2 * 0.9 */
    flex: 0 0 calc((100cqw - var(--card-gap, 8px)) / 2 * 0.9);
  }

  /* Camera carousel - 110% of 2-column card width */
  .carousel-grid.cameras .entity-card-wrapper {
    height: var(--apple-camera-height, 220px);
    /* 2 columns: (100cqw - 1 gap) / 2 * 1.1 */
    flex: 0 0 calc((100cqw - var(--card-gap, 8px)) / 2 * 1.1);
  }
}

/* ============================================
   EXTRA SMALL CONTAINER (< 316px container = < 360px viewport)
   Single column layout - like Apple Home
   Also triggered by very narrow containers
   ============================================ */
@container home-glass-view (max-width: 315px) {
  .wrapper-content {
    --card-gap: 8px;
    --section-margin: 14px;
  }
  
  .apple-page-title {
    font-size: var(--hg-text-title2-size);
    line-height: var(--hg-text-title2-line);
  }
  
  .area-title,
  .hg-section-title,
  .room-group-title {
    font-size: var(--hg-text-headline-size);
    line-height: var(--hg-text-headline-line);
    margin-top: 14px;
  }
  
  .entity-card-wrapper,
  .room-group-grid .entity-card-wrapper,
  .scenes-grid .entity-card-wrapper,
  .cameras-grid .entity-card-wrapper {
    grid-column: span var(--apple-card-span-xs, 12) !important; /* 1 column */
  }

  /* Scene carousel - 90% of 1-column card width */
  .carousel-grid.scenes .entity-card-wrapper {
    /* 1 column: 100cqw * 0.9 */
    flex: 0 0 calc(100cqw * 0.9);
  }

  /* Camera carousel - 100% of 1-column card width */
  .carousel-grid.cameras .entity-card-wrapper {
    height: var(--apple-camera-height, 220px);
    /* 1 column: 100cqw * 1.0 */
    flex: 0 0 100cqw;
  }

  /* Carousel: single item visible */
  .carousel-grid .entity-card-wrapper {
    max-width: 100%;
  }
}

/* ============================================
   FALLBACK: Media queries for older browsers
   or when container queries don't apply
   Uses viewport width (not container) - slightly different thresholds
   ============================================ */
@media (max-width: 359px) {
  :host {
    padding: 0 var(--hg-page-padding) var(--hg-page-padding-bottom) var(--hg-page-padding);
    --card-gap: 8px;
    --section-margin: 14px;
  }
  
  .apple-page-title {
    font-size: var(--hg-text-title2-size);
    line-height: var(--hg-text-title2-line);
  }
  
  .area-title,
  .hg-section-title,
  .room-group-title {
    font-size: var(--hg-text-headline-size);
    line-height: var(--hg-text-headline-line);
    margin-top: 14px;
  }
  
  /* Single column for all cards */
  .entity-card-wrapper {
    grid-column: span var(--apple-card-span-xs, 12) !important;
  }

  .room-group-grid .entity-card-wrapper,
  .scenes-grid .entity-card-wrapper {
    grid-column: span var(--apple-card-span-xs, 12) !important;
  }
  
  /* Tall cards span 2 rows in single column */
  .entity-card-wrapper.tall {
    grid-row: span 2;
  }

  /* Carousel: single item visible */
  .carousel-grid .entity-card-wrapper {
    width: 100% !important;
    max-width: 100%;
  }

  /* Camera carousel - consistent look, 100% width */
  .carousel-grid.cameras .entity-card-wrapper {
    height: var(--apple-camera-height, 220px);
  }
}

/* ============================================
   ACCESSIBILITY: Large Text / Zoom Detection
   Container queries handle responsive layout properly.
   This fallback only kicks in for extremely narrow viewports
   on high-DPI devices where container queries might not apply.
   ============================================ */
@media (max-width: 320px) and (min-resolution: 2dppx) {
  /* Very small high DPI screens - accessibility zoom */
  .room-group-grid .entity-card-wrapper,
  .scenes-grid .entity-card-wrapper {
    grid-column: span var(--apple-card-span-xs, 12);
  }
}

/* Very narrow viewport (accessibility zoom or split screen) */
@media (max-width: 320px) {
  :host {
    padding: 0 var(--hg-page-padding) var(--hg-page-padding-bottom) var(--hg-page-padding);
  }
  
  .apple-page-title {
    font-size: var(--hg-text-title2-size);
    line-height: var(--hg-text-title2-line);
  }
  
  .area-title,
  .hg-section-title,
  .room-group-title {
    font-size: var(--hg-text-headline-size);
    line-height: var(--hg-text-headline-line);
  }
  
  /* Even smaller cards for very narrow screens */
  .carousel-grid.cameras .entity-card-wrapper {
    height: 150px;
  }
}
`;
