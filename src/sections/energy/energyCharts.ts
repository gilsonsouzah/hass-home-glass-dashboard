import { localize } from '../../utils/LocalizationService';
import type { BarData, Period } from '../energyCalc';

export function renderBarChart(barData: BarData[], period: Period): HTMLElement {
  const chart = document.createElement('div');
  chart.className = 'energy-chart';

  const barsContainer = document.createElement('div');
  barsContainer.className = 'energy-bars';

  const maxValue = Math.max(...barData.map(d => d.value), 0.001);
  const currentHour = new Date().getHours();

  for (let i = 0; i < barData.length; i++) {
    const d = barData[i];
    const heightPercent = (d.value / maxValue) * 100;

    const bar = document.createElement('div');
    bar.className = 'energy-bar';

    if (period === 'day') {
      if (i === currentHour) bar.classList.add('current');
      if (i > currentHour) bar.classList.add('future');
    } else if (period === 'week') {
      if (i === barData.length - 1) bar.classList.add('current');
    } else {
      if (i === barData.length - 1) bar.classList.add('current');
    }

    const barFill = document.createElement('div');
    barFill.className = 'energy-bar-fill';
    barFill.style.height = `${Math.max(heightPercent, 2)}%`;

    bar.appendChild(barFill);
    barsContainer.appendChild(bar);
  }

  chart.appendChild(barsContainer);

  const labels = document.createElement('div');
  labels.className = 'energy-chart-labels';

  if (period === 'day') {
    const labelValues = [
      { pos: 0, text: '00' },
      { pos: 6, text: '06' },
      { pos: 12, text: '12' },
      { pos: 18, text: '18' },
      { pos: currentHour, text: localize('energy.now') }
    ];
    const unique = labelValues.reduce((acc, l) => {
      if (!acc.find(a => a.pos === l.pos)) acc.push(l);
      else if (l.text === localize('energy.now')) {
        const ex = acc.find(a => a.pos === l.pos);
        if (ex) ex.text = l.text;
      }
      return acc;
    }, [] as typeof labelValues).sort((a, b) => a.pos - b.pos);

    for (const label of unique) {
      const el = document.createElement('span');
      el.className = 'energy-chart-label';
      if (label.text === localize('energy.now')) el.classList.add('now');
      el.style.left = `${(label.pos / 23) * 100}%`;
      el.textContent = label.text;
      labels.appendChild(el);
    }
  } else {
    const total = barData.length;
    const indices = total <= 7
      ? barData.map((_, i) => i) // show all for week
      : [0, Math.floor(total / 4), Math.floor(total / 2), Math.floor(3 * total / 4), total - 1];

    for (const idx of indices) {
      const el = document.createElement('span');
      el.className = 'energy-chart-label';
      if (idx === total - 1) el.classList.add('now');
      el.style.left = `${(idx / Math.max(total - 1, 1)) * 100}%`;
      el.textContent = barData[idx]?.label || '';
      labels.appendChild(el);
    }
  }

  chart.appendChild(labels);
  return chart;
}

export function renderMiniBarChart(barData: BarData[], color: string): HTMLElement {
  const chart = document.createElement('div');
  chart.className = 'energy-mini-chart';

  const maxVal = Math.max(...barData.map(d => d.value), 0.001);

  for (const d of barData) {
    const bar = document.createElement('div');
    bar.className = 'energy-mini-bar';
    const h = (d.value / maxVal) * 100;
    bar.style.height = `${Math.max(h, 2)}%`;
    bar.style.background = color;
    chart.appendChild(bar);
  }

  return chart;
}
