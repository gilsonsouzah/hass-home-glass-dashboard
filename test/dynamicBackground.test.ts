import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PHASES,
  currentPhase,
  phaseBackground,
  phaseFromClock,
  phaseFromElevation,
  phaseFromSun,
  phaseSky,
} from '../src/utils/dynamicBackground.ts';

const at = (h: number, m = 0) => new Date(2026, 5, 21, h, m);
const sun = (state: string, elevation?: number, rising?: boolean) => ({ state, attributes: { elevation, rising } });

test('clock selects each phase and honours the exact boundaries', () => {
  assert.equal(phaseFromClock(at(0)), 'night');
  assert.equal(phaseFromClock(at(4, 59)), 'night');
  assert.equal(phaseFromClock(at(5)), 'dawn');
  assert.equal(phaseFromClock(at(7)), 'morning');
  assert.equal(phaseFromClock(at(10, 59)), 'morning');
  assert.equal(phaseFromClock(at(11)), 'day');
  assert.equal(phaseFromClock(at(17)), 'golden');
  assert.equal(phaseFromClock(at(19)), 'dusk');
  assert.equal(phaseFromClock(at(20, 29)), 'dusk');
  assert.equal(phaseFromClock(at(20, 30)), 'night');
  assert.equal(phaseFromClock(at(23, 59)), 'night');
});

test('elevation maps to phases for rising and setting sun', () => {
  assert.equal(phaseFromElevation(-20, true), 'night');
  assert.equal(phaseFromElevation(-6, true), 'dawn');
  assert.equal(phaseFromElevation(-6, false), 'dusk');
  assert.equal(phaseFromElevation(-0.1, false), 'dusk');
  assert.equal(phaseFromElevation(0, true), 'morning');
  assert.equal(phaseFromElevation(19.9, true), 'morning');
  assert.equal(phaseFromElevation(20, true), 'day');
  assert.equal(phaseFromElevation(9.9, false), 'golden');
  assert.equal(phaseFromElevation(10, false), 'day');
  assert.equal(phaseFromElevation(60, false), 'day');
});

test('sun elevation wins over the clock, including below horizon at noon on a polar location', () => {
  assert.equal(phaseFromSun(sun('below_horizon', -25, false), at(12)), 'night');
  assert.equal(phaseFromSun(sun('above_horizon', 30, true), at(2)), 'day');
});

test('missing rising flag falls back to before or after local noon', () => {
  assert.equal(phaseFromSun(sun('above_horizon', 5), at(8)), 'morning');
  assert.equal(phaseFromSun(sun('above_horizon', 5), at(18)), 'golden');
  assert.equal(phaseFromSun(sun('below_horizon', -3), at(6)), 'dawn');
  assert.equal(phaseFromSun(sun('below_horizon', -3), at(19)), 'dusk');
});

test('without elevation the horizon state corrects the clock', () => {
  assert.equal(phaseFromSun(sun('below_horizon'), at(12)), 'night');
  assert.equal(phaseFromSun(sun('above_horizon'), at(23)), 'golden');
  assert.equal(phaseFromSun(sun('above_horizon'), at(3)), 'morning');
  assert.equal(phaseFromSun(sun('above_horizon'), at(12)), 'day');
  assert.equal(phaseFromSun(sun('below_horizon'), at(21)), 'night');
  assert.equal(phaseFromSun({ state: 'unavailable', attributes: { elevation: 'x' } }, at(9)), 'morning');
});

test('missing sun.sun falls back to the clock', () => {
  assert.equal(currentPhase(undefined, at(13)), 'day');
  assert.equal(currentPhase({}, at(13)), 'day');
  assert.equal(currentPhase({ states: {} }, at(22)), 'night');
  assert.equal(currentPhase({ states: { 'sun.sun': sun('above_horizon', 40, true) } }, at(22)), 'day');
});

test('every phase has a distinct gradient and only night carries stars', () => {
  const skies = PHASES.map((p) => phaseBackground(p));
  assert.equal(new Set(skies).size, PHASES.length);
  for (const phase of PHASES) {
    assert.match(phaseBackground(phase), /linear-gradient\(/);
    assert.equal(phaseBackground(phase).includes('radial-gradient'), phase === 'night');
    assert.ok(phaseBackground(phase).endsWith(phaseSky(phase)));
  }
});
