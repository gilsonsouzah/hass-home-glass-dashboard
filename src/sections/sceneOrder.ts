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

/** Entities listed in `savedOrder` first (in that order), then the rest sorted by last used. */
export function orderScenes<T extends HasId>(entities: T[], savedOrder: string[], states: Record<string, any>): T[] {
  if (savedOrder.length === 0) return sortByLastUsed(entities, states);

  const remaining = new Map(entities.map((e) => [e.entity_id, e]));
  const ordered: T[] = [];
  for (const id of savedOrder) {
    const entity = remaining.get(id);
    if (entity) {
      ordered.push(entity);
      remaining.delete(id);
    }
  }
  return [...ordered, ...sortByLastUsed([...remaining.values()], states)];
}
