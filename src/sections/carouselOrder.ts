interface HasId {
  entity_id: string;
}

function lastUsedTime(state: any): number | null {
  const raw = state?.attributes?.last_triggered || state?.last_changed || state?.last_updated;
  const time = raw ? new Date(raw).getTime() : NaN;
  return time > 0 ? time : null;
}

/** Most recently used first; never-used (or unparsable) last; ties by friendly name. */
export function sortByLastUsed<T extends HasId>(entities: T[], states: Record<string, any>): T[] {
  const name = (e: T) => states[e.entity_id]?.attributes?.friendly_name || e.entity_id;
  const time = (e: T) => lastUsedTime(states[e.entity_id]);

  return [...entities].sort((a, b) => {
    const ta = time(a);
    const tb = time(b);
    if (ta !== tb) {
      if (ta === null) return 1;
      if (tb === null) return -1;
      return tb - ta;
    }
    return name(a).localeCompare(name(b));
  });
}

/** Splits entities into those named in `savedOrder` (in that order) and the rest (original order). */
export function splitBySavedOrder<T extends HasId>(entities: T[], savedOrder: string[]): { ordered: T[]; remaining: T[] } {
  const pending = new Map(entities.map((e) => [e.entity_id, e]));
  const ordered: T[] = [];
  for (const id of savedOrder) {
    const entity = pending.get(id);
    if (entity) {
      ordered.push(entity);
      pending.delete(id);
    }
  }
  return { ordered, remaining: [...pending.values()] };
}

/** Saved order first, then the rest sorted by last used. */
export function orderScenes<T extends HasId>(entities: T[], savedOrder: string[], states: Record<string, any>): T[] {
  const { ordered, remaining } = splitBySavedOrder(entities, savedOrder);
  return [...ordered, ...sortByLastUsed(remaining, states)];
}
