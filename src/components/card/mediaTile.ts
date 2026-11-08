// Pure model for the artwork media tile. No imports and no DOM so node:test can load it.

type Attrs = Record<string, any>;

const ARTWORK_STATES = ['playing', 'paused', 'buffering', 'idle', 'on'];
const PAUSE = 1;
const PLAY = 16384;

export interface MediaTileModel {
  artwork: string;
  playing: boolean;
  canPlayPause: boolean;
  /** "Title · Artist", or null when the player reports no title. */
  line: string | null;
}

/** Relative paths go through hass.hassUrl; only http(s) and root-relative pictures are accepted. */
export function resolveArtworkUrl(picture: unknown, hassUrl?: (path: string) => string): string | null {
  if (typeof picture !== 'string' || !picture) return null;
  if (/^https?:\/\//i.test(picture)) return picture;
  if (picture.startsWith('/') && !picture.startsWith('//')) return hassUrl ? hassUrl(picture) : picture;
  return null;
}

export function mediaStateLine(attrs: Attrs): string | null {
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const parts = [text(attrs.media_title), text(attrs.media_artist)].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export function mediaTileModel(
  state: { state: string; attributes: Attrs },
  hassUrl?: (path: string) => string
): MediaTileModel | null {
  if (!ARTWORK_STATES.includes(state.state)) return null;
  const artwork = resolveArtworkUrl(state.attributes.entity_picture, hassUrl);
  if (!artwork) return null;
  const supported = typeof state.attributes.supported_features === 'number' ? state.attributes.supported_features : 0;
  return {
    artwork,
    playing: state.state === 'playing',
    canPlayPause: (supported & (PAUSE | PLAY)) === (PAUSE | PLAY),
    line: mediaStateLine(state.attributes),
  };
}
