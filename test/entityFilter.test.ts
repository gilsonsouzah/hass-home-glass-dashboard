import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupOfEntity, isSwitchShown } from '../src/pages/entityFilter.ts';

const rules = {
  isOutlet: (_id: string, attrs: any) => attrs?.device_class === 'outlet',
  getDeviceGroup: (domain: string, _id?: string, _attrs?: any, showSwitches?: boolean) =>
    domain === 'switch' ? (showSwitches ? 'OTHER' : undefined) : 'LIGHTING',
} as any;
const outlet = { device_class: 'outlet' };

test('isSwitchShown: switches setting off shows only outlets and included switches', () => {
  assert.equal(isSwitchShown(rules, 'switch.o', outlet, false, []), true);
  assert.equal(isSwitchShown(rules, 'switch.i', {}, false, ['switch.i']), true);
  assert.equal(isSwitchShown(rules, 'switch.x', {}, false, []), false);
});

test('isSwitchShown: switches setting on defers to the device group', () => {
  assert.equal(isSwitchShown(rules, 'switch.x', {}, true, []), true);
  assert.equal(isSwitchShown({ ...rules, getDeviceGroup: () => undefined }, 'switch.x', {}, true, []), false);
});

test('groupOfEntity: hidden switches have no group, outlets force the group lookup', () => {
  assert.equal(groupOfEntity(rules, 'switch.x', {}, false, []), undefined);
  assert.equal(groupOfEntity(rules, 'switch.o', outlet, false, []), 'OTHER');
  assert.equal(groupOfEntity(rules, 'switch.i', {}, false, ['switch.i']), 'OTHER');
  assert.equal(groupOfEntity(rules, 'light.a', {}, false, []), 'LIGHTING');
});
