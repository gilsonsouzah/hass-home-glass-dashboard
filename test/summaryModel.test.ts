import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSummary, isSummaryRelevant, MAX_SUMMARY_ITEMS } from '../src/sections/summary/summaryModel.ts';

const ctx = { localize: (_key: string, fallback: string) => fallback, language: 'en', temperatureUnit: '°C' };
const ent = (entity_id: string, state: string, attributes: Record<string, any> = {}) => ({ entity_id, state, attributes });
const texts = (entities: ReturnType<typeof ent>[], c = ctx) => buildSummary(entities, c).map((i) => i.text);

test('nothing to say yields no items', () => {
  assert.deepEqual(buildSummary([], ctx), []);
  assert.deepEqual(
    texts([ent('light.a', 'off'), ent('lock.a', 'locked'), ent('media_player.a', 'paused'), ent('cover.garage', 'closed', { device_class: 'garage' })]),
    []
  );
});

test('lights: singular and plural by language rules', () => {
  assert.deepEqual(texts([ent('light.a', 'on')]), ['1 light on']);
  assert.deepEqual(texts([ent('light.a', 'on'), ent('light.b', 'on'), ent('light.c', 'off')]), ['2 lights on']);
});

test('single entity items open more-info, multiple navigate to the group page', () => {
  const [one] = buildSummary([ent('light.a', 'on')], ctx);
  assert.deepEqual(one.target, { entityId: 'light.a' });
  const [many] = buildSummary([ent('light.a', 'on'), ent('light.b', 'on')], ctx);
  assert.deepEqual(many.target, { page: 'lighting' });
});

test('unlocked locks: name when one, count otherwise; jammed and locked are not unlocked', () => {
  assert.deepEqual(texts([ent('lock.front', 'unlocked', { friendly_name: 'Front door' })]), ['Front door unlocked']);
  assert.deepEqual(texts([ent('lock.a', 'unlocked'), ent('lock.b', 'unlocked'), ent('lock.c', 'locked'), ent('lock.d', 'jammed')]), ['2 locks unlocked']);
});

test('friendly_name falls back to the entity id', () => {
  assert.deepEqual(texts([ent('lock.back', 'unlocked')]), ['lock.back unlocked']);
});

test('alerts come first and are flagged; unavailable lock is an alert', () => {
  const items = buildSummary(
    [
      ent('light.a', 'on'),
      ent('lock.a', 'unavailable'),
      ent('alarm_control_panel.h', 'triggered'),
      ent('binary_sensor.leak', 'on', { device_class: 'moisture' }),
      ent('binary_sensor.smoke', 'on', { device_class: 'smoke' }),
    ],
    ctx
  );
  assert.deepEqual(
    items.map((i) => [i.id, i.alert]),
    [['alarm', true], ['leak', true], ['smoke', true], ['lock-unavailable', true]]
  );
});

test('alert with several sources shows a count and navigates to a page', () => {
  const [item] = buildSummary([ent('binary_sensor.a', 'on', { device_class: 'smoke' }), ent('binary_sensor.b', 'on', { device_class: 'smoke' })], ctx);
  assert.equal(item.text, 'Smoke detected (2)');
  assert.deepEqual(item.target, { page: 'security' });
});

test('several leaks open more-info of the first sensor because no page lists moisture sensors', () => {
  const [item] = buildSummary([ent('binary_sensor.a', 'on', { device_class: 'moisture' }), ent('binary_sensor.b', 'on', { device_class: 'moisture' })], ctx);
  assert.equal(item.text, 'Leak detected (2)');
  assert.deepEqual(item.target, { entityId: 'binary_sensor.a' });
});

test('alarm armed, pending or off is not an alert', () => {
  assert.deepEqual(texts([ent('alarm_control_panel.a', 'armed_away'), ent('alarm_control_panel.b', 'pending'), ent('alarm_control_panel.c', 'disarmed')]), []);
});

test('garage doors and gates count when open or moving; plain covers never do', () => {
  assert.deepEqual(texts([ent('cover.g', 'open', { device_class: 'garage', friendly_name: 'Garage' })]), ['Garage open']);
  assert.deepEqual(texts([ent('cover.g', 'closing', { device_class: 'gate', friendly_name: 'Gate' })]), ['Gate open']);
  assert.deepEqual(texts([ent('cover.g', 'open', { device_class: 'garage' }), ent('cover.h', 'open', { device_class: 'gate' })]), ['2 garage doors and gates open']);
  assert.deepEqual(texts([ent('cover.blind', 'open', { device_class: 'blind' }), ent('cover.plain', 'open')]), []);
});

