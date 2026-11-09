export const summaryStyles = `
.hg-home-summary {
  display: block;
  margin: -8px 0 var(--hg-card-gap);
  font-family: var(--hg-font);
  font-size: var(--hg-text-subhead-size);
  line-height: var(--hg-text-subhead-line);
  font-weight: var(--hg-text-subhead-weight);
  color: var(--hg-title-color, #fff);
  text-shadow: var(--hg-title-shadow, 0 1px 3px rgba(0, 0, 0, 0.35));
}

.hg-summary-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: var(--hg-chip-gap);
}

.hg-summary-item {
  appearance: none;
  background: none;
  border: 0;
  margin: 0;
  padding: 0;
  font: inherit;
  color: inherit;
  text-shadow: inherit;
  text-align: start;
  max-width: 100%;
  position: relative;
  cursor: pointer;
  opacity: 0.85;
  -webkit-tap-highlight-color: transparent;
  transition:
    opacity var(--hg-dur-fast) var(--hg-ease-standard),
    color var(--hg-dur) var(--hg-ease-standard);
}

/* Grows the touch target to --hg-hit-min without growing the line */
.hg-summary-item::after {
  content: '';
  position: absolute;
  inset: -12px -4px;
}

@media (hover: hover) {
  .hg-summary-item:hover {
    opacity: 1;
  }
}

.hg-summary-item:active {
  opacity: 0.6;
}

.hg-summary-item:focus-visible {
  outline: var(--hg-focus-ring);
  outline-offset: var(--hg-focus-offset);
  border-radius: var(--hg-radius-control);
}

.hg-summary-item.alert {
  color: var(--hg-color-red);
  opacity: 1;
}

.hg-summary-sep {
  opacity: 0.5;
}
`;
