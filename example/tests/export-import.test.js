import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { freshDB } from './helpers/idb.js';
import { addToCart, getCartEntries, seedProducts } from '../shared/db.js';
import { SEED_PRODUCTS } from '../shared/products-data.js';
import { exportData, serializeExport, parseImport, importData, EXPORT_VERSION } from '../shared/export-import.js';

beforeEach(freshDB);

test('exportData contains version, timestamp, and cart entries', async () => {
  await addToCart('p1', 2);
  const data = await exportData();
  assert.equal(data.version, EXPORT_VERSION);
  assert.ok(!Number.isNaN(Date.parse(data.exportedAt)));
  assert.deepEqual(data.cart, [{ productId: 'p1', quantity: 2 }]);
});

test('serializeExport produces human-readable JSON', async () => {
  await addToCart('p1');
  const json = serializeExport(await exportData());
  assert.ok(json.includes('\n  '));
  assert.equal(JSON.parse(json).version, EXPORT_VERSION);
});

test('export then import restores the cart', async () => {
  await seedProducts(SEED_PRODUCTS);
  await addToCart('p1', 2);
  await addToCart('p2');
  const json = serializeExport(await exportData());

  await freshDB();
  await seedProducts(SEED_PRODUCTS);
  await importData(json);
  assert.deepEqual(await getCartEntries(), [
    { productId: 'p1', quantity: 2 },
    { productId: 'p2', quantity: 1 },
  ]);
});

test('importData replaces existing cart contents', async () => {
  await seedProducts(SEED_PRODUCTS);
  await addToCart('p9', 7);
  await importData(JSON.stringify({ version: EXPORT_VERSION, cart: [{ productId: 'p1', quantity: 1 }] }));
  assert.deepEqual(await getCartEntries(), [{ productId: 'p1', quantity: 1 }]);
});

test('importData drops entries for unknown products and reports them', async () => {
  await seedProducts(SEED_PRODUCTS);
  const result = await importData(
    JSON.stringify({
      version: EXPORT_VERSION,
      cart: [
        { productId: 'p1', quantity: 1 },
        { productId: 'not-in-catalog', quantity: 3 },
      ],
    })
  );
  assert.equal(result.imported, 1);
  assert.equal(result.skipped, 1);
  assert.deepEqual(await getCartEntries(), [{ productId: 'p1', quantity: 1 }]);
});

test('parseImport rejects invalid JSON', () => {
  assert.throws(() => parseImport('not json'), /not valid JSON/);
});

test('parseImport rejects unknown versions', () => {
  assert.throws(() => parseImport(JSON.stringify({ version: 99, cart: [] })), /export version/);
});

test('parseImport rejects missing cart', () => {
  assert.throws(() => parseImport(JSON.stringify({ version: EXPORT_VERSION })), /missing cart/);
});

test('parseImport rejects malformed entries', () => {
  const bad = [
    null,
    'string-entry',
    { productId: 1, quantity: 1 },
    { productId: 'p1', quantity: 0 },
    { productId: 'p1', quantity: 1.5 },
  ];
  for (const entry of bad) {
    assert.throws(
      () => parseImport(JSON.stringify({ version: EXPORT_VERSION, cart: [entry] })),
      /malformed cart entry/
    );
  }
});
