import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RegistrySubscriptionManager } from '../src/utils/RegistrySubscriptionManager.ts';
import type { RegistryChangeEvent } from '../src/utils/RegistrySubscriptionManager.ts';

type Handler = (event: any) => void;

function fakeConnection(delayMs = 0) {
  const handlers = new Map<string, Handler>();
  const unsubscribed: string[] = [];
  let subscribeCalls = 0;
  return {
    handlers,
    unsubscribed,
    get subscribeCalls() { return subscribeCalls; },
    async subscribeEvents(handler: Handler, eventType: string) {
      subscribeCalls++;
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      handlers.set(eventType, handler);
      return () => { unsubscribed.push(eventType); };
    },
  };
}

const flushMicrotasks = () => new Promise((r) => setTimeout(r, 20));

function freshManager() {
  (RegistrySubscriptionManager as any).instance = null;
  return RegistrySubscriptionManager.getInstance() as any;
}

test('hass pushes with the same connection subscribe only once', async () => {
  const manager = freshManager();
  const connection = fakeConnection();
  manager.addListener(() => {});
  for (let i = 0; i < 5; i++) manager.setHass({ connection, states: { i } });
  await flushMicrotasks();
  assert.equal(connection.subscribeCalls, 3);
});

test('a new connection replaces the previous subscriptions', async () => {
  const manager = freshManager();
  const first = fakeConnection();
  const second = fakeConnection();
  manager.addListener(() => {});
  manager.setHass({ connection: first });
  await flushMicrotasks();
  manager.setHass({ connection: second });
  await flushMicrotasks();
  assert.equal(first.unsubscribed.length, 3);
  assert.equal(second.subscribeCalls, 3);
});

test('a subscribe that resolves after being superseded is cancelled, not leaked', async () => {
  const manager = freshManager();
  const slow = fakeConnection(30);
  const fast = fakeConnection();
  manager.addListener(() => {});
  manager.setHass({ connection: slow });
  manager.setHass({ connection: fast });
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(slow.unsubscribed.length, 3);
  assert.equal(fast.unsubscribed.length, 0);
});

test('a burst delivers one event per target instead of only the last', async () => {
  const manager = freshManager();
  manager.debounceMs = 10;
  const connection = fakeConnection();
  const received: RegistryChangeEvent[] = [];
  manager.addListener((e: RegistryChangeEvent) => received.push(e));
  manager.setHass({ connection });
  await flushMicrotasks();

  const emit = connection.handlers.get('entity_registry_updated')!;
  for (const id of ['light.a', 'light.b', 'light.c']) {
    emit({ data: { action: 'update', entity_id: id } });
  }
  emit({ data: { action: 'remove', entity_id: 'light.a' } });
  await new Promise((r) => setTimeout(r, 50));

  assert.deepEqual(
    received.map((e) => `${e.action}:${e.data.entity_id}`).sort(),
    ['remove:light.a', 'update:light.b', 'update:light.c']
  );
});

test('removing the last listener drops the subscriptions', async () => {
  const manager = freshManager();
  const connection = fakeConnection();
  const listener = () => {};
  manager.addListener(listener);
  manager.setHass({ connection });
  await flushMicrotasks();
  manager.removeListener(listener);
  assert.equal(connection.unsubscribed.length, 3);

  manager.addListener(listener);
  manager.setHass({ connection });
  await flushMicrotasks();
  assert.equal(connection.subscribeCalls, 6);
});
