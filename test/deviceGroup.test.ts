import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeviceGroup, getDeviceGroup } from '../src/config/deviceGroup.ts';

const group = (domain: string, device_class?: string, extra: object = {}, showSwitches?: boolean) =>
  getDeviceGroup(domain, `${domain}.x`, { device_class, ...extra }, showSwitches);

test('binary_sensor and sensor are security only for security-relevant device classes', () => {
  for (const dc of [
    'door',
    'window',
    'motion',
    'occupancy',
    'opening',
    'garage_door',
    'lock',
    'safety',
    'smoke',
    'gas',
    'tamper',
  ]) {
    assert.equal(group('binary_sensor', dc), DeviceGroup.SECURITY, dc);
  }
  for (const dc of ['battery', 'connectivity', 'problem', 'moisture', undefined]) {
    assert.equal(group('binary_sensor', dc), DeviceGroup.OTHER, String(dc));
  }
  assert.equal(group('binary_sensor', 'light'), DeviceGroup.LIGHTING);
  assert.equal(group('sensor', 'pressure'), DeviceGroup.OTHER);
  assert.equal(group('sensor', undefined), DeviceGroup.OTHER);
  assert.equal(group('sensor', 'gas'), DeviceGroup.SECURITY);
});

test('sensors keep their natural groups', () => {
  assert.equal(group('sensor', 'temperature'), DeviceGroup.CLIMATE);
  assert.equal(group('sensor', undefined, { unit_of_measurement: '°C' }), DeviceGroup.CLIMATE);
  assert.equal(group('sensor', 'humidity'), DeviceGroup.CLIMATE);
  assert.equal(group('sensor', 'illuminance'), DeviceGroup.LIGHTING);
  assert.equal(group('sensor', 'power'), DeviceGroup.ENERGY);
});

test('entities without attributes fall back to the domain table, not security', () => {
  assert.equal(getDeviceGroup('sensor'), DeviceGroup.OTHER);
  assert.equal(getDeviceGroup('binary_sensor'), DeviceGroup.OTHER);
  assert.equal(getDeviceGroup('lock'), DeviceGroup.SECURITY);
});

test('covers: garage and gate are security, others climate', () => {
  assert.equal(group('cover', 'garage'), DeviceGroup.SECURITY);
  assert.equal(group('cover', 'gate'), DeviceGroup.SECURITY);
  assert.equal(group('cover', 'blind'), DeviceGroup.CLIMATE);
});

test('switches: outlets always shown, others only unless explicitly disabled', () => {
  assert.equal(group('switch', 'outlet', {}, false), DeviceGroup.OTHER);
  assert.equal(group('switch', 'switch', {}, true), DeviceGroup.OTHER);
  assert.equal(group('switch', 'switch', {}, undefined), DeviceGroup.OTHER);
  assert.equal(group('switch', 'switch', {}, false), undefined);
});
