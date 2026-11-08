import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DataService } from '../src/utils/DataService.ts';

const supported = (d: string) => ['light', 'switch'].includes(d);

test('isDiscoverable: config/diagnostic only via extra accessories, which also bypass the domain check', () => {
  const diag = { entity_id: 'switch.x', entity_category: 'diagnostic' };
  assert.equal(DataService.isDiscoverable(diag, [], supported), false);
  assert.equal(DataService.isDiscoverable(diag, ['switch.x'], supported), true);
  assert.equal(DataService.isDiscoverable({ entity_id: 'sensor.y' }, ['sensor.y'], supported), true);
  assert.equal(DataService.isDiscoverable({ entity_id: 'sensor.y' }, [], supported), false);
});

test('isDiscoverable: hidden or disabled never show, even as extra accessories', () => {
  assert.equal(DataService.isDiscoverable({ entity_id: 'light.a', hidden_by: 'user' }, ['light.a'], supported), false);
  assert.equal(DataService.isDiscoverable({ entity_id: 'light.a', disabled_by: 'user' }, [], supported), false);
});

test('resolveAreaId prefers the entity area, then the device area', () => {
  const devices = DataService.indexDevices([{ id: 'd1', area_id: 'dev_area' }]);
  assert.equal(DataService.resolveAreaId({ entity_id: 'a.b', area_id: 'own', device_id: 'd1' }, devices), 'own');
  assert.equal(DataService.resolveAreaId({ entity_id: 'a.b', device_id: 'd1' }, devices), 'dev_area');
  assert.equal(DataService.resolveAreaId({ entity_id: 'a.b', device_id: 'nope' }, devices), undefined);
});

test('isVisibleInRegistry reads the display-registry hidden flag', () => {
  const hass = { entities: { 'a.h': { hidden: true }, 'a.ok': { hidden: false }, 'a.legacy': { hidden_by: 'user' } } };
  assert.equal(DataService.isVisibleInRegistry(hass, 'a.h'), false);
  assert.equal(DataService.isVisibleInRegistry(hass, 'a.ok'), true);
  assert.equal(DataService.isVisibleInRegistry(hass, 'a.legacy'), true);
  assert.equal(DataService.isVisibleInRegistry(hass, 'a.unknown'), true);
  assert.equal(DataService.isVisibleInRegistry({}, 'a.unknown'), true);
});
