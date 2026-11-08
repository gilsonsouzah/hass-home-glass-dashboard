import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Timers } from '../src/components/card/quickControls.ts';
import {
  brightnessPercent,
  climateControls,
  colorTempKelvin,
  coverControls,
  coverPosition,
  createLongPress,
  createRateLimiter,
  createSyncGate,
  fanControls,
  fanPercentage,
  lightBrightnessCall,
  lightControls,
  matchesPreset,
  mediaControls,
  sheetKind,
  volumePercent,
} from '../src/components/card/quickControls.ts';

function fakeTimers() {
  let t = 0;
  let nextId = 1;
  const queue = new Map<number, { at: number; fn: () => void }>();
  const timers: Timers = {
    now: () => t,
    setTimer: (fn, ms) => {
      queue.set(nextId, { at: t + ms, fn });
      return nextId++;
    },
    clearTimer: (id) => void queue.delete(id as number),
  };
  const advance = (ms: number) => {
    const end = t + ms;
    for (;;) {
      const due = [...queue.entries()].filter(([, e]) => e.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      queue.delete(due[0]);
      t = due[1].at;
      due[1].fn();
    }
    t = end;
  };
  return { timers, advance };
}

test('sheetKind maps the supported domains and falls back to generic', () => {
  assert.equal(sheetKind('light'), 'light');
  assert.equal(sheetKind('media_player'), 'media_player');
  assert.equal(sheetKind('switch'), 'generic');
});

test('light capabilities come from supported_color_modes', () => {
  assert.deepEqual(lightControls({ supported_color_modes: ['onoff'] }), { brightness: false, colorTemp: null, colors: false });
  const ct = lightControls({ supported_color_modes: ['color_temp', 'hs'], min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6535 });
  assert.deepEqual(ct, { brightness: true, colorTemp: { min: 2000, max: 6535 }, colors: true });
  assert.equal(lightControls({ supported_color_modes: ['color_temp'], min_color_temp_kelvin: 3000, max_color_temp_kelvin: 3000 }).colorTemp, null);
  assert.equal(lightControls({ supported_color_modes: ['xy'] }).colors, true);
  assert.equal(lightControls({ supported_color_modes: ['brightness'] }).brightness, true);
});

test('brightness percent and service mapping (0 turns off)', () => {
  assert.equal(brightnessPercent('off', { brightness: 200 }), 0);
  assert.equal(brightnessPercent('on', { brightness: 255 }), 100);
  assert.equal(brightnessPercent('on', { brightness: 128 }), 50);
  assert.equal(brightnessPercent('on', {}), 100);
  assert.deepEqual(lightBrightnessCall(0), { service: 'turn_off', data: {} });
  assert.deepEqual(lightBrightnessCall(42.4), { service: 'turn_on', data: { brightness_pct: 42 } });
  assert.deepEqual(lightBrightnessCall(0.4), { service: 'turn_off', data: {} });
  assert.deepEqual(lightBrightnessCall(100), { service: 'turn_on', data: { brightness_pct: 100 } });
});

test('color temperature is clamped to the range and defaults to the middle', () => {
  const range = { min: 2000, max: 6000 };
  assert.equal(colorTempKelvin({ color_temp_kelvin: 9000 }, range), 6000);
  assert.equal(colorTempKelvin({ color_temp_kelvin: 100 }, range), 2000);
  assert.equal(colorTempKelvin({}, range), 4000);
});

test('color preset matching wraps around the hue circle', () => {
  const red = { id: 'red', hs: [0, 100] as [number, number] };
  assert.equal(matchesPreset({ hs_color: [358, 100] }, red), true);
  assert.equal(matchesPreset({ hs_color: [30, 100] }, red), false);
  assert.equal(matchesPreset({ hs_color: [2, 40] }, red), false);
  assert.equal(matchesPreset({}, red), false);
});

test('cover capabilities read supported_features bits and position falls back to state', () => {
  assert.deepEqual(coverControls({ supported_features: 15 }), { position: true, open: true, close: true, stop: true });
  assert.deepEqual(coverControls({ supported_features: 3 }), { position: false, open: true, close: true, stop: false });
  assert.deepEqual(coverControls({}), { position: false, open: false, close: false, stop: false });
  assert.equal(coverPosition('open', { current_position: 37.6 }), 38);
  assert.equal(coverPosition('open', {}), 100);
  assert.equal(coverPosition('closed', {}), 0);
});

test('fan capabilities, step and percentage', () => {
  assert.deepEqual(fanControls({ supported_features: 3, percentage_step: 33.33 }), { speed: true, oscillate: true, step: 33.33 });
  assert.deepEqual(fanControls({ supported_features: 1 }), { speed: true, oscillate: false, step: 1 });
  assert.equal(fanPercentage('off', { percentage: 50 }), 0);
  assert.equal(fanPercentage('on', { percentage: 66.4 }), 66);
});

test('climate controls honor min/max/step and hvac_modes', () => {
  assert.deepEqual(climateControls({ temperature: 21, min_temp: 16, max_temp: 30, target_temp_step: 0.5, hvac_modes: ['off', 'heat', 3] }), {
    target: { value: 21, min: 16, max: 30, step: 0.5 },
    modes: ['off', 'heat'],
  });
  assert.equal(climateControls({ hvac_modes: ['off'] }).target, null);
  assert.equal(climateControls({ temperature: 20, target_temp_step: 0 }).target?.step, 1);
});

test('media controls and volume', () => {
  assert.deepEqual(mediaControls({ supported_features: 4 | 16 | 32 | 1 }), { volume: true, previous: true, next: true, playPause: true });
  assert.deepEqual(mediaControls({ supported_features: 16384 }), { volume: false, previous: false, next: false, playPause: true });
  assert.equal(mediaControls({ supported_features: 4 }).playPause, false);
  assert.equal(volumePercent({ volume_level: 0.456 }), 46);
  assert.equal(volumePercent({}), 0);
});

test('rate limiter sends at most once per interval and always delivers the final value', () => {
  const { timers, advance } = fakeTimers();
  const sent: number[] = [];
  const limiter = createRateLimiter<number>((v) => sent.push(v), 250, timers);

  limiter.push(1);
  assert.deepEqual(sent, [1]);
  advance(50);
  limiter.push(2);
  advance(50);
  limiter.push(3);
  assert.deepEqual(sent, [1]);
  advance(150);
  assert.deepEqual(sent, [1, 3]);
  limiter.push(4);
  limiter.flush(5);
  assert.deepEqual(sent, [1, 3, 5]);
  advance(1000);
  assert.deepEqual(sent, [1, 3, 5]);
  limiter.flush(5);
  assert.deepEqual(sent, [1, 3, 5]);
  limiter.flush(6);
  assert.deepEqual(sent, [1, 3, 5, 6]);
});

test('rate limiter flush sends a value that never went through push', () => {
  const { timers } = fakeTimers();
  const sent: number[] = [];
  createRateLimiter<number>((v) => sent.push(v), 250, timers).flush(7);
  assert.deepEqual(sent, [7]);
});

test('rate limiter cancel drops the pending value', () => {
  const { timers, advance } = fakeTimers();
  const sent: number[] = [];
  const limiter = createRateLimiter<number>((v) => sent.push(v), 250, timers);
  limiter.push(1);
  limiter.push(2);
  limiter.cancel();
  advance(1000);
  assert.deepEqual(sent, [1]);
});

test('sync gate defers hass values while held and applies the latest after settling', () => {
  const { timers, advance } = fakeTimers();
  const applied: number[] = [];
  const gate = createSyncGate<number>((v) => applied.push(v), 800, timers);

  gate.external(1);
  assert.deepEqual(applied, [1]);
  gate.hold(Infinity);
  gate.external(2);
  gate.external(3);
  advance(5000);
  assert.deepEqual(applied, [1]);
  gate.hold();
  advance(799);
  assert.deepEqual(applied, [1]);
  advance(2);
  assert.deepEqual(applied, [1, 3]);
  gate.external(4);
  assert.deepEqual(applied, [1, 3, 4]);
});

test('sync gate hold(0) forces the next value through', () => {
  const { timers } = fakeTimers();
  const applied: number[] = [];
  const gate = createSyncGate<number>((v) => applied.push(v), 800, timers);
  gate.hold();
  gate.external(1);
  assert.deepEqual(applied, []);
  gate.hold(0);
  assert.deepEqual(applied, [1]);
});

test('long press fires after the delay, not when it moves past tolerance or lifts early', () => {
  const { timers, advance } = fakeTimers();
  let fired = 0;
  const press = createLongPress(() => fired++, 500, 10, timers);

  press.down(100, 100);
  advance(499);
  assert.equal(fired, 0);
  advance(2);
  assert.equal(fired, 1);
  assert.equal(press.up(), true);

  press.down(0, 0);
  press.move(6, 6);
  advance(600);
  assert.equal(fired, 2);
  press.up();

  press.down(0, 0);
  press.move(8, 8);
  advance(600);
  assert.equal(fired, 2);
  assert.equal(press.up(), false);

  press.down(0, 0);
  advance(200);
  assert.equal(press.up(), false);
  advance(600);
  assert.equal(fired, 2);
});
