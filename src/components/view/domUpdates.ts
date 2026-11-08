import { localize } from '../../utils/LocalizationService';
import { isEntityHiddenOrDisabled, resolveEntityAreaId } from '../../utils/registryDisplay';
import type { RegistryChangeEvent } from '../../utils/RegistrySubscriptionManager';

export function fadeOutWrapper(wrapper: HTMLElement): void {
  const parentGrid = wrapper.closest('.area-entities') as HTMLElement;

  const card = wrapper.querySelector('home-glass-card') as any;
  if (card && typeof card.cleanup === 'function') card.cleanup();

  wrapper.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  wrapper.style.opacity = '0';
  wrapper.style.transform = 'scale(0.8)';
  setTimeout(() => {
    wrapper.remove();
    if (parentGrid) cleanupEmptySection(parentGrid);
  }, 250);
}

export function fadeOutCard(content: HTMLElement, entityId: string): void {
  const wrapper = content.querySelector(`.entity-card-wrapper[data-entity-id="${entityId}"]`) as HTMLElement;
  if (wrapper) fadeOutWrapper(wrapper);
}

function cleanupEmptySection(grid: HTMLElement): void {
  if (!grid || grid.children.length > 0) return;
  const title = grid.previousElementSibling as HTMLElement;
  grid.style.transition = 'opacity 0.2s ease';
  grid.style.opacity = '0';
  if (title?.classList.contains('area-title')) {
    title.style.transition = 'opacity 0.2s ease';
    title.style.opacity = '0';
  }
  setTimeout(() => {
    grid.remove();
    if (title?.classList.contains('area-title')) title.remove();
  }, 200);
}

export async function handleEntityChange(content: HTMLElement, hass: any, event: RegistryChangeEvent): Promise<void> {
  const entityId = event.data?.entity_id;
  if (!entityId) return;

  if (event.action === 'remove') {
    fadeOutCard(content, entityId);
    return;
  }

  if (event.action === 'update') {
    if (isEntityHiddenOrDisabled(hass, entityId)) {
      fadeOutCard(content, entityId);
      return;
    }

    const newAreaId = resolveEntityAreaId(hass, entityId);

    const wrapper = content.querySelector(`.entity-card-wrapper[data-entity-id="${entityId}"]`) as HTMLElement;
    if (wrapper) {
      const currentGrid = wrapper.closest('.area-entities') as HTMLElement;
      const currentAreaId = currentGrid?.dataset?.areaId;

      if (currentAreaId && currentAreaId !== newAreaId) {
        const targetGrid = content.querySelector(`.area-entities[data-area-id="${newAreaId}"]`) as HTMLElement;
        if (targetGrid) {
          wrapper.style.transition = 'opacity 0.2s ease';
          wrapper.style.opacity = '0';
          await new Promise(r => setTimeout(r, 200));
          targetGrid.appendChild(wrapper);
          wrapper.style.opacity = '1';
        } else {
          fadeOutCard(content, entityId);
        }
        cleanupEmptySection(currentGrid);
      }
    }
    // A card missing from the DOM for a visible entity was hidden before; it shows up on next navigation.
  }
}

export async function handleAreaChange(content: HTMLElement, hass: any, event: RegistryChangeEvent): Promise<void> {
  if (event.action === 'remove') {
    const areaId = event.data?.area_id;
    if (!areaId) return;
    const grid = content.querySelector(`.area-entities[data-area-id="${areaId}"]`) as HTMLElement;
    if (grid) {
      const title = grid.previousElementSibling as HTMLElement;
      grid.style.transition = 'opacity 0.2s ease';
      grid.style.opacity = '0';
      if (title?.classList.contains('area-title')) {
        title.style.transition = 'opacity 0.2s ease';
        title.style.opacity = '0';
      }
      await new Promise(r => setTimeout(r, 200));
      grid.remove();
      if (title?.classList.contains('area-title')) title.remove();
    }
    return;
  }

  if (event.action === 'update') {
    try {
      const areas = await hass.callWS({ type: 'config/area_registry/list' });
      for (const area of areas) {
        const grid = content.querySelector(`.area-entities[data-area-id="${area.area_id}"]`);
        if (grid) {
          const title = grid.previousElementSibling;
          if (title?.classList.contains('area-title')) {
            const span = title.querySelector('span');
            if (span && span.textContent !== area.name) {
              span.textContent = area.name;
            }
          }
        }
      }
    } catch {
      // Rename is cosmetic; the next full render picks it up.
    }
  }
}

function appendCardWithFadeIn(grid: HTMLElement, hass: any, entityId: string, state: any): void {
  const cardElement = document.createElement('home-glass-card') as any;
  cardElement.setConfig({
    type: 'custom:home-glass-card',
    entity: entityId,
    name: state.attributes?.friendly_name || entityId.split('.')[1].replace(/_/g, ' '),
    domain: entityId.split('.')[0],
    is_tall: false
  });
  cardElement.hass = hass;

  const wrapper = document.createElement('div');
  wrapper.className = 'entity-card-wrapper';
  wrapper.dataset.entityId = entityId;
  wrapper.appendChild(cardElement);

  wrapper.style.opacity = '0';
  wrapper.style.transform = 'scale(0.8)';
  grid.appendChild(wrapper);

  requestAnimationFrame(() => {
    wrapper.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    wrapper.style.opacity = '1';
    wrapper.style.transform = 'scale(1)';
  });
}

