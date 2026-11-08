import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cloneSettings,
  defaultSettings,
  requiresRender,
  settingsFromCustomizations,
  settingsToSections,
} from '../src/settings/settingsData.ts';
import { entityCandidates, type Catalog, type CatalogEntity } from '../src/settings/entityCandidates.ts';

const entity = (id: string, extra: Partial<CatalogEntity> = {}): CatalogEntity => ({
  entity_id: id,
  friendly_name: id,
  domain: id.split('.')[0],
  state: 'on',
  attributes: {},
  ...extra,
});

test('settingsFromCustomizations applies the stored values and defaults', () => {
  assert.deepEqual(settingsFromCustomizations({}, 'default'), {
    ...defaultSettings('default'),
    customBackground: undefined,
    hideHeader: false,
    hideSidebar: false,
  });

  const s = settingsFromCustomizations(
    { home: { favorites: ['light.a'], show_cost: false }, ui: { hide_header: true }, background: { type: 'custom', value: 'url(x)' } },
    'default'
  );
  assert.deepEqual(s.favoriteAccessories, ['light.a']);
  assert.equal(s.showCost, false);
  assert.equal(s.showGas, true);
  assert.equal(s.hideHeader, true);
  assert.equal(s.backgroundType, 'custom');
  assert.equal(s.customBackground, 'url(x)');
  assert.equal(s.presetBackground, 'default');
});

test('settingsToSections keeps unrelated keys and writes the background value', () => {
  const settings = { ...defaultSettings('default'), favoriteAccessories: ['light.a'], hideSidebar: true };
  const out = settingsToSections(settings, { other: 1 }, { keep: 2 });
  assert.equal(out.home.other, 1);
  assert.deepEqual(out.home.favorites, ['light.a']);
  assert.equal(out.ui.keep, 2);
  assert.equal(out.ui.hide_sidebar, true);
  assert.deepEqual(out.background, { type: 'preset', value: 'default' });
});

test('requiresRender ignores wallpaper and UI changes only', () => {
  const before = defaultSettings('default');
  const after = cloneSettings(before);
  after.backgroundType = 'custom';
  after.hideHeader = true;
  assert.equal(requiresRender(before, after), false);

  after.extraAccessories.push('sensor.x');
  assert.equal(requiresRender(before, after), true);
  assert.equal(requiresRender(before, { ...cloneSettings(before), weatherEntity: 'weather.home' }), true);
});

const catalog: Catalog = {
  available: [
    entity('light.a'),
    entity('camera.door'),
    entity('switch.fan'),
    entity('switch.wall_outlet'),
    entity('switch.lamp', { state: 'unavailable' }),
  ],
  additional: [entity('sensor.temp'), entity('sensor.extra')],
};

const ids = (list: CatalogEntity[]) => list.map((e) => e.entity_id);

test('favorites exclude cameras, selected ids, and non-outlet switches while showSwitches is off', () => {
  const temp = { ...defaultSettings('default'), favoriteAccessories: ['light.a'] };
  assert.deepEqual(ids(entityCandidates('favoriteAccessories', '', temp, catalog, {})), ['switch.wall_outlet']);

  temp.showSwitches = true;
  assert.deepEqual(
    ids(entityCandidates('favoriteAccessories', '', temp, catalog, {})),
    ['switch.fan', 'switch.wall_outlet', 'switch.lamp']
  );
});

test('explicitly included switches stay visible in exclude lists', () => {
  const temp = { ...defaultSettings('default'), includedSwitches: ['switch.fan'] };
  assert.ok(ids(entityCandidates('excludedFromHome', 'fan', temp, catalog, {})).includes('switch.fan'));
});

test('extra accessories show as list candidates only when added to extraAccessories', () => {
  const temp = { ...defaultSettings('default'), extraAccessories: ['sensor.temp'] };
  const result = ids(entityCandidates('excludedFromDashboard', '', temp, catalog, {}));
  assert.ok(result.includes('sensor.temp'));
  assert.ok(!result.includes('sensor.extra'));
});

test('includedSwitches only offers available non-outlet switches', () => {
  const temp = defaultSettings('default');
  assert.deepEqual(ids(entityCandidates('includedSwitches', '', temp, catalog, {})), ['switch.fan']);
});

test('weather candidates come from hass.states and skip the selected one', () => {
  const states = {
    'weather.home': { entity_id: 'weather.home', state: 'sunny', attributes: { friendly_name: 'Home' } },
    'weather.work': { entity_id: 'weather.work', state: 'rain', attributes: {} },
    'light.a': { entity_id: 'light.a', state: 'on', attributes: {} },
  };
  const temp = { ...defaultSettings('default'), weatherEntity: 'weather.home' };
  assert.deepEqual(ids(entityCandidates('weatherEntity', '', temp, catalog, states)), ['weather.work']);
});

test('results are capped at 10', () => {
  const many: Catalog = { available: Array.from({ length: 25 }, (_, i) => entity(`light.l${i}`)), additional: [] };
  assert.equal(entityCandidates('favoriteAccessories', '', defaultSettings('default'), many, {}).length, 10);
});
