export const energyPageStyles = `
/* ========== FULL PAGE STYLES ========== */
.energy-full-page {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
  color: white;
}

.energy-dynamic-area {
  transition: opacity 0.2s ease;
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
  color: #4ADE80;
}

.energy-page-current-label {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.energy-page-current-value {
  font-size: 32px;
  font-weight: 200;
  letter-spacing: -1px;
  color: white;
}

/* ========== PERIOD SELECTOR ========== */
.energy-period-selector {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 3px;
  margin-bottom: 20px;
  gap: 2px;
}

.energy-period-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}

.energy-period-btn.active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.energy-period-btn:active {
  transform: scale(0.97);
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
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 14px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.energy-stat-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
}

.energy-stat-value {
  font-size: 20px;
  font-weight: 300;
  color: white;
  letter-spacing: -0.5px;
}

/* ========== CHART SECTION ========== */
.energy-chart-section {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
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
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
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
  color: #FFD60A;
}

.flow-card-icon.battery {
  color: #4ADE80;
}

.flow-card-icon.grid-return {
  color: #5AC8FA;
}

.flow-card-icon.gas {
  color: #FF9F0A;
}

.flow-card-icon.sufficiency {
  color: #4ADE80;
}

.flow-card-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.flow-card-values {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.flow-card-primary {
  font-size: 24px;
  font-weight: 200;
  color: white;
  letter-spacing: -0.5px;
}

.flow-card-secondary {
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.5);
}

.flow-card-vs-previous {
  font-size: 12px;
  font-weight: 500;
  margin-top: 8px;
}

/* ========== BATTERY BAR ========== */
.battery-bar-container {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin: 10px 0 8px;
}

.battery-bar-fill {
  height: 100%;
  background: #4ADE80;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.battery-charge-stats {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
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

.sufficiency-pct {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 300;
  color: white;
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
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.energy-devices-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 14px;
}

.energy-device-row {
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
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
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 8px;
}

.device-row-value {
  font-size: 14px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.55);
  flex-shrink: 0;
}

.device-row-bar-container {
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
  flex: 1;
}

.device-row-bar-fill {
  height: 100%;
  background: #4ADE80;
  border-radius: 2px;
  transition: width 0.3s ease;
  opacity: 0.8;
}

.device-row-pct {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.45);
  min-width: 32px;
  text-align: right;
  margin-top: 4px;
}

.energy-no-data {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
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

@media (prefers-reduced-motion: reduce) {
  .apple-energy-card,
  .energy-bar-fill,
  .battery-bar-fill,
  .device-row-bar-fill,
  .energy-period-btn,
  .energy-dynamic-area {
    transition: none !important;
  }
}
`;
