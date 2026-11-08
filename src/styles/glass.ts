// Include before component rules: .hg-glass sets position, which a later component rule may override.
export const glassCSS = `
.hg-glass, .hg-glass--regular, .hg-glass--thick, .hg-glass--clear {
  position: relative;
  isolation: isolate;
}

.hg-glass, .hg-glass--regular {
  background: var(--hg-glass-regular);
  -webkit-backdrop-filter: var(--hg-backdrop-regular);
  backdrop-filter: var(--hg-backdrop-regular);
  box-shadow: var(--hg-edge-inner), var(--hg-shadow-tile);
}

.hg-glass--thick {
  background: var(--hg-glass-thick);
  -webkit-backdrop-filter: var(--hg-backdrop-thick);
  backdrop-filter: var(--hg-backdrop-thick);
  box-shadow: var(--hg-edge-inner), var(--hg-shadow-sheet);
}

.hg-glass--clear {
  background: linear-gradient(var(--hg-glass-dim), var(--hg-glass-dim)), var(--hg-glass-clear);
  -webkit-backdrop-filter: var(--hg-backdrop-clear);
  backdrop-filter: var(--hg-backdrop-clear);
  box-shadow: var(--hg-edge-inner), var(--hg-shadow-float);
}

.hg-glass::before, .hg-glass--regular::before, .hg-glass--thick::before, .hg-glass--clear::before {
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

.hg-pressable {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform var(--hg-dur-fast) var(--hg-ease-spring),
    background-color var(--hg-dur) var(--hg-ease-standard),
    box-shadow var(--hg-dur) var(--hg-ease-standard),
    color var(--hg-dur) var(--hg-ease-standard);
}

.hg-pressable:active {
  transform: scale(var(--hg-press-scale));
}

@media (hover: hover) {
  .hg-pressable:hover {
    box-shadow: var(--hg-edge-inner), var(--hg-shadow-float);
  }
}

.hg-glass:focus-visible, .hg-glass--regular:focus-visible, .hg-glass--thick:focus-visible, .hg-glass--clear:focus-visible, .hg-pressable:focus-visible {
  outline: var(--hg-focus-ring);
  outline-offset: var(--hg-focus-offset);
}
`;
