import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tokensCSS } from '../src/styles/tokens.ts';
import { glassCSS } from '../src/styles/glass.ts';

const SRC = join(import.meta.dirname, '../src');
// LiquidGlassStyles.ts imports extensionless paths node cannot resolve, so it is read as text.
const buttonSource = readFileSync(join(SRC, 'utils/LiquidGlassStyles.ts'), 'utf8');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : /\.(ts|js)$/.test(entry.name) ? [join(dir, entry.name)] : []
  );
}

const names = (css: string, prefix: string) => new Set(css.match(new RegExp(`${prefix}[a-z0-9]+(?:-[a-z0-9]+)*`, 'g')));
const definedNames = (css: string, prefix: string) =>
  new Set([...css.matchAll(new RegExp(`(${prefix}[a-z0-9-]+)\\s*:`, 'g'))].map((m) => m[1]));

function block(header: string): string {
  const start = tokensCSS.indexOf(`${header} {`);
  assert.notEqual(start, -1, `missing block ${header}`);
  return tokensCSS.slice(start, tokensCSS.indexOf('\n}', start));
}

test('every --apple-* variable referenced in src is defined by the tokens', () => {
  const defined = definedNames(tokensCSS, '--apple-');
  const used = new Set(sourceFiles(SRC).flatMap((file) => [...names(readFileSync(file, 'utf8'), '--apple-')]));
  assert.ok(used.size > 0);
  const missing = [...used].filter((name) => !defined.has(name));
  assert.deepEqual(missing, []);
});

test('light and dark scheme blocks define the same --hg-* names', () => {
  const dark = definedNames(block(':root, :root[data-hg-scheme="dark"]'), '--hg-');
  const light = definedNames(block(':root[data-hg-scheme="light"]'), '--hg-');
  assert.ok(dark.size > 20);
  assert.deepEqual([...light].sort(), [...dark].sort());
});

test('prefers-color-scheme fallback repeats the light block', () => {
  const light = definedNames(block(':root[data-hg-scheme="light"]'), '--hg-');
  const fallback = definedNames(block('  :root:not([data-hg-scheme])'), '--hg-');
  assert.deepEqual([...fallback].sort(), [...light].sort());
});

test('every --hg-* variable consumed by the glass rules is defined', () => {
  const defined = definedNames(tokensCSS, '--hg-');
  const used = names(`${glassCSS}${buttonSource}`, '--hg-');
  assert.deepEqual([...used].filter((name) => !defined.has(name)), []);
});

test('no rule transitions all', () => {
  for (const css of [tokensCSS, glassCSS, buttonSource]) assert.doesNotMatch(css, /transition:\s*all/);
});
