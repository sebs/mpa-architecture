import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { freshDB } from './helpers/idb.js';
import {
  seedProducts,
  getProducts,
  getCategories,
  addToCart,
  getCartEntries,
  getCartItems,
  getCartCount,
  setCartQuantity,
  removeFromCart,
  replaceCart,
} from '../shared/db.js';
import { SEED_PRODUCTS } from '../shared/products-data.js';

beforeEach(freshDB);

test('seedProducts fills an empty store and is idempotent', async () => {
  await seedProducts(SEED_PRODUCTS);
  await seedProducts([{ id: 'x1', name: 'X', category: 'x', price: 1, description: '' }]);
  const products = await getProducts();
  assert.equal(products.length, SEED_PRODUCTS.length);
});

test('getProducts filters by category', async () => {
  await seedProducts(SEED_PRODUCTS);
  const products = await getProducts({ category: 'kitchen' });
  assert.equal(products.length, 3);
  assert.ok(products.every((p) => p.category === 'kitchen'));
});

test('getProducts searches name and description case-insensitively', async () => {
  await seedProducts(SEED_PRODUCTS);
  const products = await getProducts({ q: 'MERINO' });
  assert.equal(products.length, 1);
  assert.equal(products[0].name, 'Wool Blanket');
});

test('getProducts combines category and search filters', async () => {
  await seedProducts(SEED_PRODUCTS);
  const products = await getProducts({ category: 'office', q: 'nib' });
  assert.equal(products.length, 1);
  assert.equal(products[0].name, 'Fountain Pen');
});

test('getProducts sorts by price descending', async () => {
  await seedProducts(SEED_PRODUCTS);
  const products = await getProducts({ sort: 'price-desc' });
  assert.equal(products[0].name, 'Chef Knife');
  assert.equal(products.at(-1).name, 'Notebook A5');
});

test('getProducts defaults to name ascending', async () => {
  await seedProducts(SEED_PRODUCTS);
  const products = await getProducts();
  assert.equal(products[0].name, 'Ceramic Vase');
});

test('getCategories returns sorted distinct categories', async () => {
  await seedProducts(SEED_PRODUCTS);
  assert.deepEqual(await getCategories(), ['home', 'kitchen', 'office']);
});

test('addToCart accumulates quantity per product', async () => {
  await addToCart('p1');
  await addToCart('p1', 2);
  await addToCart('p2');
  assert.deepEqual(await getCartEntries(), [
    { productId: 'p1', quantity: 3 },
    { productId: 'p2', quantity: 1 },
  ]);
  assert.equal(await getCartCount(), 4);
});

test('getCartItems joins cart entries with products', async () => {
  await seedProducts(SEED_PRODUCTS);
  await addToCart('p1', 2);
  const items = await getCartItems();
  assert.equal(items.length, 1);
  assert.equal(items[0].product.name, 'Espresso Cup');
  assert.equal(items[0].quantity, 2);
});

test('getCartItems drops entries whose product no longer exists', async () => {
  await seedProducts(SEED_PRODUCTS);
  await addToCart('gone');
  assert.deepEqual(await getCartItems(), []);
});

test('setCartQuantity updates and zero removes', async () => {
  await addToCart('p1');
  await setCartQuantity('p1', 5);
  assert.deepEqual(await getCartEntries(), [{ productId: 'p1', quantity: 5 }]);
  await setCartQuantity('p1', 0);
  assert.deepEqual(await getCartEntries(), []);
});

test('removeFromCart deletes the entry', async () => {
  await addToCart('p1');
  await removeFromCart('p1');
  assert.deepEqual(await getCartEntries(), []);
});

test('replaceCart swaps the full cart contents', async () => {
  await addToCart('p1');
  await replaceCart([
    { productId: 'p2', quantity: 2 },
    { productId: 'p3', quantity: 1 },
  ]);
  const entries = await getCartEntries();
  assert.equal(entries.length, 2);
  assert.ok(entries.every((e) => e.productId !== 'p1'));
});