export function addCardToDOM(content: HTMLElement, hass: any, entityId: string): void {
  const state = hass.states[entityId];
  if (!state) return;

  if (content.querySelector(`.entity-card-wrapper[data-entity-id="${entityId}"]`)) return;

  const areaId = resolveEntityAreaId(hass, entityId);

  const grid = content.querySelector(`.area-entities[data-area-id="${areaId}"]`) as HTMLElement;
  if (!grid) return; // Area not on this page

  appendCardWithFadeIn(grid, hass, entityId, state);
}

function addCardToFavorites(content: HTMLElement, hass: any, entityId: string): void {
  const state = hass.states[entityId];
  if (!state) return;

  let favGrid = content.querySelector('.area-entities[data-area-id="favorites"]') as HTMLElement;
  if (!favGrid) {
    const titleDiv = document.createElement('div');
    titleDiv.className = 'hg-section-title';
    titleDiv.innerHTML = `<span>${localize('section_titles.favorites')}</span>`;

    favGrid = document.createElement('div');
    favGrid.className = 'area-entities';
    favGrid.dataset.areaId = 'favorites';

    const firstSection = content.querySelector('.hg-section-title, .area-title');
    if (firstSection) {
      content.insertBefore(favGrid, firstSection);
      content.insertBefore(titleDiv, favGrid);
    } else {
      content.appendChild(titleDiv);
      content.appendChild(favGrid);
    }
  }

  if (favGrid.querySelector(`.entity-card-wrapper[data-entity-id="${entityId}"]`)) return;

  appendCardWithFadeIn(favGrid, hass, entityId, state);
}

/** Items added to an exclude list leave the UI; items removed from it enter the UI. */
export function diffLists(
  oldList: string[] | undefined,
  newList: string[] | undefined,
  toRemoveFromUI: Set<string>,
  toAddToUI: Set<string>
): void {
  const oldSet = new Set(oldList || []);
  const newSet = new Set(newList || []);
  for (const e of newSet) { if (!oldSet.has(e)) toRemoveFromUI.add(e); }
  for (const e of oldSet) { if (!newSet.has(e)) toAddToUI.add(e); }
}

/**
 * Applies the card-level part of a home customization change to the DOM in place.
 * Returns true when the change cannot be applied incrementally and the page must re-render.
 */
export function applyHomeCustomizationDiff(
  content: HTMLElement,
  hass: any,
  oldHome: any,
  newHome: any,
  pageType: string | undefined
): boolean {
  let didChange = false;

  const toRemove = new Set<string>();
  const toAdd = new Set<string>();
  diffLists(oldHome.excluded_from_dashboard, newHome.excluded_from_dashboard, toRemove, toAdd);
  if (!pageType || pageType === 'home') {
    diffLists(oldHome.excluded_from_home, newHome.excluded_from_home, toRemove, toAdd);
  }
  for (const entityId of toRemove) { fadeOutCard(content, entityId); didChange = true; }
  for (const entityId of toAdd) { addCardToDOM(content, hass, entityId); didChange = true; }

  const oldFav = new Set<string>(oldHome.favorites || []);
  const newFav = new Set<string>(newHome.favorites || []);
  const favRemoved = [...oldFav].filter(e => !newFav.has(e));
  const favAdded = [...newFav].filter(e => !oldFav.has(e));

  const favGrid = content.querySelector('.area-entities[data-area-id="favorites"]') as HTMLElement;
  for (const entityId of favRemoved) {
    const favCard = favGrid?.querySelector(`.entity-card-wrapper[data-entity-id="${entityId}"]`) as HTMLElement;
    if (favCard) {
      fadeOutWrapper(favCard);
      didChange = true;
    }
  }
  for (const entityId of favAdded) {
    addCardToFavorites(content, hass, entityId);
    didChange = true;
  }

  if (oldHome.weather_entity !== newHome.weather_entity) return true;
  if (oldHome.show_energy !== newHome.show_energy) return true;

  const switchesChanged = oldHome.showSwitches !== newHome.showSwitches;
  const includedSwitchesChanged = JSON.stringify(oldHome.includedSwitches || []) !== JSON.stringify(newHome.includedSwitches || []);
  if (switchesChanged || includedSwitchesChanged) return true;

  const oldExtra = new Set<string>(oldHome.extraAccessories || []);
  const newExtra = new Set<string>(newHome.extraAccessories || []);
  const extraRemoved = [...oldExtra].filter(e => !newExtra.has(e));
  const extraAdded = [...newExtra].filter(e => !oldExtra.has(e));
  for (const entityId of extraRemoved) { fadeOutCard(content, entityId); didChange = true; }
  for (const entityId of extraAdded) { addCardToDOM(content, hass, entityId); didChange = true; }

  if (JSON.stringify(oldHome.sections?.order) !== JSON.stringify(newHome.sections?.order)) return true;
  if (JSON.stringify(oldHome.sections?.hidden || []) !== JSON.stringify(newHome.sections?.hidden || [])) return true;

  // Any other home setting changed that the incremental paths above do not cover.
  return !didChange && JSON.stringify(oldHome) !== JSON.stringify(newHome);
}
