import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashboardUrl } from '../src/sections/navigation.ts';

test('dashboardUrl keeps the current dashboard as base', () => {
  assert.equal(dashboardUrl('/lovelace/home', 'scenes'), '/lovelace/scenes');
  assert.equal(dashboardUrl('/lovelace', '/cameras'), '/lovelace/cameras');
  assert.equal(dashboardUrl('/apple-home/room-kitchen', 'home'), '/apple-home/home');
  assert.equal(dashboardUrl('/', 'home'), '/lovelace/home');
});

test('dashboardUrl rejects empty paths and paths that would leave the dashboard', () => {
  assert.equal(dashboardUrl('/lovelace/home', '  '), null);
  assert.equal(dashboardUrl('/apple-home/home', 'config/devices'), null);
});