test('doors and windows: named when one, grouped wording otherwise', () => {
  const door = (id: string, name?: string) => ent(`binary_sensor.${id}`, 'on', { device_class: 'door', friendly_name: name });
  const win = (id: string) => ent(`binary_sensor.${id}`, 'on', { device_class: 'window' });
  assert.deepEqual(texts([door('d1', 'Back door')]), ['Back door open']);
  assert.deepEqual(texts([door('d1'), door('d2')]), ['2 doors open']);
  assert.deepEqual(texts([win('w1'), win('w2'), win('w3')]), ['3 windows open']);
  assert.deepEqual(texts([door('d1'), win('w1')]), ['2 doors and windows open']);
  assert.deepEqual(texts([ent('binary_sensor.m', 'on', { device_class: 'motion' }), ent('binary_sensor.d', 'off', { device_class: 'door' })]), []);
});

test('media: name when one playing, count otherwise; paused and idle ignored', () => {
  assert.deepEqual(texts([ent('media_player.tv', 'playing', { friendly_name: 'TV' }), ent('media_player.b', 'paused')]), ['TV playing']);
  assert.deepEqual(texts([ent('media_player.a', 'playing'), ent('media_player.b', 'playing')]), ['2 media players playing']);
});

test('climate range from current temperatures with the configured unit', () => {
  const c = (id: string, state: string, current: unknown) => ent(`climate.${id}`, state, { current_temperature: current });
  assert.deepEqual(texts([c('a', 'heat', 22.4), c('b', 'off', 24.6), c('c', 'cool', 21.9)]), ['22–25°C']);
  assert.deepEqual(texts([c('a', 'heat', 22.2), c('b', 'heat', 21.8)]), ['22°C']);
  assert.deepEqual(texts([c('a', 'heat', 70.1), c('b', 'heat', 72.9)], { ...ctx, temperatureUnit: '°F' }), ['70–73°F']);
});

test('climate ignores unavailable entities and non-numeric temperatures', () => {
  const c = (state: string, current: unknown) => ent('climate.x', state, { current_temperature: current });
  assert.deepEqual(texts([c('unavailable', 20), c('heat', null), c('heat', '21'), c('heat', undefined)]), []);
});

test('negative temperatures never render as -0', () => {
  assert.deepEqual(texts([ent('climate.a', 'heat', { current_temperature: -0.2 })]), ['0°C']);
});

test('at most four items, in priority order', () => {
  const items = buildSummary(
    [
      ent('light.a', 'on'),
      ent('media_player.a', 'playing', { friendly_name: 'TV' }),
      ent('climate.a', 'heat', { current_temperature: 21 }),
      ent('lock.a', 'unlocked', { friendly_name: 'Front' }),
      ent('cover.g', 'open', { device_class: 'garage', friendly_name: 'Garage' }),
      ent('binary_sensor.d', 'on', { device_class: 'door', friendly_name: 'Door' }),
    ],
    ctx
  );
  assert.equal(items.length, MAX_SUMMARY_ITEMS);
  assert.deepEqual(items.map((i) => i.id), ['lock-unlocked', 'garage', 'openings', 'lights']);
});

test('alerts survive truncation while lower priorities are dropped', () => {
  const items = buildSummary(
    [
      ent('alarm_control_panel.h', 'triggered'),
      ent('lock.a', 'unavailable'),
      ent('binary_sensor.l', 'on', { device_class: 'moisture' }),
      ent('lock.b', 'unlocked'),
      ent('cover.g', 'open', { device_class: 'garage' }),
    ],
    ctx
  );
  assert.deepEqual(items.map((i) => i.id), ['alarm', 'leak', 'lock-unavailable', 'lock-unlocked']);
});

test('localize is used with the key and interpolation; numbers follow the language', () => {
  const seen: string[] = [];
  const pt = {
    localize: (key: string, fallback: string) => {
      seen.push(key);
      return key === 'summary.lights_on_other' ? '{n} luzes acesas' : fallback;
    },
    language: 'ar-EG',
    temperatureUnit: '°C',
  };
  const lights = Array.from({ length: 12 }, (_, i) => ent(`light.l${i}`, 'on'));
  const [item] = buildSummary(lights, pt);
  assert.ok(seen.includes('summary.lights_on_other'));
  assert.match(item.text, /^.+ luzes acesas$/);
  assert.notEqual(item.text, '12 luzes acesas');
});

test('an invalid language tag falls back instead of throwing', () => {
  assert.deepEqual(texts([ent('light.a', 'on')], { ...ctx, language: 'not a locale!!' }), ['1 light on']);
});

test('isSummaryRelevant: domains and device classes that can contribute', () => {
  assert.equal(isSummaryRelevant({ entity_id: 'light.a' }), true);
  assert.equal(isSummaryRelevant({ entity_id: 'binary_sensor.a', attributes: { device_class: 'door' } }), true);
  assert.equal(isSummaryRelevant({ entity_id: 'binary_sensor.a', attributes: { device_class: 'motion' } }), false);
  assert.equal(isSummaryRelevant({ entity_id: 'binary_sensor.a' }), false);
  assert.equal(isSummaryRelevant({ entity_id: 'cover.a', attributes: { device_class: 'garage' } }), true);
  assert.equal(isSummaryRelevant({ entity_id: 'cover.a', attributes: { device_class: 'blind' } }), false);
  assert.equal(isSummaryRelevant({ entity_id: 'switch.a' }), false);
});
