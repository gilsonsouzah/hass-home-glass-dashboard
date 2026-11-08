import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeChangedEntityIds } from '../src/components/view/CardHassRouter.ts';
import { pageContextFor, isSpecialPageType } from '../src/components/view/pageTypes.ts';

test('computeChangedEntityIds reports changed, added and removed states by identity', () => {
  const a = { state: 'on' };
  const b = { state: 'off' };
  const oldHass = { states: { 'light.a': a, 'light.b': b, 'light.gone': {} } };
  const newHass = { states: { 'light.a': a, 'light.b': { state: 'on' }, 'light.new': {} } };
  assert.deepEqual(computeChangedEntityIds(oldHass, newHass).sort(), ['light.b', 'light.gone', 'light.new']);
});

test('computeChangedEntityIds without a baseline returns every id, without states returns none', () => {
  assert.deepEqual(computeChangedEntityIds(undefined, { states: { 'a.b': {}, 'c.d': {} } }), ['a.b', 'c.d']);
  assert.deepEqual(computeChangedEntityIds({ states: {} }, {}), []);
});

test('pageContextFor maps known page types and defaults to home', () => {
  for (const type of ['room', 'scenes', 'cameras', 'group']) assert.equal(pageContextFor(type), type);
  assert.equal(pageContextFor('home'), 'home');
  assert.equal(pageContextFor(undefined), 'home');
  assert.equal(pageContextFor('unknown'), 'home');
});

test('isSpecialPageType excludes group and home', () => {
  assert.equal(isSpecialPageType('room'), true);
  assert.equal(isSpecialPageType('group'), false);
  assert.equal(isSpecialPageType(undefined), false);
});
