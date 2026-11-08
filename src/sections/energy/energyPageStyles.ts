export const energyPageStyles = `
/* ========== FULL PAGE STYLES ========== */
.energy-full-page {
  font-family: var(--hg-font);
  color: var(--hg-label);
}

.energy-dynamic-area {
  transition: opacity var(--hg-dur) var(--hg-ease-standard);
}

.energy-page-current {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  margin-bottom: 8px;
}

.energy-page-current-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.energy-page-icon {
  --mdc-icon-size: 24px;
  color: var(--hg-color-green);
}

.energy-page-current-label {
  font-size: var(--hg-text-headline-size);
  font-weight: var(--hg-text-headline-weight);
}

.energy-page-current-value {
  font-size: 32px;
  font-weight: 200;
  letter-spacing: -1px;
  font-variant-numeric: tabular-nums;
}

/* ========== PERIOD SELECTOR ========== */
.energy-period-selector {
  display: flex;
  background: var(--hg-fill);
  border-radius: var(--hg-radius-control);
  padding: 3px;
  margin-bottom: 20px;
  gap: 2px;
}

.energy-period-btn {
  flex: 1;
  padding: 8px 16px;
  min-height: var(--hg-hit-min);
  border: none;
  border-radius: calc(var(--hg-radius-control) - 3px);
  background: transparent;
  color: var(--hg-label-secondary);
  font-size: var(--hg-text-subhead-size);
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--hg-dur-fast) var(--hg-ease-spring), background-color var(--hg-dur) var(--hg-ease-standard), color var(--hg-dur) var(--hg-ease-standard);
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}

.energy-period-btn.active {
  background: var(--hg-fill-active);
  color: var(--hg-label-on-active);
}

.energy-period-btn:focus-visible {
  outline: var(--hg-focus-ring);
  outline-offset: var(--hg-focus-offset);
}

.energy-period-btn:active {
  transform: scale(var(--hg-press-scale));
}

/* ========== SUMMARY STATS ========== */
.energy-summary-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.energy-stat {
  flex: 1;
  min-width: 80px;
  border-radius: var(--hg-radius-tile);
  padding: 14px 16px;
}

.energy-stat-label {
  font-size: var(--hg-text-caption1-size);
  font-weight: 500;
  color: var(--hg-label-secondary);
  margin-bottom: 4px;
}

.energy-stat-value {
  font-size: var(--hg-text-title3-size);
  font-weight: 300;
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
}

/* ========== CHART SECTION ========== */
.energy-chart-section {
  border-radius: var(--hg-radius-tile);
  padding: 16px;
  margin-bottom: 20px;
}

.energy-chart-section .energy-bars {
  height: 100px;
}

/* ========== FLOW CARDS GRID ========== */
.energy-flow-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.energy-flow-card {
  border-radius: var(--hg-radius-tile);
  padding: 16px;
}

.flow-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.flow-card-icon {
  --mdc-icon-size: 18px;
}

.flow-card-icon.solar {
  color: var(--hg-color-yellow);
}

.flow-card-icon.battery {
  color: var(--hg-color-green);
}

.flow-card-icon.grid-return {
  color: var(--hg-color-cyan);
}

.flow-card-icon.gas {
  color: var(--hg-color-orange);
}

.flow-card-icon.sufficiency {
  color: var(--hg-color-green);
}

.flow-card-title {
  font-size: var(--hg-text-footnote-size);
  font-weight: 600;
  color: var(--hg-label-secondary);
}

.flow-card-values {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.flow-card-primary {
  font-size: 24px;
  font-weight: 200;
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
}

.flow-card-secondary {
  font-size: var(--hg-text-subhead-size);
  font-weight: 400;
  color: var(--hg-label-secondary);
  font-variant-numeric: tabular-nums;
}

.flow-card-vs-previous {
  font-size: var(--hg-text-caption1-size);
  font-weight: 500;
  margin-top: 8px;
  font-variant-numeric: tabular-nums;
}

/* ========== BATTERY BAR ========== */
.battery-bar-container {
  height: 6px;
  background: var(--hg-fill);
  border-radius: var(--hg-radius-chip);
  overflow: hidden;
  margin: 10px 0 8px;
}

.battery-bar-fill {
  height: 100%;
  background: var(--hg-color-green);
  border-radius: var(--hg-radius-chip);
  transition: width var(--hg-dur) var(--hg-ease-standard);
}

.battery-charge-stats {
  display: flex;
  justify-content: space-between;
  font-size: var(--hg-text-caption2-size);
  color: var(--hg-label-tertiary);
  font-variant-numeric: tabular-nums;
}

/* ========== SELF SUFFICIENCY RING ========== */
.self-sufficiency-ring {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 8px auto 0;
}

.sufficiency-svg {
  width: 100%;
  height: 100%;
}

.sufficiency-track {
  stroke: var(--hg-fill);
}

.sufficiency-arc {
  stroke: var(--hg-color-green);
}

.sufficiency-pct {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--hg-text-headline-size);
  font-weight: 300;
  font-variant-numeric: tabular-nums;
}

/* ========== MINI CHART (in flow cards) ========== */
.energy-mini-chart {
  display: flex;
  align-items: flex-end;
  gap: 1px;
  height: 30px;
  margin-top: 10px;
}

.energy-mini-bar {
  flex: 1;
  border-radius: 1px 1px 0 0;
  min-height: 1px;
  opacity: 0.6;
}

/* ========== DEVICE BREAKDOWN ========== */
.energy-devices-section {
  border-radius: var(--hg-radius-tile);
  padding: 16px;
}

.energy-devices-title {
  font-size: var(--hg-text-callout-size);
  font-weight: var(--hg-text-headline-weight);
  margin-bottom: 14px;
}

.energy-device-row {
  padding: 10px 0;
  border-bottom: 1px solid var(--hg-separator);
}

.energy-device-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.device-row-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.device-row-name {
  font-size: var(--hg-text-subhead-size);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-inline-end: 8px;
}

.device-row-value {
  font-size: var(--hg-text-subhead-size);
  font-weight: 400;
  color: var(--hg-label-secondary);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.device-row-bar-container {
  height: 4px;
  background: var(--hg-fill);
  border-radius: var(--hg-radius-chip);
  overflow: hidden;
  flex: 1;
}

.device-row-bar-fill {
  height: 100%;
  background: var(--hg-color-green);
  border-radius: var(--hg-radius-chip);
  transition: width var(--hg-dur) var(--hg-ease-standard);
  opacity: 0.8;
}

.device-row-pct {
  font-size: var(--hg-text-caption1-size);
  font-weight: 500;
  color: var(--hg-label-tertiary);
  min-width: 32px;
  text-align: end;
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
}

.energy-no-data {
  text-align: center;
  color: var(--hg-label-tertiary);
  font-size: var(--hg-text-subhead-size);
  padding: 40px 0;
}

/* ========== RESPONSIVE ========== */
@container home-glass-view (max-width: 755px) {
  .energy-flow-grid {
    grid-template-columns: 1fr;
  }
}

@container home-glass-view (max-width: 555px) {
  .apple-energy-card {
    width: 100%;
  }

  .energy-current-power {
    font-size: 34px;
  }

  .energy-today-total {
    font-size: 14px;
  }

  .energy-bars {
    height: 48px;
  }

  .energy-extra-row {
    flex-direction: column;
    gap: 10px;
  }

  .energy-page-current-value {
    font-size: 26px;
  }

  .energy-stat-value {
    font-size: 17px;
  }

  .energy-chart-section .energy-bars {
    height: 70px;
  }

  .flow-card-primary {
    font-size: 20px;
  }
}

@container home-glass-view (max-width: 355px) {
  .energy-current-power {
    font-size: 28px;
  }

  .energy-bars {
    height: 40px;
  }
}

`;
