import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countLightsOn, formatPower, isWaterEntity, summarizeSecurity } from '../src/sections/chipStatus.ts';

const ent = (entity_id: string, state: string) => ({ entity_id, state });

test('isWaterEntity: moisture class or keyword-only binary_sensor without class', () => {
  assert.equal(isWaterEntity('binary_sensor.kitchen_leak'), true);
  assert.equal(isWaterEntity('sensor.basement', { device_class: 'moisture' }), true);
  assert.equal(isWaterEntity('switch.water_pump', {}), false);
  assert.equal(isWaterEntity('light.waterfall_lamp', {}), false);
  assert.equal(isWaterEntity('sensor.water_usage', {}), false);
  assert.equal(isWaterEntity('binary_sensor.water_pump_running', { device_class: 'running' }), false);
});

test('countLightsOn counts only the light domain', () => {
  const list = [ent('light.a', 'on'), ent('light.b', 'off'), ent('binary_sensor.daylight', 'on'), ent('switch.x', 'on')];
  assert.equal(countLightsOn(list), 1);
});

test('summarizeSecurity covers every armed_* state, pending, arming, triggered and lock problems', () => {
  const s = summarizeSecurity([
    ent('alarm_control_panel.a', 'armed_night'),
    ent('alarm_control_panel.b', 'armed_custom_bypass'),
    ent('alarm_control_panel.c', 'pending'),
    ent('alarm_control_panel.d', 'arming'),
    ent('alarm_control_panel.e', 'triggered'),
    ent('alarm_control_panel.f', 'disarmed'),
    ent('lock.a', 'unlocked'),
    ent('lock.b', 'open'),
    ent('lock.c', 'jammed'),
    ent('lock.d', 'locked'),
  ]);
  assert.deepEqual(s, { triggered: 1, armed: 4, unlocked: 2, jammed: 1 });
});

test('formatPower switches to kW at 1000 W', () => {
  assert.equal(formatPower(850.4), '850 W');
  assert.equal(formatPower(3000), '3.0 kW');
});
