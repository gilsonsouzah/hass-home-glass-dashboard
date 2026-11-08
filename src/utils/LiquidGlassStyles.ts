/**
 * Liquid Glass button rules and the injection of the design tokens (styles/tokens.ts)
 * and shared glass classes (styles/glass.ts) into the document head.
 * Shadow roots inherit the tokens but not the classes: they include liquidGlassCSS in their own <style>.
 */
import { tokensCSS } from '../styles/tokens';
import { glassCSS } from '../styles/glass';

const TOKENS_STYLE_ID = 'hg-design-tokens';
const GLASS_STYLE_ID = 'hg-glass-styles';

export const designTokensCSS = tokensCSS;

const buttonCSS = `
.liquid-glass-btn {
  border: none !important;
  border-radius: 50% !important;
  color: var(--hg-label) !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  position: relative;
  isolation: isolate;
  width: var(--hg-action-btn-size) !important;
  height: var(--hg-action-btn-size) !important;
  min-width: var(--hg-action-btn-size) !important;
  transition:
    transform var(--hg-dur-fast) var(--hg-ease-spring),
    background-color var(--hg-dur) var(--hg-ease-standard),
    box-shadow var(--hg-dur) var(--hg-ease-standard) !important;
}

.liquid-glass-btn:active {
  transform: scale(var(--hg-press-scale));
}

.liquid-glass-btn:focus-visible {
  outline: var(--hg-focus-ring) !important;
  outline-offset: var(--hg-focus-offset);
}

.liquid-glass-btn ha-icon {
  position: relative;
  z-index: 2;
  --mdc-icon-size: var(--hg-action-icon-size);
}

.liquid-glass-btn svg {
  position: relative;
  z-index: 2;
}

.liquid-glass-transparent {
  background:
    linear-gradient(var(--hg-glass-dim), var(--hg-glass-dim)),
    var(--hg-glass-clear) !important;
  -webkit-backdrop-filter: var(--hg-backdrop-regular) !important;
  backdrop-filter: var(--hg-backdrop-regular) !important;
  box-shadow: var(--hg-edge-inner), var(--hg-shadow-tile) !important;
}

.liquid-glass-transparent::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: var(--hg-specular);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
  z-index: 1;
}

@media (hover: hover) {
  .liquid-glass-transparent:hover {
    box-shadow: var(--hg-edge-inner), var(--hg-shadow-float) !important;
  }
}

.liquid-glass-dark,
.liquid-glass-light {
  -webkit-backdrop-filter: var(--hg-backdrop-regular) !important;
  backdrop-filter: var(--hg-backdrop-regular) !important;
  box-shadow: var(--hg-edge-inner) !important;
}

.liquid-glass-dark {
  background: var(--hg-fill) !important;
}

.liquid-glass-light {
  background: var(--hg-fill-active) !important;
  color: var(--hg-label-on-active) !important;
}

@media (hover: hover) {
  .liquid-glass-dark:hover {
    background: var(--hg-glass-regular) !important;
  }
}
`;

export const liquidGlassCSS = `${glassCSS}${buttonCSS}`;

function injectStyle(id: string, css: string): void {
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

export function injectDesignTokens(): void {
  injectStyle(TOKENS_STYLE_ID, tokensCSS);
}

export function injectLiquidGlassStyles(): void {
  injectDesignTokens();
  injectStyle(GLASS_STYLE_ID, liquidGlassCSS);
}

export const LiquidGlassClasses = {
  headerButton: 'liquid-glass-btn liquid-glass-transparent',
  modalCancel: 'liquid-glass-btn liquid-glass-dark',
  modalDone: 'liquid-glass-btn liquid-glass-light',
} as const;
