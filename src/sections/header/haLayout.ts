import { RTLHelper } from '../../utils/RTLHelper';

function drawerParts() {
  const homeAssistantMain = document.querySelector('home-assistant')?.shadowRoot?.querySelector('home-assistant-main');
  const haDrawer = homeAssistantMain?.shadowRoot?.querySelector('ha-drawer') as HTMLElement | undefined;
  const haPanelLovelace = haDrawer?.querySelector('ha-panel-lovelace') as HTMLElement | undefined;
  const huiRoot = haPanelLovelace?.shadowRoot?.querySelector('hui-root') as HTMLElement | undefined;
  return { homeAssistantMain, haDrawer, haPanelLovelace, huiRoot };
}

function findWidthContainer(): HTMLElement {
  const { haPanelLovelace } = drawerParts();
  return haPanelLovelace && haPanelLovelace.getBoundingClientRect().width > 0 ? haPanelLovelace : document.body;
}

/** Height of HA's native toolbar, or 0 when it is not rendered. */
export function getHomeAssistantHeaderHeight(): number {
  try {
    const header = drawerParts().huiRoot?.shadowRoot?.querySelector('.header');
    return header ? header.getBoundingClientRect().height : 0;
  } catch {
    return 0;
  }
}

export function positionFixedHeader(headerElement: HTMLElement): void {
  const rect = findWidthContainer().getBoundingClientRect();

  if (RTLHelper.isRTL()) {
    headerElement.style.right = `${window.innerWidth - rect.right}px`;
    headerElement.style.left = 'auto';
  } else {
    headerElement.style.left = `${rect.left}px`;
    headerElement.style.right = 'auto';
  }
  headerElement.style.width = `${rect.width}px`;
  headerElement.style.top = getHomeAssistantHeaderHeight() + 'px';
}

/** Resolves once HA's lovelace root is rendered, or after 5s so callers never hang. */
export function waitForHAInterface(): Promise<void> {
  return new Promise((resolve) => {
    const maxAttempts = 100;
    let attempts = 0;

    const check = () => {
      const { homeAssistantMain, haDrawer, haPanelLovelace, huiRoot } = drawerParts();
      const ready = homeAssistantMain && haDrawer && haPanelLovelace && huiRoot?.shadowRoot;

      if (ready || ++attempts >= maxAttempts) {
        resolve();
        return;
      }
      setTimeout(check, 50);
    };

    check();
  });
}

/** Asks HA to open its sidebar as an overlay. */
export function openHaSidebar(): void {
  try {
    const main = document.querySelector('home-assistant')?.shadowRoot?.querySelector('home-assistant-main');
    main?.dispatchEvent(
      new CustomEvent('hass-toggle-menu', { detail: { open: true }, bubbles: true, composed: true })
    );
  } catch (error) {
    console.error('HomeHeader: Error dispatching sidebar toggle event:', error);
  }
}

/**
 * Watches the HA elements whose geometry or visibility moves the header.
 * `onChange` also covers sidebar/header visibility; `onResize` only geometry.
 */
export function observeHaLayout(onChange: () => void, onResize: () => void): { disconnect(): void } {
  const { homeAssistantMain, haDrawer, haPanelLovelace, huiRoot } = drawerParts();
  const observers: Array<MutationObserver | ResizeObserver> = [];
  const frame = (fn: () => void) => () => requestAnimationFrame(fn);

  const mutations = (target: Node, options: MutationObserverInit, fn: () => void) => {
    const observer = new MutationObserver(frame(fn));
    observer.observe(target, options);
    observers.push(observer);
  };
  const resizes = (target: Element, fn: () => void) => {
    if (!window.ResizeObserver) return;
    const observer = new ResizeObserver(frame(fn));
    observer.observe(target);
    observers.push(observer);
  };

  if (homeAssistantMain) {
    mutations(homeAssistantMain, { attributes: true, attributeFilter: ['expanded'] }, onChange);
  }

  const huiShadow = huiRoot?.shadowRoot;
  if (huiShadow) {
    mutations(
      huiShadow,
      { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] },
      onChange
    );

    const header = huiShadow.querySelector('.header') as HTMLElement | null;
    if (header) {
      mutations(header, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] }, onChange);
      resizes(header, onResize);
    }
  }

  if (haDrawer) resizes(haDrawer, onResize);
  if (haPanelLovelace) resizes(haPanelLovelace, onResize);

  return { disconnect: () => observers.forEach((observer) => observer.disconnect()) };
}
