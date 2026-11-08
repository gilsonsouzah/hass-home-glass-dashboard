import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mediaStateLine, mediaTileModel, resolveArtworkUrl } from '../src/components/card/mediaTile.ts';

const hassUrl = (path: string) => `http://ha.local:8123${path}`;

test('artwork urls: relative goes through hassUrl, absolute http(s) is kept, anything else is dropped', () => {
  assert.equal(resolveArtworkUrl('/api/media_player_proxy/x?token=a', hassUrl), 'http://ha.local:8123/api/media_player_proxy/x?token=a');
  assert.equal(resolveArtworkUrl('/api/x'), '/api/x');
  assert.equal(resolveArtworkUrl('https://img.example/a.jpg', hassUrl), 'https://img.example/a.jpg');
  assert.equal(resolveArtworkUrl('//evil.example/a.jpg', hassUrl), null);
  assert.equal(resolveArtworkUrl('javascript:alert(1)', hassUrl), null);
  assert.equal(resolveArtworkUrl('data:image/png;base64,AAAA', hassUrl), null);
  assert.equal(resolveArtworkUrl('', hassUrl), null);
  assert.equal(resolveArtworkUrl(undefined, hassUrl), null);
});

test('state line joins title and artist and skips blanks', () => {
  assert.equal(mediaStateLine({ media_title: 'Song', media_artist: 'Band' }), 'Song · Band');
  assert.equal(mediaStateLine({ media_title: ' Song ' }), 'Song');
  assert.equal(mediaStateLine({ media_artist: 'Band' }), 'Band');
  assert.equal(mediaStateLine({ media_title: '  ', media_artist: 5 }), null);
});

test('tile model needs artwork and an active player', () => {
  const attrs = { entity_picture: '/api/art', media_title: 'T', supported_features: 16385 };
  assert.deepEqual(mediaTileModel({ state: 'playing', attributes: attrs }, hassUrl), {
    artwork: 'http://ha.local:8123/api/art',
    playing: true,
    canPlayPause: true,
    line: 'T',
  });
  assert.equal(mediaTileModel({ state: 'paused', attributes: attrs }, hassUrl)?.playing, false);
  for (const state of ['off', 'unavailable', 'unknown', 'standby']) {
    assert.equal(mediaTileModel({ state, attributes: attrs }, hassUrl), null, state);
  }
  assert.equal(mediaTileModel({ state: 'playing', attributes: { media_title: 'T' } }, hassUrl), null);
});

test('play/pause button needs the PAUSE or PLAY feature', () => {
  const base = { entity_picture: '/api/art' };
  assert.equal(mediaTileModel({ state: 'playing', attributes: { ...base, supported_features: 4 } }, hassUrl)?.canPlayPause, false);
  assert.equal(mediaTileModel({ state: 'playing', attributes: { ...base, supported_features: 1 } }, hassUrl)?.canPlayPause, true);
  assert.equal(mediaTileModel({ state: 'playing', attributes: base }, hassUrl)?.canPlayPause, false);
});
