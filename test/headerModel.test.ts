import test from 'node:test';
import assert from 'node:assert/strict';
import {
  currentRoomId,
  editViewKey,
  orderAreas,
  shouldShowSidebarButton,
  type HeaderConfig,
} from '../src/sections/header/headerModel.ts';

const titles = { scenes: 'Scenes', cameras: 'Cameras' };
const config = (extra: Partial<HeaderConfig>): HeaderConfig => ({
  title: 'x',
  isGroupPage: false,
  showMenu: true,
  ...extra,
});

test('editViewKey prefers pageType over the title', () => {
  assert.equal(editViewKey(config({ pageType: 'scenes', title: 'Anything' }), titles), 'edit.edit_scenes_view');
  assert.equal(editViewKey(config({ pageType: 'cameras' }), titles), 'edit.edit_cameras_view');
  assert.equal(editViewKey(config({ pageType: 'room', title: 'Scenes' }), titles), 'edit.edit_room_view');
  assert.equal(editViewKey(config({ pageType: 'group', showBackButton: true }), titles), 'edit.edit_home_view');
});

test('editViewKey falls back to the title comparison without pageType', () => {
  assert.equal(editViewKey(config({ title: 'Scenes' }), titles), 'edit.edit_scenes_view');
  assert.equal(editViewKey(config({ title: 'Cameras' }), titles), 'edit.edit_cameras_view');
  assert.equal(editViewKey(config({ title: 'Kitchen', showBackButton: true }), titles), 'edit.edit_room_view');
  assert.equal(editViewKey(config({ title: 'Home' }), titles), 'edit.edit_home_view');
});

const sidebar = (extra = {}) => ({
  showBackButton: false,
  haHeaderVisible: false,
  haSidebarVisible: true,
  customHeaderHidden: false,
  customSidebarHidden: false,
  isMobile: true,
  ...extra,
});

test('shouldShowSidebarButton', () => {
  assert.equal(shouldShowSidebarButton(sidebar({ showBackButton: true })), false);
  assert.equal(shouldShowSidebarButton(sidebar({ haHeaderVisible: true })), false);
  assert.equal(shouldShowSidebarButton(sidebar({ haHeaderVisible: true, customHeaderHidden: true })), true);
  assert.equal(shouldShowSidebarButton(sidebar()), true);
  assert.equal(shouldShowSidebarButton(sidebar({ isMobile: false })), false);
  assert.equal(shouldShowSidebarButton(sidebar({ isMobile: false, haSidebarVisible: false })), true);
  assert.equal(shouldShowSidebarButton(sidebar({ isMobile: false, customSidebarHidden: true })), true);
});

test('orderAreas hides, honors saved order, then sorts by name', () => {
  const areas = [{ area_id: 'c', name: 'Zeta' }, { id: 'a', name: 'Alpha' }, { area_id: 'b' }, { area_id: 'h', name: 'H' }];
  const ids = (list: ReturnType<typeof orderAreas>) => list.map((a) => a.area_id ?? a.id);
  assert.deepEqual(ids(orderAreas(areas, ['c'], ['h'])), ['c', 'a', 'b']);
  assert.deepEqual(ids(orderAreas(areas, ['b', 'c'], [])), ['b', 'c', 'a', 'h']);
});

test('currentRoomId reads the trailing room- segment', () => {
  assert.equal(currentRoomId('/dash/room-kitchen'), 'kitchen');
  assert.equal(currentRoomId('/dash/home'), null);
});
