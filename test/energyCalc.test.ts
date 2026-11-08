import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  averageSoc, buildBars, gasTotal, powerCandidates, previousRange, selfSufficiency, sumPower, sumStats,
} from '../src/sections/energyCalc.ts';

const base = { gridImport: 0, solar: 0, gridReturn: 0, batteryDischarge: 0, batteryCharge: 0 };

test('selfSufficiency uses total home consumption as denominator', () => {
  assert.equal(selfSufficiency({ ...base, gridImport: 10, solar: 10 }), 50);
  const v = selfSufficiency({ ...base, gridImport: 5, solar: 15, gridReturn: 5 })!;
  assert.ok(Math.abs(v - 100 / 3 * 2) < 1e-9);
});

test('selfSufficiency counts battery flows and clamps', () => {
  assert.equal(selfSufficiency({ ...base, gridImport: 10, batteryDischarge: 10 }), 50);
  assert.equal(selfSufficiency({ ...base, gridImport: 10, solar: 10, batteryCharge: 10 }), 0);
  assert.equal(selfSufficiency({ ...base, gridImport: 5, batteryCharge: 5 }), null);
  assert.equal(selfSufficiency({ ...base, gridImport: 0, solar: 4 }), 100);
  assert.equal(selfSufficiency(base), null);
});

test('sumStats sums every source and reports missing data as null', () => {
  const stats = { a: [{ start: 0, change: 1 }, { start: 1, change: 2 }], b: [{ start: 0, change: 4 }] };
  assert.equal(sumStats(stats, ['a', 'b']), 7);
  assert.equal(sumStats(stats, ['a', 'zzz']), 3);
  assert.equal(sumStats(stats, ['zzz']), null);
});

test('previousRange keeps the same elapsed window one period earlier', () => {
  const start = new Date(2026, 10, 8, 0, 0);
  const end = new Date(2026, 10, 8, 8, 0);
  const prev = previousRange(start, end, 'day');
  assert.equal(prev.start.getTime(), new Date(2026, 10, 7, 0, 0).getTime());
  assert.equal(prev.end.getTime(), new Date(2026, 10, 7, 8, 0).getTime());
  const week = previousRange(new Date(2026, 10, 2), new Date(2026, 10, 8, 8), 'week');
  assert.equal(week.start.getTime(), new Date(2026, 9, 26).getTime());
});

test('buildBars keys days by date so the same day-of-month does not collide', () => {
  const start = new Date(2026, 1, 2);
  const stats = [
    { start: new Date(2026, 1, 2, 1).getTime(), change: 1 },
    { start: new Date(2026, 2, 2, 1).getTime(), change: 5 },
  ];
  const bars = buildBars([stats], 'month', start, 'en');
  assert.equal(bars.length, 30);
  assert.equal(bars[0].value, 1);
  assert.equal(bars[28].label, '2');
  assert.equal(bars[28].value, 5);
});

test('buildBars sums several sources per hour', () => {
  const h = (n: number, c: number) => ({ start: new Date(2026, 10, 8, n).getTime(), change: c });
  const bars = buildBars([[h(3, 1)], [h(3, 2), h(5, 1)]], 'day', new Date(2026, 10, 8), 'en');
  assert.equal(bars.length, 24);
  assert.equal(bars[3].value, 3);
  assert.equal(bars[5].value, 1);
});

test('gasTotal only adds sources sharing the first unit', () => {
  const stats = { g1: [{ start: 0, change: 2 }], g2: [{ start: 0, change: 3 }], g3: [{ start: 0, change: 100 }] };
  const r = gasTotal(stats, ['g1', 'g2', 'g3'], { g1: 'm³', g2: 'm³', g3: 'ft³' }, 'm³');
  assert.deepEqual(r, { total: 5, unit: 'm³', ids: ['g1', 'g2'] });
});

const hass = {
  entities: {
    'sensor.e1': { device_id: 'd1' }, 'sensor.e2': { device_id: 'd1' }, 'sensor.p1': { device_id: 'd1' },
    'sensor.e3': { device_id: 'd2' }, 'sensor.p3': { device_id: 'd2' }, 'sensor.b1': { device_id: 'd3' },
    'sensor.b2': { device_id: 'd4' }, 'sensor.e4': { device_id: 'd3' }, 'sensor.e5': { device_id: 'd4' },
  },
  states: {
    'sensor.p1': { state: '500', attributes: { device_class: 'power', state_class: 'measurement' } },
    'sensor.p3': { state: '250', attributes: { device_class: 'power', state_class: 'measurement' } },
    'sensor.b1': { state: '80', attributes: { device_class: 'battery' } },
    'sensor.b2': { state: '60', attributes: { device_class: 'battery' } },
  },
};

test('power is counted once per device and missing sensors are skipped', () => {
  const groups = powerCandidates(hass, ['sensor.e1', 'sensor.e2', 'sensor.e3', 'sensor.none']);
  assert.equal(groups.length, 2);
  assert.equal(sumPower(hass, groups), 750);
  assert.equal(sumPower(hass, []), null);
});

test('averageSoc averages across batteries', () => {
  const groups = [['sensor.b1'], ['sensor.b2']];
  assert.equal(averageSoc(hass, groups), 70);
});
