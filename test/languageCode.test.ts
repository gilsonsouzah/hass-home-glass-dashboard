import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLanguage } from '../src/utils/languageCode.ts';

const supported = ['en', 'pt', 'zh', 'es'];

test('resolveLanguage maps region and script tags to the base language', () => {
  assert.equal(resolveLanguage('pt-BR', supported), 'pt');
  assert.equal(resolveLanguage('zh-Hans', supported), 'zh');
  assert.equal(resolveLanguage('zh-Hant', supported), 'zh');
  assert.equal(resolveLanguage('es-419', supported), 'es');
  assert.equal(resolveLanguage('PT_br', supported), 'pt');
});

test('resolveLanguage falls back for unsupported or missing tags', () => {
  assert.equal(resolveLanguage('ja', supported), 'en');
  assert.equal(resolveLanguage(undefined, supported), 'en');
  assert.equal(resolveLanguage('', supported), 'en');
});
