import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isEntityHiddenOrDisabled, resolveEntityAreaId } from '../src/utils/registryDisplay.ts';

const hass = {
  entities: {
    'light.own_area': { entity_id: 'light.own_area', area_id: 'kitchen', device_id: 'd1' },
    'light.via_device': { entity_id: 'light.via_device', device_id: 'd1' },
    'light.orphan': { entity_id: 'light.orphan' },
    'light.hidden': { entity_id: 'light.hidden', hidden: true },
    'light.visible': { entity_id: 'light.visible', hidden: false },
  },
  devices: { d1: { area_id: 'garage' } },
};

test('resolveEntityAreaId prefers entity area, then device area, then no_area', () => {
  assert.equal(resolveEntityAreaId(hass, 'light.own_area'), 'kitchen');
  assert.equal(resolveEntityAreaId(hass, 'light.via_device'), 'garage');
  assert.equal(resolveEntityAreaId(hass, 'light.orphan'), 'no_area');
  assert.equal(resolveEntityAreaId(hass, 'light.unknown'), 'no_area');
  assert.equal(resolveEntityAreaId({}, 'light.x'), 'no_area');
});

test('isEntityHiddenOrDisabled reads the display-registry shape', () => {
  assert.equal(isEntityHiddenOrDisabled(hass, 'light.hidden'), true);
  assert.equal(isEntityHiddenOrDisabled(hass, 'light.visible'), false);
  // list_for_display omits disabled entities, so absence means disabled
  assert.equal(isEntityHiddenOrDisabled(hass, 'light.unknown'), true);
  // the audit's old check (hidden_by) never matches display-registry entries
  assert.equal(isEntityHiddenOrDisabled({ entities: { 'a.b': { hidden_by: 'user' } } }, 'a.b'), false);
});
