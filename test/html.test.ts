import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../src/utils/html.ts';

test('escapeHtml neutralizes markup and quotes', () => {
  assert.equal(escapeHtml('<img src=x onerror="a">&\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(21.5), '21.5');
});
