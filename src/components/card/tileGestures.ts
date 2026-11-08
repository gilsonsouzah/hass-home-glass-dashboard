import { createLongPress } from './quickControls';

const IGNORED_TARGETS = '.chevron-btn, .media-play-btn';
const CLICK_SUPPRESS_MS = 350;
const CONTEXT_MENU_SUPPRESS_MS = 600;

export interface TileGesture {
  detach: () => void;
  /** True while a click still belongs to a long press that already opened the sheet. */
  consumeClick: () => boolean;
}

/** Long press (pointer), context-menu key and Shift+F10 on a tile all call `open`. */
export function attachQuickControlsGesture(card: HTMLElement, open: () => void, enabled: () => boolean): TileGesture {
  let suppressUntil = -Infinity;
  let stopTracking: (() => void) | undefined;

  const longPress = createLongPress(() => {
    suppressUntil = Infinity;
    open();
  });

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || !enabled() || (e.target as Element).closest?.(IGNORED_TARGETS)) return;
    stopTracking?.();
    suppressUntil = -Infinity;

    // The sheet appears under the finger, so the release lands on it: track on window, not on the tile
    const onMove = (m: PointerEvent) => longPress.move(m.clientX, m.clientY);
    const onEnd = () => {
      stopTracking?.();
      if (longPress.up()) suppressUntil = performance.now() + CLICK_SUPPRESS_MS;
    };
    stopTracking = () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onEnd, true);
      window.removeEventListener('pointercancel', onEnd, true);
      stopTracking = undefined;
    };
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onEnd, true);
    window.addEventListener('pointercancel', onEnd, true);
    longPress.down(e.clientX, e.clientY);
  };

  // Touch long-presses and right-clicks arrive here; opening twice is a no-op in the caller
  const onContextMenu = (e: Event) => {
    if (!enabled()) return;
    e.preventDefault();
    suppressUntil = performance.now() + CONTEXT_MENU_SUPPRESS_MS;
    open();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target !== card || !enabled()) return;
    if (e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) return;
    e.preventDefault();
    open();
  };

  card.addEventListener('pointerdown', onPointerDown);
  card.addEventListener('contextmenu', onContextMenu);
  card.addEventListener('keydown', onKeyDown);

  return {
    detach() {
      stopTracking?.();
      longPress.cancel();
      card.removeEventListener('pointerdown', onPointerDown);
      card.removeEventListener('contextmenu', onContextMenu);
      card.removeEventListener('keydown', onKeyDown);
    },
    consumeClick: () => performance.now() < suppressUntil,
  };
}
