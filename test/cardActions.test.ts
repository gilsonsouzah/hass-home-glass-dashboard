import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCardAction, runIconAction } from '../src/components/card/actions.ts';

function run(
  fn: typeof runCardAction,
  entityId: string,
  states: Record<string, any> = {},
  climateOnMode: string | null = null
) {
  const calls: unknown[][] = [];
  const events: string[] = [];
  fn({
    hass: { states: { [entityId]: states[entityId] }, callService: (...a: unknown[]) => calls.push(a) },
    entityId,
    climateOnMode,
    openMoreInfo: () => events.push('more-info'),
    toggleLock: () => events.push('lock'),
  });
  return { calls, events };
}

test('card tap: light toggles, scene turns on, unknown domain opens more-info', () => {
  assert.deepEqual(run(runCardAction, 'light.a').calls, [['light', 'toggle', { entity_id: 'light.a' }]]);
  assert.deepEqual(run(runCardAction, 'scene.a').calls, [['scene', 'turn_on', { entity_id: 'scene.a' }]]);
  assert.deepEqual(run(runCardAction, 'sensor.a').events, ['more-info']);
  assert.deepEqual(run(runCardAction, 'lock.a').events, ['lock']);
});

test('card tap: climate off turns on with last active mode, on turns off', () => {
  const off = { 'climate.a': { state: 'off', attributes: { hvac_modes: ['off', 'heat', 'cool'] } } };
  assert.deepEqual(run(runCardAction, 'climate.a', off, 'heat').calls, [
    ['climate', 'set_hvac_mode', { entity_id: 'climate.a', hvac_mode: 'heat' }],
  ]);
  const on = { 'climate.a': { state: 'heat', attributes: {} } };
  assert.deepEqual(run(runCardAction, 'climate.a', on).calls, [
    ['climate', 'set_hvac_mode', { entity_id: 'climate.a', hvac_mode: 'off' }],
  ]);
  const unavailable = { 'climate.a': { state: 'unavailable', attributes: {} } };
  assert.deepEqual(run(runCardAction, 'climate.a', unavailable).calls, []);
});

test('card tap: water heater off picks first non-off mode, falls back to gas', () => {
  const off = { 'water_heater.a': { state: 'off', attributes: { operation_list: ['off', 'eco'] } } };
  assert.equal((run(runCardAction, 'water_heater.a', off).calls[0][2] as any).operation_mode, 'eco');
  const bare = { 'water_heater.a': { state: 'off', attributes: {} } };
  assert.equal((run(runCardAction, 'water_heater.a', bare).calls[0][2] as any).operation_mode, 'gas');
  const on = { 'water_heater.a': { state: 'eco', attributes: {} } };
  assert.equal((run(runCardAction, 'water_heater.a', on).calls[0][2] as any).operation_mode, 'off');
});

test('icon tap: cover and media_player depend on state, toggle-only domains use homeassistant.toggle', () => {
  assert.equal(run(runIconAction, 'cover.a', { 'cover.a': { state: 'open' } }).calls[0][1], 'close_cover');
  assert.equal(run(runIconAction, 'cover.a', { 'cover.a': { state: 'closed' } }).calls[0][1], 'open_cover');
  assert.equal(
    run(runIconAction, 'media_player.a', { 'media_player.a': { state: 'playing' } }).calls[0][1],
    'media_pause'
  );
  assert.equal(
    run(runIconAction, 'media_player.a', { 'media_player.a': { state: 'paused' } }).calls[0][1],
    'media_play'
  );
  assert.equal(run(runIconAction, 'media_player.a', { 'media_player.a': { state: 'off' } }).calls[0][1], 'turn_on');
  assert.deepEqual(run(runIconAction, 'button.a').calls, [['button', 'press', { entity_id: 'button.a' }]]);
  assert.deepEqual(run(runIconAction, 'siren.a').calls, [['homeassistant', 'toggle', { entity_id: 'siren.a' }]]);
  assert.deepEqual(run(runIconAction, 'climate.a').events, ['more-info']);
});
