import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyHomeOrdering, sortBySavedOrder } from '../src/pages/homeOrdering.ts';
import { pointOf } from '../src/utils/pointer.ts';

const e = (entity_id: string) => ({ entity_id });

test('sortBySavedOrder puts saved ids first and keeps unknown ones in place', () => {
  assert.deepEqual(sortBySavedOrder(['x', 'b', 'y', 'a'], ['a', 'b'], (i) => i), ['a', 'b', 'x', 'y']);
});

test('applyHomeOrdering orders areas and entities and applies tall cards', () => {
  const input = { k: [e('light.1'), e('light.2')], l: [e('light.3')] };
  const out = applyHomeOrdering(input, {
    sections: { order: ['l'] },
    entities_order: { k: ['light.2'] },
    tall_cards: ['light.1', '!light.2']
  });
  assert.deepEqual(Object.keys(out), ['l', 'k']);
  assert.deepEqual(out.k.map((x) => x.entity_id), ['light.2', 'light.1']);
  assert.equal((out.k[0] as any).is_tall, false);
  assert.equal((out.k[1] as any).is_tall, true);
});

test('applyHomeOrdering without customizations keeps input order', () => {
  assert.deepEqual(Object.keys(applyHomeOrdering({ b: [e('a.1')], a: [e('a.2')] }, undefined)), ['b', 'a']);
});

test('pointOf reads touches or mouse coordinates without TouchEvent', () => {
  assert.deepEqual(pointOf({ touches: [{ clientX: 3, clientY: 4 }] } as any), { x: 3, y: 4 });
  assert.deepEqual(pointOf({ clientX: 5, clientY: 6 } as any), { x: 5, y: 6 });
  assert.equal(typeof (globalThis as any).TouchEvent, 'undefined');
});
