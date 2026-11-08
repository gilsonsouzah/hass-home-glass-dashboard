export interface RegistryChangeEvent {
  type: 'entity' | 'device' | 'area';
  action: 'create' | 'update' | 'remove';
  data?: any;
}

export type RegistryChangeCallback = (event: RegistryChangeEvent) => void;

const REGISTRY_EVENTS: ReadonlyArray<[string, RegistryChangeEvent['type']]> = [
  ['entity_registry_updated', 'entity'],
  ['device_registry_updated', 'device'],
  ['area_registry_updated', 'area'],
];

/**
 * Bridges Home Assistant registry events (entity/device/area) to listeners.
 * Events are debounced, but every distinct change in the window is delivered.
 */
export class RegistrySubscriptionManager {
  private static instance: RegistrySubscriptionManager | null = null;

  private connection: any = null;
  private unsubscribers: Array<() => void> = [];
  // Bumped on every (un)subscribe so a slow in-flight subscribe can detect it is stale.
  private generation = 0;

  private listeners: Set<RegistryChangeCallback> = new Set();

  private pending: Map<string, RegistryChangeEvent> = new Map();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceMs = 500;

  private constructor() {}

  static getInstance(): RegistrySubscriptionManager {
    if (!RegistrySubscriptionManager.instance) {
      RegistrySubscriptionManager.instance = new RegistrySubscriptionManager();
    }
    return RegistrySubscriptionManager.instance;
  }

  /**
   * Called on every hass push; only a different websocket connection re-subscribes
   * (HA replaces the hass object on each state change, the connection survives reconnects).
   */
  setHass(hass: any): void {
    const connection = hass?.connection;
    if (!connection || connection === this.connection) return;
    this.connection = connection;
    void this.subscribe(connection);
  }

  addListener(callback: RegistryChangeCallback): void {
    this.listeners.add(callback);
  }

  removeListener(callback: RegistryChangeCallback): void {
    this.listeners.delete(callback);
    if (this.listeners.size === 0) {
      this.unsubscribe();
      this.connection = null;
    }
  }

  private async subscribe(connection: any): Promise<void> {
    this.unsubscribe();
    const generation = this.generation;

    const unsubscribers = await Promise.all(
      REGISTRY_EVENTS.map(async ([eventType, type]) => {
        try {
          return (await connection.subscribeEvents(
            (event: any) => this.scheduleUpdate({
              type,
              action: event.data?.action || 'update',
              data: event.data,
            }),
            eventType
          )) as () => void;
        } catch {
          return null;
        }
      })
    );

    for (const unsubscribe of unsubscribers) {
      if (!unsubscribe) continue;
      if (generation === this.generation) {
        this.unsubscribers.push(unsubscribe);
      } else {
        this.safeCall(unsubscribe);
      }
    }
  }

  private unsubscribe(): void {
    this.generation++;
    this.unsubscribers.forEach((unsubscribe) => this.safeCall(unsubscribe));
    this.unsubscribers = [];
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.pending.clear();
  }

  private safeCall(fn: () => void): void {
    try {
      fn();
    } catch {
      // connection already closed
    }
  }

  private scheduleUpdate(event: RegistryChangeEvent): void {
    const target = event.data?.entity_id ?? event.data?.area_id ?? event.data?.device_id ?? '';
    // Last event per target wins; different targets in the same burst are all kept.
    this.pending.set(`${event.type}:${target}`, event);

    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), this.debounceMs);
  }

  private flush(): void {
    this.flushTimer = null;
    const events = [...this.pending.values()];
    this.pending.clear();
    events.forEach((event) => this.notifyListeners(event));
  }

  private notifyListeners(event: RegistryChangeEvent): void {
    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Home Glass: Error in registry change listener:', error);
      }
    });
  }
}
