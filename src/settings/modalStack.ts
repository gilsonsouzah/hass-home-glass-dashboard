interface StackedModal {
  root: HTMLElement;
  onEscape: () => void;
  opener: HTMLElement | null;
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
const stack: StackedModal[] = [];

function deepActiveElement(): HTMLElement | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active instanceof HTMLElement ? active : null;
}

const focusables = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);

function onKeydown(e: KeyboardEvent): void {
  const top = stack[stack.length - 1];
  if (!top) return;

  if (e.key === 'Escape') {
    e.stopPropagation();
    top.onEscape();
    return;
  }

  if (e.key !== 'Tab') return;
  const items = focusables(top.root);
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = deepActiveElement();
  if (!active || !top.root.contains(active)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Makes `root` the top-most modal: Escape calls only its `onEscape`, Tab stays inside it,
 * and `release()` hands focus back to whatever had it on open.
 */
export function openModal(root: HTMLElement, onEscape: () => void): () => void {
  const entry: StackedModal = { root, onEscape, opener: deepActiveElement() };
  if (stack.length === 0) document.addEventListener('keydown', onKeydown, true);
  stack.push(entry);

  requestAnimationFrame(() => (focusables(root).find((el) => el.matches('.modal-done, .modal-cancel')) ?? root).focus());

  return () => {
    const index = stack.indexOf(entry);
    if (index === -1) return;
    stack.splice(index, 1);
    if (stack.length === 0) document.removeEventListener('keydown', onKeydown, true);
    if (entry.opener?.isConnected) entry.opener.focus();
  };
}
