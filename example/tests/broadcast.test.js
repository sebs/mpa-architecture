import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { publish, subscribe, CART_UPDATED } from '../shared/broadcast.js';

class MockBroadcastChannel {
  static instances = [];

  constructor(name) {
    this.name = name;
    this.posted = [];
    this.closed = false;
    this.onmessage = null;
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(data) {
    this.posted.push(data);
  }

  close() {
    this.closed = true;
  }

  emit(data) {
    if (this.onmessage) this.onmessage({ data });
  }
}

beforeEach(() => {
  MockBroadcastChannel.instances = [];
  globalThis.BroadcastChannel = MockBroadcastChannel;
});

test('publish posts a typed message on the shared channel and closes it', () => {
  publish(CART_UPDATED, { productId: 'p1' });
  const [channel] = MockBroadcastChannel.instances;
  assert.equal(channel.name, 'mpa-shop');
  assert.deepEqual(channel.posted, [{ type: CART_UPDATED, productId: 'p1' }]);
  assert.equal(channel.closed, true);
});

test('subscribe delivers messages to the handler', () => {
  const received = [];
  subscribe((message) => received.push(message));
  const [channel] = MockBroadcastChannel.instances;
  channel.emit({ type: CART_UPDATED });
  assert.deepEqual(received, [{ type: CART_UPDATED }]);
});

test('unsubscribe closes the channel', () => {
  const unsubscribe = subscribe(() => {});
  unsubscribe();
  assert.equal(MockBroadcastChannel.instances[0].closed, true);
});

test('degrades to no-op when BroadcastChannel is unavailable', () => {
  delete globalThis.BroadcastChannel;
  assert.doesNotThrow(() => publish(CART_UPDATED));
  const unsubscribe = subscribe(() => {});
  assert.equal(typeof unsubscribe, 'function');
  assert.doesNotThrow(unsubscribe);
});
