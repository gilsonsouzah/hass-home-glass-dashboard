import type { HomeCard } from '../HomeCard';

/**
 * Cheap reference-compare diff of hass.states. HA replaces the state object on
 * every change, so identity inequality == changed. Also reports removed ids.
 */
export function computeChangedEntityIds(oldHass: any, newHass: any): string[] {
  const changed: string[] = [];
  const newStates = newHass?.states;
  if (!newStates) return changed;
  const oldStates = oldHass?.states;
  if (!oldStates) return Object.keys(newStates);
  for (const id in newStates) {
    if (oldStates[id] !== newStates[id]) changed.push(id);
  }
  for (const id in oldStates) {
    if (!(id in newStates)) changed.push(id);
  }
  return changed;
}

/** Routes hass pushes only to the cards whose entity changed (entity_id -> cards index). */
export class CardHassRouter {
  private entityCardIndex: Map<string, Set<HomeCard>> = new Map();
  // Cards that must receive every hass update regardless of state diff (cameras).
  private alwaysUpdateCards: Set<HomeCard> = new Set();
  private indexDirty = true;
  private mutationObserver?: MutationObserver;

  markDirty(): void {
    this.indexDirty = true;
  }

  /**
   * Marks the index dirty on card add/remove/move (full re-render, edit-mode drag,
   * registry surgical updates). Observes light DOM only (childList + subtree), not
   * attributes or shadow roots, so in-place card updates and camera image swaps
   * never trigger a rebuild.
   */
  observe(content: HTMLElement): void {
    this.disconnect();
    this.indexDirty = true;
    this.mutationObserver = new MutationObserver(() => {
      this.indexDirty = true;
    });
    this.mutationObserver.observe(content, { childList: true, subtree: true });
  }

  disconnect(): void {
    this.mutationObserver?.disconnect();
    this.mutationObserver = undefined;
  }

  update(content: HTMLElement, oldHass: any, newHass: any): void {
    if (this.indexDirty) {
      this.rebuildIndex(content);
    }

    this.alwaysUpdateCards.forEach((card) => {
      if (card.hass !== newHass) card.hass = newHass;
    });

    if (!oldHass) {
      // No baseline to diff against (first update / config change): refresh all indexed cards once.
      this.entityCardIndex.forEach((cards) => {
        cards.forEach((card) => {
          if (card.hass !== newHass) card.hass = newHass;
        });
      });
      return;
    }

    const updated = new Set<HomeCard>();
    for (const id of computeChangedEntityIds(oldHass, newHass)) {
      const cards = this.entityCardIndex.get(id);
      if (!cards) continue;
      cards.forEach((card) => {
        if (updated.has(card)) return;
        updated.add(card);
        if (card.hass !== newHass) card.hass = newHass;
      });
    }
  }

  private rebuildIndex(content: HTMLElement): void {
    this.entityCardIndex.clear();
    this.alwaysUpdateCards.clear();
    content.querySelectorAll('home-glass-card').forEach((el) => {
      const card = el as HomeCard;
      if (card.needsContinuousHass) {
        this.alwaysUpdateCards.add(card);
        return;
      }
      const id = card.entityId;
      if (!id) return;
      let set = this.entityCardIndex.get(id);
      if (!set) {
        set = new Set<HomeCard>();
        this.entityCardIndex.set(id, set);
      }
      set.add(card);
    });
    this.indexDirty = false;
  }
}
