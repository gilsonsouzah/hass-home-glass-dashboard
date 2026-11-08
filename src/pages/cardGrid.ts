import { EditModeManager } from '../utils/EditModeManager';
import type { DragAndDropManager } from '../utils/DragAndDropManager';

/** Wrapper + empty controls bar + `home-glass-card`; the caller adds its own controls and appends the wrapper. */
export function createCardWrapper(cardConfig: any, areaId: string, hass: any) {
  const wrapper = document.createElement('div');
  wrapper.className = 'entity-card-wrapper';
  wrapper.dataset.entityId = cardConfig.entity;
  wrapper.dataset.areaId = areaId;
  if (cardConfig.is_tall) wrapper.classList.add('tall');

  const cardElement = document.createElement('home-glass-card') as any;
  cardElement.setConfig(cardConfig);
  cardElement.hass = hass;

  const controls = document.createElement('div');
  controls.className = 'entity-controls';

  wrapper.appendChild(controls);
  wrapper.appendChild(cardElement);
  return { wrapper, controls };
}

export function readGridOrder(grid: HTMLElement): string[] {
  return Array.from(grid.querySelectorAll<HTMLElement>('.entity-card-wrapper:not(.drag-placeholder)'))
    .map((wrapper) => wrapper.dataset.entityId)
    .filter((id): id is string => !!id);
}

export function setGridEditMode(manager: DragAndDropManager | undefined, editMode: boolean, container: HTMLElement): void {
  if (!manager) return;

  if (editMode) {
    // Wait for the cards to finish rendering
    setTimeout(() => {
      manager.enableDragAndDrop(container);
      EditModeManager.updateEntityWrapperStyles(container, true);
    }, 100);
  } else {
    manager.disableDragAndDrop(container);
    EditModeManager.updateEntityWrapperStyles(container, false);
  }
}
