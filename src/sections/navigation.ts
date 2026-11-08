/** Dashboard-relative URL for `path` (first URL segment is the dashboard), or null if it must not be navigated to. */
export function dashboardUrl(pathname: string, path: string): string | null {
  const target = path.startsWith('/') ? path.slice(1) : path;
  if (!target.trim()) return null;

  const dashboard = pathname.split('/').find((part) => part.length > 0);
  const basePath = !dashboard || dashboard === 'lovelace' ? '/lovelace/' : `/${dashboard}/`;
  const url = `${basePath}${target}`;

  // A /config/ URL would leave the dashboard for HA's settings pages
  return url.includes('/config/') && !basePath.includes('/config/') ? null : url;
}

export function navigateToDashboardPath(path: string): void {
  const url = dashboardUrl(window.location.pathname, path);
  if (!url) return;

  window.history.pushState(null, '', url);
  window.dispatchEvent(new Event('location-changed', { bubbles: true, composed: true }));
}

export function onActivate(el: HTMLElement, handler: () => void): void {
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  el.addEventListener('click', handler);
  el.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handler();
  });
}
