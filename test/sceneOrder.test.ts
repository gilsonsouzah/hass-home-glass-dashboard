import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderScenes, sortByLastUsed } from '../src/sections/sceneOrder.ts';

const ids = (list: { entity_id: string }[]) => list.map((e) => e.entity_id);
const e = (entity_id: string) => ({ entity_id });
const states = {
  'scene.a': { attributes: { friendly_name: 'A' }, last_changed: '2026-01-01T00:00:00Z' },
  'scene.b': { attributes: { friendly_name: 'B', last_triggered: '2026-03-01T00:00:00Z' } },
  'scene.c': { attributes: { friendly_name: 'C' }, last_changed: 'not-a-date' },
  'scene.d': { attributes: { friendly_name: 'D' }, last_changed: '1970-01-01T00:00:00Z' },
};

test('sortByLastUsed: recent first, never-used last by name', () => {
  assert.deepEqual(ids(sortByLastUsed([e('scene.d'), e('scene.a'), e('scene.c'), e('scene.b')], states)), [
    'scene.b',
    'scene.a',
    'scene.c',
    'scene.d',
  ]);
});

test('orderScenes: saved order first, new scenes sorted by last used, terminates', () => {
  const result = orderScenes([e('scene.a'), e('scene.b'), e('scene.c')], ['scene.c', 'scene.gone'], states);
  assert.deepEqual(ids(result), ['scene.c', 'scene.b', 'scene.a']);
});

test('orderScenes: empty saved order sorts by last used', () => {
  assert.deepEqual(ids(orderScenes([e('scene.a'), e('scene.b')], [], states)), ['scene.b', 'scene.a']);
});
