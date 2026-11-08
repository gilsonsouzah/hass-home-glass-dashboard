import { liquidGlassCSS } from '../../utils/LiquidGlassStyles';

export const HEADER_STYLE_ID = 'hg-header-styles';

export const HEADER_CSS = `
  ${liquidGlassCSS}

  .hg-header {
    position: sticky;
    top: var(--ha-header-height, 0px);
    left: 0;
    right: 0;
    z-index: 3;
    background: transparent;
    font-family: var(--hg-font);
    width: calc(100% + 2 * var(--hg-page-padding));
    margin-left: calc(-1 * var(--hg-page-padding));
    min-height: var(--hg-hit-min);
  }

  .hg-header.rtl {
    margin-left: 0;
    margin-right: calc(-1 * var(--hg-page-padding));
  }

  .hg-header.group-page {
    position: fixed;
    top: 0;
    left: 0;
    margin-left: 0;
    width: 100%;
  }

  .hg-header.group-page.rtl {
    left: auto;
    right: 0;
    margin-left: 0;
    margin-right: 0;
  }

  .hg-header::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--hg-glass-regular);
    -webkit-backdrop-filter: var(--hg-backdrop-regular);
    backdrop-filter: var(--hg-backdrop-regular);
    -webkit-mask-image: linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0.7) 40%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0.7) 40%, transparent 100%);
    opacity: 0;
    transition: opacity var(--hg-dur) var(--hg-ease-standard);
    z-index: -1;
    pointer-events: none;
  }

  .hg-header.scrolled::before {
    opacity: 1;
  }

  .apple-header-content {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px var(--hg-page-padding);
    position: relative;
  }

  .apple-header-back-button,
  .apple-header-sidebar-button,
  .apple-header-menu-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    width: var(--hg-hit-min) !important;
    height: var(--hg-hit-min) !important;
    min-width: var(--hg-hit-min) !important;
    font-family: inherit;
  }

  .apple-header-back-button,
  .apple-header-sidebar-button {
    left: 16px;
  }

  .apple-header-menu-button {
    right: 16px;
  }

  .apple-header-back-button:active,
  .apple-header-sidebar-button:active,
  .apple-header-menu-button:active {
    transform: translateY(-50%) scale(var(--hg-press-scale));
  }

  .hg-header.scrolled .liquid-glass-transparent:not(.edit-mode) {
    background: var(--hg-glass-regular) !important;
  }

  .hg-header.group-page .apple-header-back-button,
  .hg-header.group-page .apple-header-sidebar-button,
  .hg-header.group-page .apple-header-menu-button {
    top: 12px;
    transform: none;
  }

  .hg-header.group-page .apple-header-back-button:active,
  .hg-header.group-page .apple-header-sidebar-button:active,
  .hg-header.group-page .apple-header-menu-button:active {
    transform: scale(var(--hg-press-scale));
  }

  .apple-header-back-button ha-icon {
    --mdc-icon-size: 26px;
    flex-shrink: 0;
  }

  .apple-header-sidebar-button ha-icon {
    --mdc-icon-size: var(--hg-action-icon-size);
  }

  .hg-header.rtl .apple-header-back-button,
  .hg-header.rtl .apple-header-sidebar-button {
    left: auto !important;
    right: 16px !important;
  }

  .hg-header.rtl .apple-header-menu-button {
    right: auto !important;
    left: 16px !important;
  }

  @media (max-width: 768px) {
    .apple-header-back-button,
    .apple-header-sidebar-button {
      left: 12px;
    }

    .apple-header-menu-button {
      right: 12px;
    }

    .hg-header.rtl .apple-header-back-button,
    .hg-header.rtl .apple-header-sidebar-button {
      right: 12px !important;
    }

    .hg-header.rtl .apple-header-menu-button {
      left: 12px !important;
    }

    .hg-header.group-page .apple-header-sidebar-button {
      top: 13px;
    }

    .hg-header.group-page.rtl .apple-header-sidebar-button {
      top: 10px;
    }
  }

  .apple-header-menu-button.edit-mode {
    background: var(--hg-color-orange) !important;
    color: var(--hg-label-on-active) !important;
  }

  .apple-header-menu-button.edit-mode ha-icon {
    --mdc-icon-size: var(--hg-action-icon-size);
  }

  .apple-header-scrolled {
    opacity: 0;
    visibility: hidden;
    transition:
      opacity var(--hg-dur) var(--hg-ease-standard),
      visibility var(--hg-dur) var(--hg-ease-standard);
    pointer-events: none;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .hg-header.scrolled .apple-header-scrolled {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    width: 100%;
  }

  .apple-header-scrolled-title-container {
    min-height: var(--hg-hit-min);
    display: flex;
    align-items: center;
  }

  .apple-header-scrolled-title {
    font-size: var(--hg-text-headline-size);
    line-height: var(--hg-text-headline-line);
    font-weight: var(--hg-text-headline-weight);
    color: var(--hg-label);
    margin: 0;
    white-space: nowrap;
  }

  .apple-header-scrolled-chips {
    display: none;
    width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .apple-header-scrolled-chips::-webkit-scrollbar {
    display: none;
  }

  .hg-header.scrolled .apple-header-scrolled-chips {
    display: block;
  }

  .apple-header-dropdown {
    position: absolute;
    top: calc(100% - 50px);
    right: 10px;
    width: 220px;
    max-height: calc(100vh - 150px);
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    border-radius: var(--hg-radius-sheet);
    padding: 6px 0;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-6px) scale(0.96);
    transform-origin: top right;
    transition:
      opacity var(--hg-dur-fast) var(--hg-ease-standard),
      transform var(--hg-dur) var(--hg-ease-spring),
      visibility var(--hg-dur) var(--hg-ease-standard);
    z-index: 2000;
    pointer-events: none;
  }

  .apple-header-dropdown::-webkit-scrollbar {
    display: none;
  }

  .hg-header.rtl .apple-header-dropdown {
    right: auto;
    left: 10px;
    transform-origin: top left;
  }

  .apple-header-dropdown.open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  .apple-header-dropdown.dropdown-above {
    top: auto;
    bottom: calc(100% - 18px);
    transform: translateY(6px) scale(0.96);
    transform-origin: bottom right;
  }

  .hg-header.rtl .apple-header-dropdown.dropdown-above {
    transform-origin: bottom left;
  }

  .apple-header-dropdown.dropdown-above.open {
    transform: translateY(0) scale(1);
  }

  .dropdown-separator {
    height: 1px;
    background: var(--hg-separator);
    margin: 4px 16px;
  }

  .dropdown-separator-thick {
    height: 8px;
    background: var(--hg-fill);
    margin: 6px 0;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    padding: 0 16px 0 12px;
    color: var(--hg-label);
    cursor: pointer;
    transition: background-color var(--hg-dur-fast) var(--hg-ease-standard);
    font-size: var(--hg-text-callout-size);
    line-height: var(--hg-text-callout-line);
    font-weight: var(--hg-text-callout-weight);
    min-height: var(--hg-hit-min);
    direction: inherit;
    -webkit-tap-highlight-color: transparent;
  }

  @media (hover: hover) {
    .dropdown-item:hover {
      background: var(--hg-fill);
    }
  }

  .dropdown-item:active {
    background: var(--hg-fill);
  }

  .dropdown-item:focus-visible {
    outline: var(--hg-focus-ring);
    outline-offset: calc(-1 * var(--hg-focus-offset));
    background: var(--hg-fill);
  }

  .dropdown-item span {
    flex: 1;
    direction: inherit;
    text-align: start;
  }

  .dropdown-item ha-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    color: var(--hg-label-secondary);
    --mdc-icon-size: 20px;
  }

  .dropdown-item .item-checkmark,
  .dropdown-item .room-checkmark {
    flex: 0 0 20px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dropdown-item.room-item.active .room-checkmark::before {
    content: '✓';
    font-weight: 600;
    color: var(--hg-label);
  }

  .hg-header.rtl .dropdown-item ha-icon {
    order: 2;
  }

  .hg-header.rtl .dropdown-item span {
    order: 1;
  }

  .hg-header.rtl .dropdown-item.room-item {
    padding-left: 20px;
    padding-right: 16px;
  }

  .dropdown-item.edit-item.active ha-icon {
    color: var(--hg-label);
  }

  .apple-header-content [data-numeric],
  .apple-header-content .numeric,
  .apple-header-content input[type="number"],
  .dropdown-item .number {
    direction: ltr;
    text-align: right;
    unicode-bidi: embed;
  }

  .hg-header.rtl .apple-header-content [data-numeric],
  .hg-header.rtl .apple-header-content .numeric,
  .hg-header.rtl .apple-header-content input[type="number"],
  .hg-header.rtl .dropdown-item .number {
    text-align: left;
  }

  :host([dir="rtl"]) .apple-header-back-button,
  :host-context([dir="rtl"]) .apple-header-back-button {
    left: auto;
    right: 16px;
    justify-content: flex-end;
  }

  :host([dir="rtl"]) .apple-header-menu-button,
  :host-context([dir="rtl"]) .apple-header-menu-button {
    right: auto;
    left: 16px;
  }

  :host([dir="rtl"]) .apple-header-dropdown,
  :host-context([dir="rtl"]) .apple-header-dropdown {
    right: auto;
    left: 10px;
  }

  .page-content.has-fixed-header {
    padding-top: 68px;
  }

  @media (max-width: 768px) {
    .hg-header {
      width: calc(100% + 32px);
      margin-left: -16px;
    }

    .hg-header.group-page {
      width: 100%;
      margin-left: 0;
    }

    .apple-header-content {
      padding: 8px 16px;
    }

    .apple-header-scrolled-title {
      font-size: var(--hg-text-callout-size);
    }

    .page-content.has-fixed-header {
      padding-top: 60px;
    }
  }

  @media (max-width: 479px) {
    .hg-header {
      width: calc(100% + 24px);
      margin-left: -12px;
    }

    .apple-header-content {
      padding: 8px 12px;
    }

    .apple-header-scrolled-title {
      font-size: var(--hg-text-subhead-size);
    }

    .apple-header-dropdown {
      width: 200px;
      right: 8px;
    }

    .hg-header.rtl .apple-header-dropdown {
      right: auto;
      left: 8px;
    }
  }

  @media (max-width: 359px) {
    .hg-header {
      width: calc(100% + 20px);
      margin-left: -10px;
    }

    .apple-header-content {
      padding: 6px 10px;
    }

    .apple-header-dropdown {
      width: 180px;
      right: 6px;
    }

    .hg-header.rtl .apple-header-dropdown {
      right: auto;
      left: 6px;
    }

    .page-content.has-fixed-header {
      padding-top: 50px;
    }
  }

  ha-drawer {
    transition: transform var(--hg-dur-slow) var(--hg-ease-standard) !important;
  }

  [dir="rtl"] ha-drawer {
    left: auto !important;
    right: 0 !important;
  }

  home-assistant-main {
    transition: margin-left var(--hg-dur-slow) var(--hg-ease-standard) !important;
  }

  [dir="rtl"] home-assistant-main {
    margin-left: 0 !important;
    margin-right: 256px !important;
  }

  ha-drawer ha-sidebar,
  ha-drawer [role="navigation"],
  ha-drawer .mdc-drawer__content {
    transition: opacity var(--hg-dur) var(--hg-ease-standard) !important;
  }

  @media (max-width: 768px) {
    ha-drawer {
      position: fixed !important;
      z-index: 101 !important;
    }

    [dir="rtl"] ha-drawer {
      left: auto !important;
      right: 0 !important;
    }

    [dir="rtl"] home-assistant-main {
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
  }
`;

export function injectHeaderStyles(container: HTMLElement | undefined): void {
  const rootNode = container?.getRootNode();
  const styleRoot: ParentNode = rootNode instanceof ShadowRoot ? rootNode : document;
  if (styleRoot.querySelector(`#${HEADER_STYLE_ID}`)) return;

  const style = document.createElement('style');
  style.id = HEADER_STYLE_ID;
  style.textContent = HEADER_CSS;

  if (rootNode instanceof ShadowRoot) {
    rootNode.appendChild(style);
  } else {
    document.head.appendChild(style);
  }
}
