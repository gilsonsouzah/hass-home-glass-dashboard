/** Pointer position of a mouse or touch event. Avoids `instanceof TouchEvent`, which is undefined in desktop Safari. */
export function pointOf(e: MouseEvent | TouchEvent): { x: number; y: number } {
  const p = 'touches' in e ? e.touches[0] : e;
  return { x: p.clientX, y: p.clientY };
}
