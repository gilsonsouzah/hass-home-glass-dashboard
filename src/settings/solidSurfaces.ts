export function applySolidSurfaces(solid: boolean): void {
  if (solid) document.documentElement.dataset.hgSolid = 'true';
  else delete document.documentElement.dataset.hgSolid;
}
