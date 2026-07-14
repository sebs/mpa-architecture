// Broadcast Channel for cross-tab sync (ADR-007). Messages describe what
// changed; receivers query IndexedDB for fresh data. Degrades to no-op where
// the API is unavailable. BroadcastChannel is resolved at call time so tests
// can install a mock.

const CHANNEL_NAME = 'mpa-shop';

export const CART_UPDATED = 'CART_UPDATED';

export function publish(type, payload = {}) {
  if (typeof globalThis.BroadcastChannel !== 'function') return;
  const channel = new globalThis.BroadcastChannel(CHANNEL_NAME);
  channel.postMessage({ type, ...payload });
  channel.close();
}

export function subscribe(handler) {
  if (typeof globalThis.BroadcastChannel !== 'function') return () => {};
  const channel = new globalThis.BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event) => handler(event.data);
  return () => channel.close();
}
