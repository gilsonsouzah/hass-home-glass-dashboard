import { liquidGlassCSS } from '../../utils/LiquidGlassStyles';

export const HEADER_STYLE_ID = 'hg-header-styles';

export const HEADER_CSS = `
  /* Include liquid glass styles for shadow DOM context */
  ${liquidGlassCSS}

  /* Sticky header for home page, fixed for group pages */
  .hg-header {
    position: sticky;
    top: var(--ha-header-height, 0px);
    left: 0;
    right: 0;
    z-index: 3;
    background: transparent;
    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
    width: calc(100% + 2 * var(--apple-page-padding, 22px));
    margin-left: calc(-1 * var(--apple-page-padding, 22px));
    min-height: 44px;
  }

  .hg-header.rtl {
    margin-left: 0;
    margin-right: calc(-1 * var(--apple-page-padding, 22px));
  }

  /* Fixed positioning for group pages to prevent jumping */
  .hg-header.group-page {
    position: fixed;
    top: 0;
    left: 0;
    margin-left: 0;
    width: 100%;
    /* Dynamic positioning will be applied via JavaScript */
  }

  /* RTL fixed positioning for group pages */
  .hg-header.group-page.rtl {
    left: auto;
    right: 0;
    margin-left: 0;
    margin-right: 0;
  }

  .hg-header.scrolled {
    background: transparent;
  }

  .hg-header.scrolled::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    -webkit-mask-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 1) 0%,
      rgba(0, 0, 0, 0.7) 40%,
      rgba(0, 0, 0, 0) 100%
    );
    mask-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 1) 0%,
      rgba(0, 0, 0, 0.7) 40%,
      rgba(0, 0, 0, 0) 100%
    );
    z-index: -1;
    pointer-events: none;
  }

  .apple-header-content {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px var(--apple-page-padding, 22px);
    position: relative;
  }

  /* Back button - positioning only (glass effect from .liquid-glass-transparent) */
  .apple-header-back-button {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
  }

  .apple-header-back-button:active {
    transform: translateY(-50%) scale(0.95);
  }

  /* Fixed top position for group pages */
  .hg-header.group-page .apple-header-back-button {
    top: 12px;
    transform: none;
  }

  .hg-header.group-page .apple-header-back-button:active {
    transform: scale(0.95);
  }

  /* RTL positioning for group-page back button */
  .hg-header.group-page.rtl .apple-header-back-button {
    left: auto;
    right: 16px;
    top: 12px;
    transform: none;
  }

  .apple-header-back-button ha-icon {
    --mdc-icon-size: 26px;
    flex-shrink: 0;
    position: relative;
    z-index: 2;
  }

  .hg-header.rtl .apple-header-back-button {
    left: auto;
    right: 16px;
  }

  /* Mobile adjustments for back button */
  @media (max-width: 768px) {
    .apple-header-back-button {
      left: 12px;
      width: 34px;
      height: 34px;
      min-width: 34px;
    }

    .hg-header.rtl .apple-header-back-button {
      left: auto;
      right: 12px;
    }
  }

  /* Sidebar button - positioning only (glass effect from .liquid-glass-transparent) */
  .apple-header-sidebar-button {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
  }

  .apple-header-sidebar-button:active {
    transform: translateY(-50%) scale(0.95);
  }

  .apple-header-sidebar-button ha-icon {
    --mdc-icon-size: 22px;
    position: relative;
    z-index: 2;
  }

  .hg-header.rtl .apple-header-sidebar-button {
    left: auto !important;
    right: 16px !important;
  }

  /* Fixed top position for group pages */
  .hg-header.group-page .apple-header-sidebar-button {
    top: 13px;
    transform: none;
  }

  .hg-header.group-page .apple-header-sidebar-button:active {
    transform: scale(0.95);
  }

  /* RTL positioning for group-page sidebar button on desktop */
  .hg-header.group-page.rtl .apple-header-sidebar-button {
    left: auto !important;
    right: 16px !important;
  }

  /* Mobile adjustments for sidebar button */
  @media (max-width: 768px) {
    .apple-header-sidebar-button {
      left: 12px;
      width: 34px;
      height: 34px;
      min-width: 34px;
    }

    .hg-header.group-page .apple-header-sidebar-button {
      top: 13px;
    }

    /* RTL positioning for group-page sidebar button on mobile */
    .hg-header.group-page.rtl .apple-header-sidebar-button {
      left: auto !important;
      right: 12px !important;
      top: 10px;
    }

    .hg-header.rtl .apple-header-sidebar-button {
      left: auto !important;
      right: 12px !important;
    }
  }

  /* Scrolled content (center) */
  .apple-header-scrolled {
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease;
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
      min-height: 44px;
      display: flex;
      align-items: center;
    }

  .apple-header-scrolled-title {
    font-size: 17px;
    font-weight: 600;
    color: #ffffff;
    margin: 0;
    letter-spacing: -0.4px;
    white-space: nowrap;
  }

  .apple-header-scrolled-chips {
    display: none; /* Hidden by default - only show when scrolled */
    transition: all 0.2s ease;
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

  /* Show chips in header only when scrolled */
  .hg-header.scrolled .apple-header-scrolled-chips {
    display: block;
  }

  /* Menu button - positioning only (glass effect from .liquid-glass-transparent) */
  .apple-header-menu-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: 16px;
    z-index: 10;
    font-family: inherit;
  }

  .apple-header-menu-button:active {
    transform: translateY(-50%) scale(0.95);
  }

  /* Fixed top position for group pages */
  .hg-header.group-page .apple-header-menu-button {
    top: 12px;
    transform: none;
  }

  .hg-header.group-page .apple-header-menu-button:active {
    transform: scale(0.97);
  }

  /* RTL positioning for group-page menu button */
  .hg-header.group-page.rtl .apple-header-menu-button {
    right: auto !important;
    left: 16px !important;
    top: 12px;
    transform: none;
  }

  .hg-header.rtl .apple-header-menu-button {
    right: auto !important;
    left: 16px !important;
  }

  /* Mobile adjustments for menu button */
  @media (max-width: 768px) {
    .apple-header-menu-button {
      right: 12px;
      width: 34px;
      height: 34px;
      min-width: 34px;
    }

    .hg-header.rtl .apple-header-menu-button {
      right: auto !important;
      left: 12px !important;
    }
  }

  .apple-header-menu-button.edit-mode {
    background: rgba(255, 149, 0, 0.85) !important;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      inset 0 -1px 0 rgba(0, 0, 0, 0.1),
      0 2px 8px rgba(255, 149, 0, 0.3) !important;
  }

  .apple-header-menu-button.edit-mode::before {
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.5) 0%,
      rgba(255, 200, 100, 0.2) 25%,
      rgba(255, 255, 255, 0.35) 50%,
      rgba(255, 200, 100, 0.15) 75%,
      rgba(255, 255, 255, 0.45) 100%
    ) !important;
  }

  .apple-header-menu-button.edit-mode:hover {
    background: rgba(255, 159, 10, 0.9) !important;
  }

  .apple-header-menu-button.edit-mode:active {
    background: rgba(255, 139, 0, 0.95) !important;
  }

  .apple-header-menu-button.edit-mode ha-icon {
    --mdc-icon-size: 22px;
  }

  /* Dropdown */
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
    background: rgba(30, 30, 30, 0.75);
    backdrop-filter: blur(50px) saturate(180%);
    -webkit-backdrop-filter: blur(50px) saturate(180%);
    border-radius: var(--apple-modal-radius, 20px);
    padding: 4px 0;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-6px) scale(0.96);
    transition: all 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    z-index: 2000;
    pointer-events: none;
    box-shadow:
      0 0 0 0.5px rgba(255, 255, 255, 0.1),
      0 10px 40px rgba(0, 0, 0, 0.4);
  }

  .apple-header-dropdown::-webkit-scrollbar {
    display: none;
  }

  .hg-header.rtl .apple-header-dropdown {
    right: auto;
    left: 10px;
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
  }

  .apple-header-dropdown.dropdown-above.open {
    transform: translateY(0) scale(1);
  }

  .dropdown-separator {
    height: 0.5px;
    background: rgba(255, 255, 255, 0.1);
    margin: 4px 16px;
  }

  .dropdown-separator-thick {
    height: 0.5px;
    background: rgba(255, 255, 255, 0.15);
    margin: 6px 16px;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    padding: 0 12px;
    color: rgba(255, 255, 255, 0.9);
    cursor: pointer;
    transition: background 0.15s ease;
    font-size: 15px;
    font-weight: 400;
    letter-spacing: -0.2px;
    line-height: 1.3;
    min-height: 40px;
    direction: inherit;
  }

  .dropdown-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .dropdown-item:active {
    background: rgba(255, 255, 255, 0.12);
  }

  .dropdown-item span {
    flex: 1;
    direction: inherit;
    text-align: start;
  }

  .dropdown-item ha-icon {
    opacity: 0.6;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    color: rgba(255, 255, 255, 0.9);
    --mdc-icon-size: 20px;
  }

  /* Checkmark placeholder for all items */
  .dropdown-item .item-checkmark,
  .dropdown-item .room-checkmark {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    flex: 0 0 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Room items with checkmark space */
  .dropdown-item.room-item {
    padding: 0 12px;
  }

  .dropdown-item.room-item.active .room-checkmark::before {
    content: '✓';
    font-size: 15px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
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

  .dropdown-item.edit-item.active {
    background: rgba(255, 255, 255, 0.08);
  }

  .dropdown-item.edit-item.active ha-icon {
    opacity: 1;
  }

  /* Room items without icons should not have justify-content: space-between */
  .dropdown-item.room-item {
    justify-content: flex-start;
  }

  /* Ensure numeric content stays LTR in RTL layouts */
  .apple-header-content [data-numeric],
  .apple-header-content .numeric,
  .apple-header-content input[type="number"],
  .dropdown-item .number {
    direction: ltr;
    text-align: right;
    unicode-bidi: embed;
  }

  /* Ensure proper text alignment for RTL text in LTR numeric contexts */
  .hg-header.rtl .apple-header-content [data-numeric],
  .hg-header.rtl .apple-header-content .numeric,
  .hg-header.rtl .apple-header-content input[type="number"],
  .hg-header.rtl .dropdown-item .number {
    text-align: left; /* Numbers should be left-aligned even in RTL */
  }


  /* Shadow DOM support - ensure RTL styles work within shadow roots */
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

  /* Add top padding to page content when header is fixed (group pages) */
  .page-content.has-fixed-header {
    padding-top: 68px; /* Header height + some margin */
  }

  /* Responsive - tablet */
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
      font-size: 16px;
    }

    /* Adjust padding for mobile fixed header */
    .page-content.has-fixed-header {
      padding-top: 60px; /* Slightly less on mobile */
    }
  }

  /* Small mobile adjustments */
  @media (max-width: 479px) {
    .hg-header {
      width: calc(100% + 24px);
      margin-left: -12px;
    }

    .apple-header-content {
      padding: 8px 12px;
    }

    .apple-header-scrolled-title {
      font-size: 15px;
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

  /* Extra small / accessibility */
  @media (max-width: 359px) {
    .hg-header {
      width: calc(100% + 20px);
      margin-left: -10px;
    }

    .apple-header-content {
      padding: 6px 10px;
    }

    .apple-header-scrolled-title {
      font-size: 14px;
    }

    .apple-header-dropdown {
      width: 180px;
      right: 6px;
    }

    .hg-header.rtl .apple-header-dropdown {
      right: auto;
      left: 6px;
    }

    .dropdown-item {
      padding: 10px 14px;
      font-size: 14px;
    }

    .page-content.has-fixed-header {
      padding-top: 50px;
    }
  }

  /* Reduce motion for accessibility */
  @media (prefers-reduced-motion: reduce) {
    .hg-header,
    .apple-header-scrolled,
    .apple-header-dropdown,
    ha-drawer,
    home-assistant-main {
      transition: none !important;
    }
  }

  /* Smooth sidebar animations */
  ha-drawer {
    transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) !important;
  }

  /* RTL positioning for Home Assistant drawer */
  [dir="rtl"] ha-drawer {
    left: auto !important;
    right: 0 !important;
  }

  home-assistant-main {
    transition: margin-left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1) !important;
  }

  /* RTL margin adjustment for main content */
  [dir="rtl"] home-assistant-main {
    margin-left: 0 !important;
    margin-right: 256px !important;
  }

  /* Ensure sidebar content is visible when opened */
  ha-drawer ha-sidebar,
  ha-drawer [role="navigation"],
  ha-drawer .mdc-drawer__content {
    transition: opacity 0.2s ease !important;
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
