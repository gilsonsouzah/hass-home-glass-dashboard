export function getScrollParent(start: Element): Element | null {
  let el: Element | null = start;
  while (el) {
    if (el instanceof ShadowRoot) {
      el = (el as ShadowRoot).host;
      continue;
    }
    if (el instanceof HTMLElement) {
      const style = window.getComputedStyle(el);
      if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) {
        return el;
      }
    }
    el = el.parentElement || (el.getRootNode() as ShadowRoot)?.host || null;
  }
  return document.scrollingElement || document.documentElement;
}
