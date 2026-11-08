import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderSections } from '../src/utils/sectionOrder.ts';

const names = { zeta: 'Alpha', alpha: 'Zulu', mid: 'Beta' };

test('default order: fixed sections first, areas sorted by name not id', () => {
  const ids = ['alpha', 'mid', 'zeta', 'cameras_section', 'energy_section', 'weather_section', 'scenes_section'];
  assert.deepEqual(orderSections(ids, [], names, 'en'), [
    'weather_section', 'energy_section', 'scenes_section', 'cameras_section', 'zeta', 'mid', 'alpha'
  ]);
});

test('area names are compared with the given locale', () => {
  assert.deepEqual(orderSections(['a', 'b'], [], { a: 'Äpfel', b: 'Zebra' }, 'sv'), ['b', 'a']);
  assert.deepEqual(orderSections(['a', 'b'], [], { a: 'Äpfel', b: 'Zebra' }, 'de'), ['a', 'b']);
});

test('saved order: new weather and energy go first in default order, other new sections last', () => {
  const ids = ['a', 'b', 'c', 'favorites_section', 'energy_section', 'weather_section'];
  assert.deepEqual(orderSections(ids, ['c', 'a', 'gone', 'b'], {}), [
    'weather_section', 'energy_section', 'c', 'a', 'b', 'favorites_section'
  ]);
});

test('saved weather/energy keep their saved position', () => {
  assert.deepEqual(orderSections(['a', 'weather_section'], ['a', 'weather_section'], {}), ['a', 'weather_section']);
});
