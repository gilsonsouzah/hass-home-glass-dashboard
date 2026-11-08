export const energyHomeStyles = `
/* ========== ENERGY CARD (Home - Liquid Glass) ========== */
.apple-energy-card {
  border-radius: var(--apple-card-radius, 22px);
  padding: 20px 22px 16px;
  margin-top: 20px;
  color: white;
  cursor: pointer;
  transition: transform 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
  position: relative;
  overflow: hidden;
  background: var(--apple-card-bg-inactive, rgba(0, 0, 0, 0.3));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.apple-energy-card:active {
  transform: scale(0.99);
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
  color: #4ADE80;
}

.energy-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.energy-header-right {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
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
  color: white;
}

.energy-today-total {
  font-size: 16px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.55);
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
  background: #4ADE80;
  border-radius: 2px 2px 0 0;
  min-height: 1px;
  transition: height 0.3s ease;
  opacity: 0.7;
}

.energy-bar.current .energy-bar-fill {
  opacity: 1;
  background: #30D158;
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
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
}

.energy-chart-label.now {
  color: #4ADE80;
  font-weight: 600;
}

/* ========== SOLAR / BATTERY ROW (Home Card) ========== */
.energy-extra-row {
  display: flex;
  gap: 20px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
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
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.energy-extra-icon {
  --mdc-icon-size: 16px;
}

.energy-extra-icon.solar {
  color: #FFD60A;
}

.energy-extra-icon.battery {
  color: #4ADE80;
}

.energy-extra-icon.gas {
  color: #FF9F0A;
}

.energy-extra-sub {
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
  margin-left: 22px;
}

`;
