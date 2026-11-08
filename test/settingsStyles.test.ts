import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SETTINGS_CSS, PRESETS_CSS } from '../src/settings/settingsStyles.ts';

// Both modals start at opacity 0; the .show rule must target the content inside the same modal.
test('settings and presets sheets have a reachable .show content rule', () => {
  assert.match(SETTINGS_CSS, /\.hg-settings-modal\.show \.modal-content\s*\{[^}]*opacity:\s*1/);
  assert.match(PRESETS_CSS, /\.presets-selection-modal\.show \.presets-content\s*\{[^}]*opacity:\s*1/);
  assert.doesNotMatch(SETTINGS_CSS + PRESETS_CSS, /\.show \.(hg-settings-modal|presets-selection-modal) /);
});
