import { glassCSS } from '../../styles/glass';

export const energyHomeStyles = `
${glassCSS}

/* ========== ENERGY CARD (Home - Liquid Glass) ========== */
.apple-energy-card {
  border-radius: var(--hg-radius-tile);
  padding: 20px 22px 16px;
  margin-top: var(--hg-section-gap);
  color: var(--hg-label);
  font-family: var(--hg-font);
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

/* ========== HEADER ========== */
.energy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.energy-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.energy-icon {
  --mdc-icon-size: 20px;
  color: var(--hg-color-green);
}

.energy-label {
  font-size: var(--hg-text-subhead-size);
  font-weight: 500;
  color: var(--hg-label-secondary);
}

.energy-header-right {
  font-size: var(--hg-text-subhead-size);
  font-weight: 500;
  color: var(--hg-label-tertiary);
}

/* ========== VALUES ========== */
.energy-values {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16px;
}

.energy-current-power {
  font-size: 42px;
  font-weight: 200;
  line-height: 1;
  letter-spacing: -2px;
  font-variant-numeric: tabular-nums;
}

.energy-today-total {
  font-size: var(--hg-text-callout-size);
  font-weight: 400;
  color: var(--hg-label-secondary);
  font-variant-numeric: tabular-nums;
}

/* ========== BAR CHART ========== */
.energy-chart {
  margin-bottom: 12px;
  position: relative;
}

.energy-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 60px;
}

.energy-bar {
  flex: 1;
  display: flex;
  align-items: flex-end;
  height: 100%;
}

.energy-bar-fill {
  width: 100%;
  background: var(--hg-color-green);
  border-radius: 2px 2px 0 0;
  min-height: 1px;
  transition: height var(--hg-dur) var(--hg-ease-standard);
  opacity: 0.7;
}

.energy-bar.current .energy-bar-fill {
  opacity: 1;
}

.energy-bar.future .energy-bar-fill {
  opacity: 0.15;
  height: 2% !important;
}

.energy-chart-labels {
  position: relative;
  height: 18px;
  margin-top: 4px;
}

.energy-chart-label {
  position: absolute;
  transform: translateX(-50%);
  font-size: var(--hg-text-caption2-size);
  font-weight: 500;
  color: var(--hg-label-tertiary);
  font-variant-numeric: tabular-nums;
}

.energy-chart-label.now {
  color: var(--hg-color-green);
  font-weight: 600;
}

/* ========== SOLAR / BATTERY ROW (Home Card) ========== */
.energy-extra-row {
  display: flex;
  gap: 20px;
  padding-top: 12px;
  border-top: 1px solid var(--hg-separator);
  flex-wrap: wrap;
}

.energy-extra-item {
  flex: 1;
  min-width: 120px;
}

.energy-extra-main {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--hg-text-subhead-size);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.energy-extra-icon {
  --mdc-icon-size: 16px;
}

.energy-extra-icon.solar {
  color: var(--hg-color-yellow);
}

.energy-extra-icon.battery {
  color: var(--hg-color-green);
}

.energy-extra-icon.gas {
  color: var(--hg-color-orange);
}

.energy-extra-sub {
  font-size: var(--hg-text-caption1-size);
  font-weight: 400;
  color: var(--hg-label-tertiary);
  margin-top: 2px;
  margin-inline-start: 22px;
}

`;
