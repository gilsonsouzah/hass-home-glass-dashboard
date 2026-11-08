const rem = (px: number) => `${px / 16}rem`;

// iOS text styles at the default Dynamic Type size: [name, size px, line px, weight]
const TEXT_STYLES = [
  ['large-title', 34, 41, 700],
  ['title1', 28, 34, 400],
  ['title2', 22, 28, 400],
  ['title3', 20, 25, 400],
  ['headline', 17, 22, 600],
  ['body', 17, 22, 400],
  ['callout', 16, 21, 400],
  ['subhead', 15, 20, 400],
  ['footnote', 13, 18, 400],
  ['caption1', 12, 16, 400],
  ['caption2', 11, 13, 400],
] as const;

const textTokens = TEXT_STYLES.map(
  ([name, size, line, weight]) =>
    `--hg-text-${name}-size: ${rem(size)}; --hg-text-${name}-line: ${rem(line)}; --hg-text-${name}-weight: ${weight};`
).join('\n  ');

const COLOR_NAMES = ['red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'gray'];

const colorTokens = (values: string[]) => COLOR_NAMES.map((name, i) => `--hg-color-${name}: ${values[i]};`).join('\n  ');

const COLORS = {
  light: ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#30B0C7', '#32ADE6', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#8E8E93'],
  dark: ['#FF453A', '#FF9F0A', '#FFD60A', '#30D158', '#63E6E2', '#40C8E0', '#64D2FF', '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F', '#8E8E93'],
  lightContrast: ['#D70015', '#C93400', '#B25000', '#248A3D', '#0C817B', '#008299', '#0071A4', '#0040DD', '#3634A3', '#8944AB', '#D30F45', '#6C6C70'],
  darkContrast: ['#FF6961', '#FFB340', '#FFD426', '#30DB5B', '#66D4CF', '#5DE6FF', '#70D7FF', '#409CFF', '#7D7AFF', '#DA8FFF', '#FF6482', '#AEAEB2'],
};

const darkVars = `
  --hg-glass-regular: rgba(44, 44, 46, 0.55);
  --hg-glass-thick: rgba(28, 28, 30, 0.82);
  --hg-glass-clear: rgba(255, 255, 255, 0.12);
  --hg-glass-dim: rgba(0, 0, 0, 0.35);
  --hg-fill-active: rgba(255, 255, 255, 0.9);
  --hg-label-on-active: #1d1d1f;
  --hg-specular: linear-gradient(135deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.08) 40%, rgba(255, 255, 255, 0.22) 70%, rgba(255, 255, 255, 0.4));
  --hg-edge-inner: inset 0 1px 0 rgba(255, 255, 255, 0.25);
  --hg-shadow-tile: 0 2px 8px rgba(0, 0, 0, 0.12);
  --hg-shadow-float: 0 8px 24px rgba(0, 0, 0, 0.28);
  --hg-shadow-sheet: 0 20px 40px rgba(0, 0, 0, 0.35);
  --hg-label: rgba(255, 255, 255, 0.96);
  --hg-label-secondary: rgba(235, 235, 245, 0.6);
  --hg-label-tertiary: rgba(235, 235, 245, 0.3);
  --hg-separator: rgba(84, 84, 88, 0.6);
  --hg-fill: rgba(120, 120, 128, 0.36);
  ${colorTokens(COLORS.dark)}
`;

const lightVars = `
  --hg-glass-regular: rgba(255, 255, 255, 0.34);
  --hg-glass-thick: rgba(250, 250, 252, 0.86);
  --hg-glass-clear: rgba(255, 255, 255, 0.18);
  --hg-glass-dim: rgba(0, 0, 0, 0.28);
  --hg-fill-active: rgba(255, 255, 255, 0.96);
  --hg-label-on-active: #1d1d1f;
  --hg-specular: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.2) 40%, rgba(255, 255, 255, 0.5) 70%, rgba(255, 255, 255, 0.85));
  --hg-edge-inner: inset 0 1px 0 rgba(255, 255, 255, 0.7), inset 0 -1px 0 rgba(0, 0, 0, 0.06);
  --hg-shadow-tile: 0 1px 4px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06);
  --hg-shadow-float: 0 8px 24px rgba(0, 0, 0, 0.16);
  --hg-shadow-sheet: 0 20px 40px rgba(0, 0, 0, 0.2);
  --hg-label: rgba(0, 0, 0, 0.88);
  --hg-label-secondary: rgba(60, 60, 67, 0.6);
  --hg-label-tertiary: rgba(60, 60, 67, 0.3);
  --hg-separator: rgba(60, 60, 67, 0.29);
  --hg-fill: rgba(120, 120, 128, 0.2);
  ${colorTokens(COLORS.light)}
`;

const solidCommon = `
    --hg-blur-regular: 0px;
    --hg-blur-thick: 0px;
    --hg-blur-clear: 0px;
    --hg-saturate: 100%;
    --hg-glass-dim: transparent;
    --hg-fill-active: #ffffff;`;

const solidDark = `${solidCommon}
    --hg-glass-regular: #2c2c2e;
    --hg-glass-thick: #1c1c1e;
    --hg-glass-clear: #3a3a3c;`;

const solidLight = `${solidCommon}
    --hg-glass-regular: #e5e5ea;
    --hg-glass-thick: #f2f2f7;
    --hg-glass-clear: #e5e5ea;`;

const contrastDark = `
    --hg-label: #ffffff;
    --hg-label-secondary: rgba(235, 235, 245, 0.78);
    --hg-label-tertiary: rgba(235, 235, 245, 0.55);
    --hg-label-on-active: #000000;
    --hg-separator: rgba(255, 255, 255, 0.4);
    --hg-fill: rgba(120, 120, 128, 0.5);
    --hg-specular: linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7));
    --hg-edge-inner: 0 0 0 0 transparent;
    ${colorTokens(COLORS.darkContrast)}`;

const contrastLight = `
    --hg-label: #000000;
    --hg-label-secondary: rgba(60, 60, 67, 0.78);
    --hg-label-tertiary: rgba(60, 60, 67, 0.55);
    --hg-label-on-active: #000000;
    --hg-separator: rgba(0, 0, 0, 0.4);
    --hg-fill: rgba(120, 120, 128, 0.32);
    --hg-specular: linear-gradient(rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.55));
    --hg-edge-inner: 0 0 0 0 transparent;
    ${colorTokens(COLORS.lightContrast)}`;

// Overrides must match or beat the specificity of the scheme blocks they replace (see tokensCSS order).
const forSchemes = (dark: string, light: string, extra = '') => `
  :root${extra}, :root${extra}[data-hg-scheme="dark"] {${dark}
  }
  :root${extra}[data-hg-scheme="light"] {${light}
  }
  @media (prefers-color-scheme: light) {
    :root${extra}:not([data-hg-scheme]) {${light}
    }
  }`;

export const tokensCSS = `
/* Layout: card spans are columns out of 12. Container breakpoints (viewport minus 44px padding):
   >=1356 -> 6 cols, 756-1355 -> 4, 556-755 -> 3, 316-555 -> 2 (small 316-355), <316 -> 1 */
:root {
  --hg-page-padding: 22px;
  --hg-page-padding-bottom: 22px;
  --hg-section-gap: 20px;
  --hg-card-gap: 10px;
  --hg-card-height: 70px;
  --hg-camera-height: 220px;
  --hg-card-icon-size: 40px;
  --hg-card-icon-font-size: 24px;
  --hg-action-btn-size: 40px;
  --hg-action-icon-size: 22px;
  --hg-hit-min: 44px;
  --hg-chip-height: 32px;
  --hg-chip-padding: 3px 16px 3px 8px;
  --hg-chip-gap: 6px;
  --hg-chip-icon-size: 24px;
  --hg-temp-font-size-regular: 16px;
  --hg-temp-font-size-tall: 40px;
  --hg-card-span-xl: 2;
  --hg-card-span-desktop: 3;
  --hg-card-span-tablet: 4;
  --hg-card-span-small: 6;
  --hg-card-span-mobile: 6;
  --hg-card-span-xs: 12;

  --hg-radius-tile: 24px;
  --hg-tile-padding: 10px;
  --hg-radius-icon-well: 999px;
  --hg-radius-chip: 999px;
  --hg-radius-control: 12px;
  --hg-radius-sheet: 28px;
  --hg-radius-inner: max(8px, calc(var(--hg-radius-tile) - var(--hg-tile-padding)));

  --hg-blur-regular: 20px;
  --hg-blur-thick: 40px;
  --hg-blur-clear: 8px;
  --hg-saturate: 180%;
  --hg-backdrop-regular: blur(var(--hg-blur-regular)) saturate(var(--hg-saturate));
  --hg-backdrop-thick: blur(var(--hg-blur-thick)) saturate(var(--hg-saturate));
  --hg-backdrop-clear: blur(var(--hg-blur-clear)) saturate(var(--hg-saturate));

  --hg-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", var(--ha-font-family-body, Roboto), "Segoe UI", sans-serif;
  ${textTokens}

  --hg-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --hg-ease-spring: cubic-bezier(0.34, 1.4, 0.64, 1);
  --hg-dur-fast: 150ms;
  --hg-dur: 250ms;
  --hg-dur-slow: 400ms;
  --hg-press-scale: 0.96;

  --hg-focus-ring: 2px solid var(--hg-color-blue);
  --hg-focus-offset: 2px;

  --apple-page-padding: var(--hg-page-padding);
  --apple-page-padding-bottom: var(--hg-page-padding-bottom);
  --apple-section-gap: var(--hg-section-gap);
  --apple-card-gap: var(--hg-card-gap);
  --apple-card-padding: var(--hg-tile-padding);
  --apple-card-height: var(--hg-card-height);
  --apple-camera-height: var(--hg-camera-height);
  --apple-card-icon-size: var(--hg-card-icon-size);
  --apple-card-icon-font-size: var(--hg-card-icon-font-size);
  --apple-action-btn-size: var(--hg-action-btn-size);
  --apple-action-icon-size: var(--hg-action-icon-size);
  --apple-chip-height: var(--hg-chip-height);
  --apple-chip-padding: var(--hg-chip-padding);
  --apple-chip-gap: var(--hg-chip-gap);
  --apple-chip-icon-size: var(--hg-chip-icon-size);
  --apple-temp-font-size-regular: var(--hg-temp-font-size-regular);
  --apple-temp-font-size-tall: var(--hg-temp-font-size-tall);
  --apple-card-span-xl: var(--hg-card-span-xl);
  --apple-card-span-desktop: var(--hg-card-span-desktop);
  --apple-card-span-tablet: var(--hg-card-span-tablet);
  --apple-card-span-small: var(--hg-card-span-small);
  --apple-card-span-mobile: var(--hg-card-span-mobile);
  --apple-card-span-xs: var(--hg-card-span-xs);
  --apple-card-radius: var(--hg-radius-tile);
  --apple-modal-radius: var(--hg-radius-sheet);
  --apple-chip-radius: var(--hg-radius-chip);
  --apple-input-radius: var(--hg-radius-control);
  --apple-title-size: var(--hg-text-title1-size);
  --apple-section-title-size: var(--hg-text-headline-size);
  --apple-card-name-size: var(--hg-text-subhead-size);
  --apple-card-state-size: var(--hg-text-footnote-size);
  --apple-chip-name-size: var(--hg-text-footnote-size);
  --apple-chip-status-size: var(--hg-text-caption2-size);
  --apple-card-bg-inactive: var(--hg-glass-regular);
  --apple-chip-bg-inactive: var(--hg-glass-regular);
  --apple-icon-bg-inactive: var(--hg-fill);
  --apple-card-bg-active: var(--hg-fill-active);
  --apple-chip-bg-active: var(--hg-fill-active);
  --apple-text-inactive: var(--hg-label);
  --apple-text-active: var(--hg-label-on-active);
  --apple-icon-inactive: var(--hg-color-gray);
}

@media (max-width: 767px) {
  :root {
    --hg-camera-height: 200px;
    --hg-chip-height: 36px;
    --hg-page-padding: 16px;
    --hg-page-padding-bottom: 16px;
    --hg-tile-padding: 8px;
  }
}

@media (max-width: 399px) {
  :root {
    --hg-page-padding: 12px;
    --hg-page-padding-bottom: 12px;
  }
}

:root, :root[data-hg-scheme="dark"] {${darkVars}}

:root[data-hg-scheme="light"] {${lightVars}}

@media (prefers-color-scheme: light) {
  :root:not([data-hg-scheme]) {${lightVars}}
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --hg-dur-fast: 1ms;
    --hg-dur: 1ms;
    --hg-dur-slow: 1ms;
    --hg-press-scale: 1;
  }
}

@media (prefers-reduced-transparency: reduce) {${forSchemes(solidDark, solidLight)}
}

@media (prefers-contrast: more) {${forSchemes(contrastDark, contrastLight)}
}
${forSchemes(solidDark, solidLight, '[data-hg-solid="true"]')}
`;

export function applyColorScheme(isDark: boolean): void {
  document.documentElement.setAttribute('data-hg-scheme', isDark ? 'dark' : 'light');
}

// Leaves the prefers-color-scheme fallback in charge until hass reports a theme mode.
export function syncColorScheme(hass: { themes?: { darkMode?: boolean } } | undefined): void {
  const darkMode = hass?.themes?.darkMode;
  if (typeof darkMode === 'boolean') applyColorScheme(darkMode);
}
