import { test } from 'node:test';
import assert from 'node:assert/strict';
import { averageLuminance, dimFor, gradientLuminance, imageUrlOf, wallpaperTone } from '../src/utils/wallpaperLuminance.ts';

test('averageLuminance is 0 for black, 1 for white and ignores alpha', () => {
  assert.equal(averageLuminance([0, 0, 0, 255]), 0);
  assert.ok(Math.abs(averageLuminance([255, 255, 255, 0]) - 1) < 1e-9);
  assert.ok(Math.abs(averageLuminance([255, 255, 255, 255, 0, 0, 0, 255]) - 0.5) < 1e-9);
});

test('averageLuminance of empty data is neutral', () => {
  assert.equal(averageLuminance([]), 0.5);
});

test('gradientLuminance averages rgb and rgba stops and returns undefined without any', () => {
  assert.ok(Math.abs(gradientLuminance('linear-gradient(red, rgba(255,255,255,0.8))')! - 1) < 1e-9);
  assert.ok(Math.abs(gradientLuminance('linear-gradient(135deg, rgb(255 255 255) 0%, rgba(0, 0, 0, 1) 100%)')! - 0.5) < 1e-9);
  assert.equal(gradientLuminance('linear-gradient(red, blue)'), undefined);
});

test('imageUrlOf extracts quoted, unquoted and multi-line data urls', () => {
  assert.equal(imageUrlOf('url(data:image/jpeg;base64,AAA)'), 'data:image/jpeg;base64,AAA');
  assert.equal(imageUrlOf('\n  url("/a b.png")\n'), '/a b.png');
  assert.equal(imageUrlOf('linear-gradient(red, blue)'), undefined);
});

test('wallpaperTone switches at the threshold and dimFor grows with luminance', () => {
  assert.equal(wallpaperTone(0.59), 'dark');
  assert.equal(wallpaperTone(0.6), 'light');
  assert.equal(dimFor(0), 'rgba(0, 0, 0, 0.20)');
  assert.equal(dimFor(1), 'rgba(0, 0, 0, 0.50)');
});
