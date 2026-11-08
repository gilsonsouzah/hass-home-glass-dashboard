import type { CardManager } from '../../utils/CardManager';

export function updateTallCardVisual(
  root: ParentNode,
  cardManager: CardManager,
  entityId: string,
  areaId: string,
  context: string
): void {
  const inArea = `[data-area-id="${areaId}"] [data-entity-id="${entityId}"]`;
  const wrapper = (root.querySelector(inArea) ?? root.querySelector(`[data-entity-id="${entityId}"]`)) as HTMLElement | null;
  if (!wrapper) return;

  const shouldBeTall = cardManager.shouldCardBeTall(entityId, areaId, context);

  wrapper.classList.toggle('tall', shouldBeTall);

  const cardElement = wrapper.querySelector('home-glass-card') as any;
  if (cardElement) {
    cardElement.setConfig({ ...(cardElement.config || {}), is_tall: shouldBeTall });
  }

  const button = wrapper.querySelector('.tall-toggle') as HTMLButtonElement;
  if (button) {
    button.classList.toggle('active', shouldBeTall);
    button.innerHTML = `<ha-icon icon="mdi:${shouldBeTall ? 'arrow-collapse' : 'arrow-expand'}"></ha-icon>`;
    button.title = shouldBeTall ? 'Switch to regular design' : 'Switch to tall design';
  }
}
