import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeGasCost, computeGridCostTotal, getGridCostEntities, getGridFromEntities, getGridToEntities, splitSources,
} from '../src/sections/energyCalc.ts';

const multiTariff = [
  { type: 'grid', stat_energy_from: 'day', stat_energy_to: 'ret', stat_cost: 'day_cost' },
  { type: 'grid', stat_energy_from: 'night', number_energy_price: 0.5 },
];
const flow = [{ type: 'grid', flow_from: [{ stat_energy_from: 'a', stat_cost: 'a_cost' }, { stat_energy_from: 'b' }], flow_to: [{ stat_energy_to: 'x' }] }];

test('grid entities: separate sources and flow_from/flow_to are both supported', () => {
  assert.deepEqual(getGridFromEntities(multiTariff), ['day', 'night']);
  assert.deepEqual(getGridToEntities(multiTariff), ['ret']);
  assert.deepEqual(getGridCostEntities(multiTariff), ['day_cost']);
  assert.deepEqual(getGridFromEntities(flow), ['a', 'b']);
  assert.deepEqual(getGridToEntities(flow), ['x']);
  assert.deepEqual(getGridCostEntities(flow), ['a_cost']);
});

test('splitSources drops gas unless requested', () => {
  const prefs = { energy_sources: [{ type: 'grid' }, { type: 'gas' }, { type: 'solar' }] };
  assert.equal(splitSources(prefs, false).gas.length, 0);
  assert.equal(splitSources(prefs, true).gas.length, 1);
  assert.equal(splitSources({}, true).grid.length, 0);
});

const stats = (v: Record<string, number>) =>
  Object.fromEntries(Object.entries(v).map(([k, change]) => [k, [{ start: 0, change }]]));

test('computeGridCostTotal: cost stat per source, else consumption * price', () => {
  assert.equal(computeGridCostTotal(multiTariff, stats({ day_cost: 3, night: 4 })), 5);
  assert.equal(computeGridCostTotal(multiTariff, {}), null);
});

test('computeGasCost: only included sources, price fallback', () => {
  const gas = [{ stat_energy_from: 'g1', stat_cost: 'g1c' }, { stat_energy_from: 'g2', number_energy_price: 2 }, { stat_energy_from: 'g3', stat_cost: 'g3c' }];
  assert.equal(computeGasCost(gas, ['g1', 'g2'], stats({ g1c: 1, g2: 3, g3c: 100 })), 7);
  assert.equal(computeGasCost(gas, [], stats({})), null);
});
