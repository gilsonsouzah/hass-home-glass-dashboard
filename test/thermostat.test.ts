import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asNumber, parseCodeFormat, pickHvacOnMode, stepTemperature } from '../src/utils/thermostat.ts';

test('asNumber only accepts finite numbers', () => {
  assert.equal(asNumber(21.5), 21.5);
  assert.equal(asNumber(0), 0);
  for (const bad of [null, undefined, '21', NaN, Infinity]) assert.equal(asNumber(bad), null);
});

test('pickHvacOnMode prefers last active mode, never hardcodes cool', () => {
  assert.equal(pickHvacOnMode('heat', ['off', 'heat', 'cool']), 'heat');
  assert.equal(pickHvacOnMode('cool', ['off', 'heat']), 'heat');
  assert.equal(pickHvacOnMode(undefined, ['off', 'heat_cool', 'cool']), 'heat_cool');
  assert.equal(pickHvacOnMode('off', ['off', 'heat']), 'heat');
  assert.equal(pickHvacOnMode(undefined, ['off']), null);
  assert.equal(pickHvacOnMode(undefined, undefined), null);
});

test('stepTemperature clamps, honors 0 bounds and rounds to step precision', () => {
  assert.equal(stepTemperature(22, 1, 0.1, 7, 35), 22.1);
  assert.equal(stepTemperature(22.1, 1, 0.1, 7, 35), 22.2);
  assert.equal(stepTemperature(35, 1, 1, 7, 35), 35);
  assert.equal(stepTemperature(1, -1, 1, 0, 35), 0);
  assert.equal(stepTemperature(8, -1, 0.5, undefined, undefined), 7.5);
  assert.equal(stepTemperature(20, 1, null, null, null), 21);
});

test('parseCodeFormat derives keypad/text and fixed length', () => {
  assert.deepEqual(
    (({ numeric, length }) => ({ numeric, length }))(parseCodeFormat('^\\d{4}$')),
    { numeric: true, length: 4 }
  );
  assert.equal(parseCodeFormat('^\\d+$').length, null);
  assert.equal(parseCodeFormat('^\\d+$').numeric, true);
  assert.equal(parseCodeFormat('[0-9]{6}').length, 6);
  assert.equal(parseCodeFormat('number').numeric, true);
  assert.equal(parseCodeFormat('text').numeric, false);
  assert.equal(parseCodeFormat('^[A-Za-z0-9]{4,8}$').numeric, false);
  assert.equal(parseCodeFormat('^\\d{4,6}$').length, null);
  assert.equal(parseCodeFormat('(').pattern, null);
  assert.ok(parseCodeFormat('^\\d{4}$').pattern!.test('1234'));
  assert.ok(!parseCodeFormat('^\\d{4}$').pattern!.test('12a4'));
});
