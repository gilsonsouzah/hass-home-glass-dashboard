import type { Entity } from '../types/types';

type EntitiesByArea = { [areaId: string]: Entity[] };

/** Stable sort: ids in `order` first (in that order), unknown ids keep their relative position after them. */
export function sortBySavedOrder<T>(items: T[], order: string[], getId: (item: T) => string): T[] {
  return [...items].sort((a, b) => {
    const aIndex = order.indexOf(getId(a));
    const bIndex = order.indexOf(getId(b));
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return 0;
  });
}

/** Applies the Home customizations (area order, entity order, tall cards) shared by the Home and Group pages. */
export function applyHomeOrdering(entitiesByArea: EntitiesByArea, home: any): EntitiesByArea {
  const result: EntitiesByArea = {};
  const areaIds = home?.sections?.order
    ? sortBySavedOrder(Object.keys(entitiesByArea), home.sections.order, (id) => id)
    : Object.keys(entitiesByArea);
  const tallCards: string[] | undefined = home?.tall_cards;

  for (const areaId of areaIds) {
    const entityOrder = home?.entities_order?.[areaId];
    const entities = Array.isArray(entityOrder)
      ? sortBySavedOrder(entitiesByArea[areaId], entityOrder, (entity) => entity.entity_id)
      : [...entitiesByArea[areaId]];

    if (tallCards) {
      entities.forEach((entity) => {
        if (tallCards.includes(entity.entity_id)) {
          (entity as any).is_tall = true;
        } else if (tallCards.includes(`!${entity.entity_id}`)) {
          (entity as any).is_tall = false;
        }
      });
    }

    result[areaId] = entities;
  }

  return result;
}
